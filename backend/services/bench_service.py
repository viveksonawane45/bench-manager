import os
import json
import subprocess
import threading
import psutil
import time
import signal
from typing import Dict, List, Any, Optional

class ProcessRegistry:
    def __init__(self):
        self.processes: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

    def register(self, task_id: str, command: str, proc: subprocess.Popen):
        with self.lock:
            self.processes[task_id] = {
                "command": command,
                "status": "running",
                "logs": "",
                "proc": proc,
                "started_at": time.time(),
                "ended_at": None,
                "exit_code": None
            }

    def append_log(self, task_id: str, text: str):
        with self.lock:
            if task_id in self.processes:
                self.processes[task_id]["logs"] += text

    def update_status(self, task_id: str, status: str, exit_code: Optional[int] = None):
        with self.lock:
            if task_id in self.processes:
                self.processes[task_id]["status"] = status
                self.processes[task_id]["ended_at"] = time.time()
                self.processes[task_id]["exit_code"] = exit_code
                # Remove subprocess object reference to avoid serialization issues
                self.processes[task_id]["proc"] = None

    def get_process(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            if task_id not in self.processes:
                return None
            p = self.processes[task_id]
            return {
                "task_id": task_id,
                "command": p["command"],
                "status": p["status"],
                "logs": p["logs"],
                "started_at": p["started_at"],
                "ended_at": p["ended_at"],
                "exit_code": p["exit_code"]
            }

    def get_all(self) -> List[Dict[str, Any]]:
        with self.lock:
            result = []
            for tid, p in self.processes.items():
                result.append({
                    "task_id": tid,
                    "command": p["command"],
                    "status": p["status"],
                    "started_at": p["started_at"],
                    "ended_at": p["ended_at"],
                    "exit_code": p["exit_code"]
                })
            return result

    def kill_process(self, task_id: str) -> bool:
        with self.lock:
            p = self.processes.get(task_id)
            if not p or p["status"] != "running":
                return False
            proc = p.get("proc")
            if proc:
                try:
                    # In Linux, we can kill process group
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                except Exception:
                    try:
                        proc.terminate()
                    except Exception:
                        pass
                return True
        return False


process_registry = ProcessRegistry()


class BenchService:
    @staticmethod
    def discover_benches(base_dir: str = "/home/frappe") -> List[Dict[str, Any]]:
        """
        Scans a directory for valid Frappe benches.
        """
        benches = []
        if not os.path.exists(base_dir):
            return benches

        try:
            for entry in os.scandir(base_dir):
                if entry.is_dir():
                    path = entry.path
                    if BenchService.is_bench_directory(path):
                        benches.append(BenchService.get_bench_info(entry.name, path))
        except Exception as e:
            print(f"Error scanning benches: {e}")

        return benches

    @staticmethod
    def is_bench_directory(path: str) -> bool:
        """
        Verifies if a directory is a valid Frappe bench.
        """
        sites_path = os.path.join(path, "sites")
        apps_path = os.path.join(path, "apps")
        env_path = os.path.join(path, "env")
        return os.path.isdir(sites_path) and os.path.isdir(apps_path) and os.path.isdir(env_path)

    @staticmethod
    def get_bench_info(name: str, path: str) -> Dict[str, Any]:
        """
        Gathers details for a single bench.
        """
        python_version = "Unknown"
        node_version = "Unknown"
        frappe_version = "Unknown"

        # Python Version
        python_bin = os.path.join(path, "env", "bin", "python")
        if os.path.exists(python_bin):
            try:
                res = subprocess.run([python_bin, "--version"], capture_output=True, text=True, timeout=2)
                python_version = res.stdout.strip().replace("Python ", "")
            except Exception:
                pass

        # Node Version
        try:
            res = subprocess.run(["node", "-v"], capture_output=True, text=True, timeout=2)
            node_version = res.stdout.strip()
        except Exception:
            pass

        # Frappe Version
        frappe_init = os.path.join(path, "apps", "frappe", "frappe", "__init__.py")
        if os.path.exists(frappe_init):
            try:
                with open(frappe_init, "r") as f:
                    for line in f:
                        if line.startswith("__version__"):
                            frappe_version = line.split("=")[1].strip().strip("'").strip('"')
                            break
            except Exception:
                pass

        # Sites
        sites = BenchService.get_sites(path)
        
        # Running status
        is_running = BenchService.is_bench_running(path)

        return {
            "name": name,
            "path": path,
            "python_version": python_version,
            "node_version": node_version,
            "frappe_version": frappe_version,
            "sites": sites,
            "is_running": is_running
        }

    @staticmethod
    def get_sites(bench_path: str) -> List[Dict[str, Any]]:
        """
        Lists all site names under the bench, along with their proxy ports.
        """
        sites_path = os.path.join(bench_path, "sites")
        sites = []
        if not os.path.exists(sites_path):
            return sites

        ignored = ["assets", "patches", "common_site_config.json", "apps.txt", "languages.txt"]
        site_names = []
        try:
            for entry in os.scandir(sites_path):
                if entry.is_dir() and entry.name not in ignored and not entry.name.startswith("."):
                    site_names.append(entry.name)
        except Exception:
            pass

        # Load/update site ports configuration
        ports_config_path = os.path.join(sites_path, "site_ports.json")
        site_ports = {}
        if os.path.exists(ports_config_path):
            try:
                with open(ports_config_path, "r") as f:
                    site_ports = json.load(f)
            except Exception:
                pass

        # Clean up old sites from config
        site_ports = {k: int(v) for k, v in site_ports.items() if k in site_names}

        # Assign new ports
        assigned_ports = set(site_ports.values())
        next_port = 8010
        for name in site_names:
            if name not in site_ports:
                while next_port in assigned_ports or next_port == 8005:  # skip 8005 (our API)
                    next_port += 1
                site_ports[name] = next_port
                assigned_ports.add(next_port)

        # Save configuration
        try:
            with open(ports_config_path, "w") as f:
                json.dump(site_ports, f, indent=2)
        except Exception:
            pass

        # Read bench webserver port to pass to proxy
        webserver_port = 8000
        common_config_path = os.path.join(sites_path, "common_site_config.json")
        if os.path.exists(common_config_path):
            try:
                with open(common_config_path, "r") as f:
                    config = json.load(f)
                    webserver_port = config.get("webserver_port", 8000)
            except Exception:
                pass

        # Start proxy servers for these sites dynamically
        try:
            import asyncio
            from services.proxy_service import proxy_manager
            try:
                loop = asyncio.get_running_loop()
                for name, port in site_ports.items():
                    loop.create_task(proxy_manager.start_proxy_for_site(port, name, webserver_port))
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                async def run_async_starts():
                    for name, port in site_ports.items():
                        await proxy_manager.start_proxy_for_site(port, name, webserver_port)
                loop.run_until_complete(run_async_starts())
        except Exception as e:
            print(f"Error starting proxies in get_sites: {e}")

        # Return list of dictionaries
        for name in site_names:
            sites.append({
                "name": name,
                "port": site_ports.get(name)
            })

        sites.sort(key=lambda x: x["name"])
        return sites

    @staticmethod
    def get_apps(bench_path: str) -> List[Dict[str, Any]]:
        """
        Lists installed apps and their versions.
        """
        apps_path = os.path.join(bench_path, "apps")
        apps = []
        if not os.path.exists(apps_path):
            return apps

        try:
            for entry in os.scandir(apps_path):
                if entry.is_dir() and not entry.name.startswith("."):
                    app_name = entry.name
                    app_version = "Unknown"
                    branch = "Unknown"

                    # Get version
                    init_py = os.path.join(entry.path, app_name, "__init__.py")
                    if os.path.exists(init_py):
                        with open(init_py, "r") as f:
                            for line in f:
                                if line.startswith("__version__"):
                                    app_version = line.split("=")[1].strip().strip("'").strip('"')
                                    break

                    # Get Git Branch
                    try:
                        res = subprocess.run(
                            ["git", "-C", entry.path, "rev-parse", "--abbrev-ref", "HEAD"],
                            capture_output=True, text=True, timeout=2
                        )
                        if res.returncode == 0:
                            branch = res.stdout.strip()
                    except Exception:
                        pass

                    apps.append({
                        "name": app_name,
                        "version": app_version,
                        "branch": branch,
                        "path": entry.path
                    })
        except Exception:
            pass
        return apps

    @staticmethod
    def is_bench_running(bench_path: str) -> bool:
        """
        Checks if the bench is currently running (i.e. 'bench start' or honcho is active
        with processes running in this bench path).
        """
        for proc in psutil.process_iter(["pid", "name", "cmdline", "cwd"]):
            try:
                # Check if process is running inside this bench path
                cwd = proc.info.get("cwd")
                cmdline = proc.info.get("cmdline")
                
                # Check if current working directory matches bench path
                if cwd and os.path.abspath(cwd) == os.path.abspath(bench_path):
                    # Check if it's running honcho, bench, python, redis, or node
                    if cmdline and any(kw in " ".join(cmdline) for kw in ["bench", "honcho", "foreman", "gunicorn", "node", "python"]):
                        return True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        return False

    @staticmethod
    def run_async_command(task_id: str, command: str, cwd: str, on_success = None):
        """
        Runs a command in a shell environment asynchronously, saving output to process registry.
        """
        def thread_target():
            try:
                # We start the subprocess in a new process group (preexec_fn=os.setsid)
                # so that we can easily terminate all children if killed.
                proc = subprocess.Popen(
                    command,
                    shell=True,
                    cwd=cwd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    preexec_fn=os.setsid
                )
                process_registry.register(task_id, command, proc)

                # Read output line by line
                while True:
                    line = proc.stdout.readline()
                    if not line:
                        break
                    process_registry.append_log(task_id, line)

                proc.wait()
                exit_code = proc.returncode
                status = "success" if exit_code == 0 else "failed"
                process_registry.update_status(task_id, status, exit_code)

                if status == "success" and on_success:
                    try:
                        on_success()
                    except Exception as e:
                        print(f"Error running on_success callback for task {task_id}: {e}")

            except Exception as e:
                process_registry.append_log(task_id, f"\nError running task: {str(e)}")
                process_registry.update_status(task_id, "failed", -1)

        t = threading.Thread(target=thread_target)
        t.start()

    @staticmethod
    def start_bench(bench_path: str) -> str:
        """
        Starts the bench by running 'bench start' asynchronously.
        """
        task_id = f"bench_start_{int(time.time())}"
        # Start bench command
        command = "export PATH=$PATH:/home/frappe/.local/bin; bench start"
        BenchService.run_async_command(task_id, command, bench_path)
        return task_id

    @staticmethod
    def stop_bench(bench_path: str) -> bool:
        """
        Stops the bench by killing all processes running in the bench directory.
        """
        stopped = False
        for proc in psutil.process_iter(["pid", "name", "cmdline", "cwd"]):
            try:
                cwd = proc.info.get("cwd")
                if cwd and os.path.abspath(cwd) == os.path.abspath(bench_path):
                    proc.terminate()
                    stopped = True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return stopped

    @staticmethod
    def open_ide(bench_path: str, reuse_window: bool = False) -> bool:
        """
        Opens the specified bench directory in the Antigravity IDE platform.
        """
        try:
            # Read current WSL distro name dynamically, default to Ubuntu
            distro = os.environ.get("WSL_DISTRO_NAME", "Ubuntu")
            remote_arg = f"wsl+{distro}"

            cmd = ["antigravity-ide"]
            if reuse_window:
                cmd.append("-r")
            else:
                cmd.append("-n")
            
            cmd.extend(["--remote", remote_arg, bench_path])

            # Launch in the background, making sure it doesn't block or close when backend exits
            subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            return True
        except Exception as e:
            print(f"Error launching Antigravity IDE: {e}")
            return False
