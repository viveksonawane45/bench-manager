import shutil
import subprocess
import psutil

class SystemService:
    @staticmethod
    def get_system_stats():
        """
        Returns CPU, RAM, Disk usage, and statuses of dependent services.
        """
        # CPU
        cpu_usage = psutil.cpu_percent(interval=None)

        # RAM
        virtual_mem = psutil.virtual_memory()
        ram = {
            "total": virtual_mem.total,
            "available": virtual_mem.available,
            "used": virtual_mem.used,
            "percent": virtual_mem.percent
        }

        # Disk
        disk_info = shutil.disk_usage("/")
        disk = {
            "total": disk_info.total,
            "used": disk_info.used,
            "free": disk_info.free,
            "percent": round((disk_info.used / disk_info.total) * 100, 2)
        }

        # Services
        services = {
            "mariadb": SystemService.check_service_status("mariadb"),
            "redis": SystemService.check_service_status("redis-server"),
            "nginx": SystemService.check_service_status("nginx")
        }

        return {
            "cpu": cpu_usage,
            "ram": ram,
            "disk": disk,
            "services": services
        }

    @staticmethod
    def check_service_status(service_name: str) -> str:
        """
        Checks status of a system service using system service command.
        Returns 'active' or 'inactive'.
        """
        try:
            # We run 'service <name> status'
            result = subprocess.run(
                ["service", service_name, "status"],
                capture_output=True,
                text=True,
                timeout=2
            )
            # If the output contains active, online, or running, or exit code is 0
            # Depending on service, check output contents or exit code.
            # In Debian/Ubuntu, "is running" or status containing "[ + ]" is positive.
            # Alternatively, check 'service --status-all' or status command output.
            output = result.stdout.lower() + result.stderr.lower()
            
            if result.returncode == 0 or "is running" in output or "active (running)" in output or "online" in output:
                return "active"
            else:
                return "inactive"
        except Exception:
            return "inactive"

    @staticmethod
    def check_dependencies():
        """
        Check versions and install status for all required tools.
        """
        import os
        def run_cmd(cmd):
            try:
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=2, shell=True)
                if res.returncode == 0:
                    return True, res.stdout.strip()
                return False, res.stderr.strip() or res.stdout.strip()
            except Exception as e:
                return False, str(e)

        dependencies = {}

        # 1. WSL Check
        wsl_ok, wsl_out = run_cmd("powershell.exe -Command \"Get-Command wsl.exe\"")
        dependencies["wsl"] = {"installed": wsl_ok, "version": "WSL 2" if wsl_ok else None}

        # 2. Ubuntu Check
        ubuntu_ok = False
        ubuntu_ver = "Unknown"
        if os.path.exists("/etc/os-release"):
            try:
                with open("/etc/os-release", "r") as f:
                    for line in f:
                        if line.startswith("PRETTY_NAME="):
                            ubuntu_ver = line.split("=")[1].strip().replace('"', '')
                            ubuntu_ok = "Ubuntu" in ubuntu_ver
                            break
            except Exception:
                pass
        dependencies["ubuntu"] = {"installed": ubuntu_ok, "version": ubuntu_ver if ubuntu_ok else None}

        # 3. Python Check
        py_ok, py_out = run_cmd("python3 --version")
        if py_ok:
            version = py_out.replace("Python ", "")
            dependencies["python"] = {"installed": True, "version": version}
        else:
            dependencies["python"] = {"installed": False, "version": None}

        # 4. Node.js Check
        node_ok, node_out = run_cmd("node --version")
        if node_ok:
            dependencies["node"] = {"installed": True, "version": node_out}
        else:
            # try nodejs
            node_ok2, node_out2 = run_cmd("nodejs --version")
            if node_ok2:
                dependencies["node"] = {"installed": True, "version": node_out2}
            else:
                dependencies["node"] = {"installed": False, "version": None}

        # 5. Redis Check
        redis_ok, redis_out = run_cmd("redis-server --version")
        if redis_ok:
            version = "Unknown"
            if "v=" in redis_out:
                version = redis_out.split("v=")[1].split(" ")[0]
            dependencies["redis"] = {"installed": True, "version": version}
        else:
            dependencies["redis"] = {"installed": False, "version": None}

        # 6. MariaDB Check
        db_ok, db_out = run_cmd("mysql --version")
        if db_ok:
            version = "Unknown"
            if "Distrib" in db_out:
                version = db_out.split("Distrib")[1].split(",")[0].strip()
            dependencies["mariadb"] = {"installed": True, "version": version}
        else:
            dependencies["mariadb"] = {"installed": False, "version": None}

        # 7. Git Check
        git_ok, git_out = run_cmd("git --version")
        if git_ok:
            version = git_out.replace("git version ", "")
            dependencies["git"] = {"installed": True, "version": version}
        else:
            dependencies["git"] = {"installed": False, "version": None}

        # 8. Bench CLI Check
        bench_ok = False
        bench_ver = None
        for bp in ["/home/frappe/.local/bin/bench", "bench"]:
            ok, out = run_cmd(f"{bp} --version")
            if ok:
                bench_ok = True
                bench_ver = out.strip()
                break
        dependencies["bench"] = {"installed": bench_ok, "version": bench_ver}

        return dependencies

    @staticmethod
    def install_dependency(dependency_name: str) -> str:
        """
        Launches installation for the given dependency asynchronously.
        Returns the task_id.
        """
        import time
        from services.bench_service import BenchService

        task_id = f"install_{dependency_name}_{int(time.time())}"
        
        # Install commands inside WSL or on Windows via powershell.exe
        commands = {
            "wsl": "powershell.exe -Command \"Start-Process wsl.exe -ArgumentList '--install' -Verb RunAs\"",
            "ubuntu": "powershell.exe -Command \"Start-Process 'ms-windows-store://pdp/?ProductId=9PDXGFCFSCMY'\"",
            "python": "sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-dev",
            "node": "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && export NVM_DIR=\"$HOME/.nvm\" && [ -s \"$NVM_DIR/nvm.sh\" ] && \\. \"$NVM_DIR/nvm.sh\" && nvm install 18",
            "redis": "sudo apt-get update && sudo apt-get install -y redis-server",
            "mariadb": "sudo apt-get update && sudo apt-get install -y mariadb-server mariadb-client",
            "git": "sudo apt-get update && sudo apt-get install -y git",
            "bench": "pip3 install --user frappe-bench"
        }

        command = commands.get(dependency_name)
        if not command:
            raise ValueError(f"Unknown dependency: {dependency_name}")

        # Run command inside WSL (home directory `/home/frappe` is appropriate)
        BenchService.run_async_command(task_id, command, "/home/frappe")
        return task_id

