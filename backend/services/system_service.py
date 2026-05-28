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
