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
                    # In Linux, kill process group if it is distinct from our own
                    pgid = os.getpgid(proc.pid)
                    if pgid != os.getpgrp():
                        os.killpg(pgid, signal.SIGTERM)
                    else:
                        proc.terminate()
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

        # Sites (includes per-site installed_apps when available)
        sites = BenchService.get_sites(path)

        # Bench-level apps (cloned into apps/)
        apps = BenchService.get_apps(path)

        # Running status
        is_running = BenchService.is_bench_running(path)

        return {
            "name": name,
            "path": path,
            "python_version": python_version,
            "node_version": node_version,
            "frappe_version": frappe_version,
            "sites": sites,
            "apps": apps,
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

        # Read bench webserver port first to pass to proxy and avoid port collisions
        webserver_port = BenchService.ensure_bench_ports(bench_path)

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

        # Gather all ports already assigned in other benches to avoid conflicts
        all_assigned_ports = set()
        base_dir = os.path.dirname(bench_path)
        try:
            for entry in os.scandir(base_dir):
                if entry.is_dir() and os.path.abspath(entry.path) != os.path.abspath(bench_path):
                    other_ports_path = os.path.join(entry.path, "sites", "site_ports.json")
                    if os.path.exists(other_ports_path):
                        try:
                            with open(other_ports_path, "r") as f:
                                other_ports = json.load(f)
                                for p in other_ports.values():
                                    all_assigned_ports.add(int(p))
                        except Exception:
                            pass
        except Exception:
            pass

        # Reserved ports: API port (8005) and bench webserver_port
        reserved_ports = {8005, int(webserver_port)}

        # Detect and remove conflicting ports from our own config
        cleaned_site_ports = {}
        for name, port in site_ports.items():
            if port in all_assigned_ports or port in reserved_ports:
                import logging
                logging.getLogger(__name__).warning(f"Port conflict detected for site {name} on port {port}. Re-assigning.")
            else:
                cleaned_site_ports[name] = port
        site_ports = cleaned_site_ports

        # Assign new ports (preventing conflict with reserved, our own and other benches' ports)
        assigned_ports = set(site_ports.values()).union(all_assigned_ports).union(reserved_ports)
        next_port = 8010
        for name in site_names:
            if name not in site_ports:
                while next_port in assigned_ports:
                    next_port += 1
                site_ports[name] = next_port
                assigned_ports.add(next_port)

        # Save configuration
        try:
            with open(ports_config_path, "w") as f:
                json.dump(site_ports, f, indent=2)
        except Exception:
            pass

        # Patch apps/frappe/frappe/app.py in this bench to correctly resolve the site by X-Frappe-Site-Name or Host
        BenchService.patch_frappe_app(bench_path)

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

        # Bench apps once (used to get frappe version fallback)
        bench_apps = BenchService.get_apps(bench_path)
        frappe_info = next((a for a in bench_apps if a.get("name") == "frappe"), None)
        frappe_ver = (frappe_info.get("version") if frappe_info else "Unknown") or "Unknown"
        frappe_core_fallback = [{"name": "frappe", "version": frappe_ver, "inferred": False}]

        # Return list of dictionaries (with per-site installed apps when readable)
        for name in site_names:
            installed = BenchService.get_site_installed_apps(bench_path, name)
            if installed:
                for app in installed:
                    app["inferred"] = False
            else:
                installed = [dict(a) for a in frappe_core_fallback]

            sites.append({
                "name": name,
                "port": site_ports.get(name),
                "installed_apps": installed
            })

        sites.sort(key=lambda x: x["name"])
        return sites

    @staticmethod
    def clear_site_apps_cache(bench_path: str, site_name: str):
        """
        Clears cached installed apps list for a specific site.
        """
        cache_key = f"{bench_path}::{site_name}"
        if hasattr(BenchService, "_site_apps_cache") and cache_key in BenchService._site_apps_cache:
            del BenchService._site_apps_cache[cache_key]

    @staticmethod
    def get_site_installed_apps(bench_path: str, site_name: str) -> List[Dict[str, str]]:
        """
        Resolve apps installed on a specific site via MariaDB (fast).
        Returns [] when unavailable — callers should fall back to bench apps.
        """
        cache_key = f"{bench_path}::{site_name}"
        now = time.time()
        if not hasattr(BenchService, "_site_apps_cache"):
            BenchService._site_apps_cache = {}

        cached = BenchService._site_apps_cache.get(cache_key)
        if cached and (now - cached[0]) < 60:
            return cached[1]

        apps: List[Dict[str, str]] = []
        version_lookup = {
            a["name"]: (a.get("version") or "Unknown")
            for a in (BenchService.get_apps(bench_path) or [])
            if isinstance(a, dict) and a.get("name")
        }

        def _finalize(items: List[Any]) -> List[Dict[str, str]]:
            out: List[Dict[str, str]] = []
            seen = set()
            for item in items:
                if isinstance(item, dict):
                    name = (item.get("name") or "").strip()
                    ver = (item.get("version") or "").strip() or version_lookup.get(name, "Unknown")
                elif isinstance(item, (list, tuple)) and item:
                    name = str(item[0]).strip()
                    ver = str(item[1]).strip() if len(item) > 1 and item[1] else version_lookup.get(name, "Unknown")
                else:
                    name = str(item).strip()
                    ver = version_lookup.get(name, "Unknown")
                if not name or name in seen:
                    continue
                seen.add(name)
                out.append({"name": name, "version": ver or "Unknown"})
            return out

        site_config_path = os.path.join(bench_path, "sites", site_name, "site_config.json")
        if os.path.exists(site_config_path):
            try:
                with open(site_config_path, "r", encoding="utf-8", errors="ignore") as f:
                    cfg = json.load(f)

                db_name = cfg.get("db_name")
                db_password = cfg.get("db_password")
                if db_name and db_password:
                    db_host = cfg.get("db_host") or "127.0.0.1"
                    db_port = str(cfg.get("db_port") or 3306)
                    db_user = cfg.get("db_user") or db_name
                    env = os.environ.copy()
                    env["MYSQL_PWD"] = str(db_password)

                    queries = [
                        "SELECT app_name, IFNULL(app_version, '') FROM `tabInstalled Application` ORDER BY creation",
                        "SELECT defvalue FROM `tabDefaultValue` WHERE defkey='installed_apps' LIMIT 1",
                    ]
                    for query in queries:
                        try:
                            res = subprocess.run(
                                [
                                    "mysql",
                                    f"-h{db_host}",
                                    f"-P{db_port}",
                                    f"-u{db_user}",
                                    db_name,
                                    "-N",
                                    "-B",
                                    "-e",
                                    query,
                                ],
                                capture_output=True,
                                text=True,
                                timeout=2,
                                env=env,
                            )
                            if res.returncode != 0 or not res.stdout.strip():
                                continue

                            if "defkey='installed_apps'" in query:
                                raw = res.stdout.strip()
                                for candidate in (raw, raw.strip().strip("'").strip('"')):
                                    try:
                                        data = json.loads(candidate)
                                        if isinstance(data, list) and data:
                                            apps = _finalize(data)
                                            break
                                    except Exception:
                                        continue
                            else:
                                pairs = []
                                for line in res.stdout.strip().splitlines():
                                    parts = line.split("\t")
                                    app_name = (parts[0] or "").strip()
                                    app_version = (parts[1] if len(parts) > 1 else "").strip()
                                    if app_name:
                                        pairs.append({"name": app_name, "version": app_version or "Unknown"})
                                apps = _finalize(pairs)

                            if apps:
                                break
                        except Exception:
                            continue
            except Exception:
                pass

        BenchService._site_apps_cache[cache_key] = (now if apps else now - 50, apps)
        return apps

    @staticmethod
    def get_apps(bench_path: str) -> List[Dict[str, Any]]:
        """
        Lists apps available in a bench (apps/ folder + sites/apps.txt).
        Fast filesystem-only — no subprocess required for discovery.
        """
        now = time.time()
        if not hasattr(BenchService, "_bench_apps_cache"):
            BenchService._bench_apps_cache = {}
        cached = BenchService._bench_apps_cache.get(bench_path)
        if cached and (now - cached[0]) < 30:
            return cached[1]

        apps_by_name: Dict[str, Dict[str, Any]] = {}
        skip_names = {"__pycache__", "node_modules", ".git"}

        def _ensure(name: str) -> Dict[str, Any]:
            if name not in apps_by_name:
                apps_by_name[name] = {
                    "name": name,
                    "version": "Unknown",
                    "branch": "Unknown",
                    "path": os.path.join(bench_path, "apps", name),
                }
            return apps_by_name[name]

        # 1) sites/apps.txt is the authoritative bench app list
        apps_txt = os.path.join(bench_path, "sites", "apps.txt")
        if os.path.exists(apps_txt):
            try:
                with open(apps_txt, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        name = line.strip()
                        if name and not name.startswith("#"):
                            _ensure(name)
            except Exception:
                pass

        # 2) Scan apps/ directories
        apps_path = os.path.join(bench_path, "apps")
        if os.path.isdir(apps_path):
            try:
                for entry in os.scandir(apps_path):
                    if not entry.is_dir() or entry.name.startswith(".") or entry.name in skip_names:
                        continue
                    app = _ensure(entry.name)
                    app["path"] = entry.path

                    init_py = os.path.join(entry.path, entry.name, "__init__.py")
                    if os.path.exists(init_py):
                        try:
                            with open(init_py, "r", encoding="utf-8", errors="ignore") as f:
                                for line in f:
                                    if line.startswith("__version__"):
                                        app["version"] = line.split("=", 1)[1].strip().strip("'").strip('"')
                                        break
                        except Exception:
                            pass

                    try:
                        res = subprocess.run(
                            ["git", "-C", entry.path, "rev-parse", "--abbrev-ref", "HEAD"],
                            capture_output=True, text=True, timeout=1.5
                        )
                        if res.returncode == 0 and res.stdout.strip():
                            app["branch"] = res.stdout.strip()
                    except Exception:
                        pass
            except Exception as e:
                print(f"Error scanning apps in {bench_path}: {e}")

        apps = sorted(apps_by_name.values(), key=lambda a: a["name"])
        BenchService._bench_apps_cache[bench_path] = (now, apps)
        return apps

    @staticmethod
    def patch_frappe_app(bench_path: str):
        """
        Patches apps/frappe/frappe/app.py in the bench to ensure X-Frappe-Site-Name header
        and host-based site resolution take precedence over _site fallback, enabling multi-site co-existence.
        """
        app_py_path = os.path.join(bench_path, "apps", "frappe", "frappe", "app.py")
        if not os.path.exists(app_py_path):
            return

        try:
            with open(app_py_path, "r", encoding="utf-8") as f:
                app_content = f.read()

            if "# Patched by Bench Manager" in app_content:
                return

            replacement_str = (
                "# Patched by Bench Manager to support per-site proxy routing\n"
                "\tsite = request.headers.get(\"X-Frappe-Site-Name\")\n"
                "\tif not site:\n"
                "\t\thost_site = get_site_name(request.host)\n"
                "\t\tif host_site and os.path.exists(os.path.join(_sites_path, host_site)):\n"
                "\t\t\tsite = host_site\n"
                "\t\telse:\n"
                "\t\t\tsite = _site"
            )

            import re
            pattern = r'(site\s*=\s*(?:request\.headers\.get\("X-Frappe-Site-Name"\)|_site|\s*\|\s*)*get_site_name\(request\.host\))'

            if re.search(pattern, app_content):
                app_content = re.sub(pattern, replacement_str, app_content, count=1)
                with open(app_py_path, "w", encoding="utf-8") as f:
                    f.write(app_content)
            else:
                for target_str in [
                    'site = request.headers.get("X-Frappe-Site-Name") or _site or get_site_name(request.host)',
                    'site = _site or request.headers.get("X-Frappe-Site-Name") or get_site_name(request.host)',
                    'site = _site or get_site_name(request.host)'
                ]:
                    if target_str in app_content:
                        app_content = app_content.replace(target_str, replacement_str, 1)
                        with open(app_py_path, "w", encoding="utf-8") as f:
                            f.write(app_content)
                        break
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to patch app.py for bench {bench_path}: {e}")

    @staticmethod
    def ensure_bench_ports(bench_path: str, base_dir: Optional[str] = None) -> int:
        """
        Ensures the bench has a unique webserver_port, socketio_port, and redis ports in common_site_config.json.
        Returns the assigned webserver_port.
        """
        bench_path = os.path.abspath(bench_path)
        sites_path = os.path.join(bench_path, "sites")
        common_config_path = os.path.join(sites_path, "common_site_config.json")

        if not os.path.exists(sites_path):
            return 8000

        if base_dir is None:
            base_dir = os.path.dirname(bench_path)

        # Collect used webserver and socketio ports across all other benches
        used_webserver_ports = set()
        used_socketio_ports = set()

        if os.path.exists(base_dir):
            try:
                for entry in os.scandir(base_dir):
                    if entry.is_dir() and os.path.abspath(entry.path) != bench_path:
                        other_cfg = os.path.join(entry.path, "sites", "common_site_config.json")
                        if os.path.exists(other_cfg):
                            try:
                                with open(other_cfg, "r") as f:
                                    c = json.load(f)
                                    if "webserver_port" in c:
                                        used_webserver_ports.add(int(c["webserver_port"]))
                                    if "socketio_port" in c:
                                        used_socketio_ports.add(int(c["socketio_port"]))
                            except Exception:
                                pass
            except Exception:
                pass

        config = {}
        if os.path.exists(common_config_path):
            try:
                with open(common_config_path, "r") as f:
                    config = json.load(f)
            except Exception:
                config = {}

        modified = False

        # Ensure webserver_port is non-conflicting (default 8000, 8001, 8002... excluding 8005 which is manager API)
        current_web_port = int(config.get("webserver_port", 8000))
        if current_web_port in used_webserver_ports or current_web_port == 8005:
            next_web_port = 8000
            while next_web_port in used_webserver_ports or next_web_port == 8005:
                next_web_port += 1
            config["webserver_port"] = next_web_port
            current_web_port = next_web_port
            modified = True
        else:
            config["webserver_port"] = current_web_port

        # Ensure socketio_port is non-conflicting
        current_socketio_port = int(config.get("socketio_port", 9000))
        if current_socketio_port in used_socketio_ports:
            next_socketio = 9000
            while next_socketio in used_socketio_ports:
                next_socketio += 1
            config["socketio_port"] = next_socketio
            modified = True

        # Ensure serve_default_site is false so Frappe routes per host/header
        if config.get("serve_default_site", True):
            config["serve_default_site"] = False
            modified = True

        if modified or not os.path.exists(common_config_path):
            try:
                with open(common_config_path, "w") as f:
                    json.dump(config, f, indent=2)
            except Exception:
                pass

        return current_web_port

    @staticmethod
    def is_bench_running(bench_path: str) -> bool:
        """
        Checks if the bench is currently running (i.e. 'bench start' or honcho is active
        with processes running in this bench path).
        """
        bench_path = os.path.abspath(bench_path)
        protected_pids = {os.getpid()}
        try:
            for parent in psutil.Process(os.getpid()).parents():
                protected_pids.add(parent.pid)
        except Exception:
            pass

        for proc in psutil.process_iter(["pid", "name", "cmdline", "cwd"]):
            try:
                if proc.pid in protected_pids:
                    continue
                cwd = proc.info.get("cwd")
                cmdline = proc.info.get("cmdline")
                
                if cwd and cmdline:
                    cwd_abs = os.path.abspath(cwd)
                    if cwd_abs == bench_path or cwd_abs.startswith(bench_path + os.sep):
                        cmdline_str = " ".join(cmdline).lower()
                        if any(ide in cmdline_str for ide in [".antigravity-ide-server", ".vscode-server", ".cursor-server", "node-ipc", "main.py", "uvicorn", "vite", "bench-manager"]):
                            continue
                        if any(kw in cmdline_str for kw in ["bench", "honcho", "foreman", "gunicorn", "node", "python", "redis-server"]):
                            return True
            except Exception:
                continue
        return False

    @staticmethod
    def get_mariadb_root_password(provided_password: Optional[str] = None) -> str:
        """
        Auto-detects working MariaDB root password from common defaults if none is provided.
        """
        if provided_password and provided_password.strip():
            return provided_password.strip()

        # Test candidate passwords in priority order
        for pwd in ["frappe", "root", ""]:
            try:
                cmd = ["mariadb", "-u", "root", f"-p{pwd}", "-e", "SELECT 1;"] if pwd else ["mariadb", "-u", "root", "-e", "SELECT 1;"]
                res = subprocess.run(cmd, capture_output=True, timeout=2)
                if res.returncode == 0:
                    return pwd
            except Exception:
                pass
        return "frappe"

    @staticmethod
    def run_async_command(task_id: str, command: str, cwd: str, on_success = None):
        """
        Runs a command in a shell environment asynchronously, saving output to process registry.
        Automatically injects PATH to ensure bench and python virtualenv binaries are found.
        """
        # Ensure PATH includes frappe local bin and current bench env/bin
        env_bin = os.path.join(cwd, "env", "bin")
        path_prefix = f'export PYTHONUNBUFFERED=1; export PATH="/home/frappe/.local/bin:{env_bin}:$PATH"; '
        
        full_command = command if command.startswith("export PATH=") or command.startswith("export PYTHONUNBUFFERED=") else path_prefix + command

        def thread_target():
            try:
                proc = subprocess.Popen(
                    full_command,
                    shell=True,
                    cwd=cwd,
                    stdin=subprocess.DEVNULL,
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
        BenchService.ensure_bench_ports(bench_path)
        task_id = f"bench_start_{int(time.time())}"
        command = "bench start"
        BenchService.run_async_command(task_id, command, bench_path)
        return task_id

    @staticmethod
    def stop_bench(bench_path: str) -> str:
        """
        Stops the bench asynchronously by killing all processes running in the bench directory
        in a background thread and registering a task for user feedback.
        """
        bench_path = os.path.abspath(bench_path)
        task_id = f"bench_stop_{int(time.time())}"
        dummy_cmd = f"stop bench {os.path.basename(bench_path)}"

        # Determine manager PIDs to protect
        protected_pids = {os.getpid()}
        try:
            for parent in psutil.Process(os.getpid()).parents():
                protected_pids.add(parent.pid)
        except Exception:
            pass

        # Register task immediately so API returns task_id instantly
        process_registry.register(task_id, dummy_cmd, None)
        process_registry.append_log(task_id, f"Stopping all active processes in {bench_path}...\n")

        def stop_thread():
            try:
                processes_to_kill = []
                for proc in psutil.process_iter(["pid", "name", "cmdline", "cwd"]):
                    try:
                        if proc.pid in protected_pids:
                            continue

                        cwd = proc.info.get("cwd")
                        cmdline = proc.info.get("cmdline")
                        if cwd and cmdline:
                            cmdline_str = " ".join(cmdline).lower()
                            # Skip IDE helper processes and Bench Manager's own processes
                            if any(ide in cmdline_str for ide in [".antigravity-ide-server", ".vscode-server", ".cursor-server", "node-ipc", "main.py", "uvicorn", "vite", "bench-manager"]):
                                continue

                            cwd_abs = os.path.abspath(cwd)
                            if cwd_abs == bench_path or cwd_abs.startswith(bench_path + os.sep):
                                processes_to_kill.append(proc)
                    except Exception:
                        continue

                # Collect child processes for each target process
                all_to_kill = []
                for proc in processes_to_kill:
                    if proc.pid in protected_pids:
                        continue
                    all_to_kill.append(proc)
                    try:
                        for child in proc.children(recursive=True):
                            if child.pid not in protected_pids:
                                all_to_kill.append(child)
                    except Exception:
                        pass

                # Deduplicate
                unique_to_kill = []
                seen_pids = set()
                for p in all_to_kill:
                    if p.pid not in seen_pids and p.pid not in protected_pids:
                        seen_pids.add(p.pid)
                        unique_to_kill.append(p)

                stopped_count = 0
                for proc in unique_to_kill:
                    try:
                        pid = proc.pid
                        proc.terminate()
                        stopped_count += 1
                        process_registry.append_log(task_id, f"Terminated process PID {pid}\n")
                    except Exception as e:
                        process_registry.append_log(task_id, f"Failed to terminate PID {proc.pid}: {e}\n")

                if unique_to_kill:
                    try:
                        gone, alive = psutil.wait_procs(unique_to_kill, timeout=0.5)
                        for proc in alive:
                            try:
                                proc.kill()
                                process_registry.append_log(task_id, f"Killed process PID {proc.pid}\n")
                            except Exception:
                                pass
                    except Exception:
                        pass

                process_registry.append_log(task_id, f"\nBench stopped successfully. ({stopped_count} processes terminated)\n")
                process_registry.update_status(task_id, "success", 0)

                # Update any currently running 'bench_start_' tasks for this bench path
                with process_registry.lock:
                    for tid, p in process_registry.processes.items():
                        if tid.startswith("bench_start_") and p["status"] == "running":
                            process_registry.update_status(tid, "stopped", 0)
            except Exception as e:
                process_registry.append_log(task_id, f"\nError stopping bench: {str(e)}\n")
                process_registry.update_status(task_id, "failed", -1)

        t = threading.Thread(target=stop_thread)
        t.start()

        return task_id

    @staticmethod
    def clear_cache_bench(bench_path: str) -> str:
        """
        Runs 'bench clear-cache' or 'bench clear-website-cache' asynchronously.
        """
        task_id = f"bench_clear_cache_{int(time.time())}"
        command = "bench clear-cache && bench clear-website-cache 2>/dev/null || true"
        BenchService.run_async_command(task_id, command, bench_path)
        return task_id

    @staticmethod
    def migrate_bench(bench_path: str) -> str:
        """
        Runs 'bench migrate' asynchronously across sites in the bench.
        """
        task_id = f"bench_migrate_{int(time.time())}"
        command = "bench migrate"
        BenchService.run_async_command(task_id, command, bench_path)
        return task_id

    @staticmethod
    def build_bench(bench_path: str) -> str:
        """
        Runs 'bench build' asynchronously to compile frontend asset bundles.
        """
        task_id = f"bench_build_{int(time.time())}"
        command = "bench build"
        BenchService.run_async_command(task_id, command, bench_path)
        return task_id

    @staticmethod
    def restart_bench(bench_path: str) -> str:
        """
        Restarts the bench asynchronously by stopping processes then starting.
        """
        task_id = f"bench_restart_{int(time.time())}"
        BenchService.stop_bench(bench_path)
        command = "bench restart || bench start"
        BenchService.run_async_command(task_id, command, bench_path)
        return task_id

    @staticmethod
    def doctor_bench(bench_path: str) -> str:
        """
        Runs 'bench doctor' to check bench health and prerequisites.
        """
        task_id = f"bench_doctor_{int(time.time())}"
        command = "bench doctor"
        BenchService.run_async_command(task_id, command, bench_path)
        return task_id

    @staticmethod
    def run_batch_command(bench_paths: List[str], action: str) -> str:
        """
        Executes a batch action (start, stop, migrate, clear-cache, update, build)
        across multiple benches concurrently or in sequence.
        """
        task_id = f"batch_{action}_{int(time.time())}"
        dummy_cmd = f"batch action '{action}' on {len(bench_paths)} benches"
        
        def batch_thread():
            process_registry.register(task_id, dummy_cmd, None)
            process_registry.append_log(task_id, f"=== Starting Batch Action: {action.upper()} on {len(bench_paths)} benches ===\n\n")

            overall_failed = False
            for path in bench_paths:
                bench_name = os.path.basename(path)
                process_registry.append_log(task_id, f"--------------------------------------------------\n")
                process_registry.append_log(task_id, f"[{action.upper()}] Executing on bench: {bench_name} ({path})\n")
                process_registry.append_log(task_id, f"--------------------------------------------------\n")
                
                try:
                    if action == "start":
                        BenchService.start_bench(path)
                        process_registry.append_log(task_id, f"Started bench server for {bench_name}.\n\n")
                    elif action == "stop":
                        BenchService.stop_bench(path)
                        process_registry.append_log(task_id, f"Stopped bench server for {bench_name}.\n\n")
                    else:
                        cmd_map = {
                            "clear-cache": "bench clear-cache && bench clear-website-cache 2>/dev/null || true",
                            "migrate": "bench migrate",
                            "update": "bench update",
                            "build": "bench build",
                            "doctor": "bench doctor"
                        }
                        cmd = cmd_map.get(action, f"bench {action}")
                        env_bin = os.path.join(path, "env", "bin")
                        full_command = f'export PATH="/home/frappe/.local/bin:{env_bin}:$PATH"; {cmd}'

                        res = subprocess.run(
                            full_command,
                            shell=True,
                            cwd=path,
                            capture_output=True,
                            text=True
                        )
                        output = res.stdout + res.stderr
                        process_registry.append_log(task_id, output + "\n")

                        if res.returncode != 0:
                            overall_failed = True
                            process_registry.append_log(task_id, f"❌ [{bench_name}] Action '{action}' failed with exit code {res.returncode}\n\n")
                        else:
                            process_registry.append_log(task_id, f"✅ [{bench_name}] Action '{action}' completed successfully.\n\n")
                except Exception as e:
                    overall_failed = True
                    process_registry.append_log(task_id, f"❌ [{bench_name}] Error executing {action}: {e}\n\n")

            final_status = "failed" if overall_failed else "success"
            process_registry.append_log(task_id, f"\n=== Batch Action '{action}' Finished with status: {final_status.upper()} ===\n")
            process_registry.update_status(task_id, final_status, -1 if overall_failed else 0)

        t = threading.Thread(target=batch_thread)
        t.start()
        return task_id

    @staticmethod
    def open_ide(bench_path: str, reuse_window: bool = False) -> bool:
        """
        Opens the specified bench directory in the Antigravity IDE platform.
        """
        try:
            distro = os.environ.get("WSL_DISTRO_NAME", "Ubuntu")
            remote_arg = f"wsl+{distro}"

            cmd = ["antigravity-ide"]
            if reuse_window:
                cmd.append("-r")
            else:
                cmd.append("-n")
            
            cmd.extend(["--remote", remote_arg, bench_path])

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

