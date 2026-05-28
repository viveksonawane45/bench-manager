import asyncio
import logging

logger = logging.getLogger(__name__)

class SiteProxyManager:
    def __init__(self):
        self.servers = {}  # port -> asyncio.AbstractServer
        self.tasks = {}    # port -> asyncio.Task
        self.lock = asyncio.Lock()

    async def start_proxy_for_site(self, port: int, site_name: str, target_port: int = 8000):
        async with self.lock:
            if port in self.servers:
                logger.info(f"Proxy already running on port {port} for site {site_name}")
                return

            try:
                # Start and bind the server immediately inside the lock to prevent other tasks from attempting to bind
                server = await asyncio.start_server(
                    lambda r, w: self._handle_client(r, w, port, site_name, target_port),
                    "0.0.0.0",
                    port
                )
                self.servers[port] = server

                # Run the server's event serving loop in a background task
                async def serve():
                    try:
                        async with server:
                            await server.serve_forever()
                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        logger.error(f"Error in serve_forever on port {port}: {e}")

                self.tasks[port] = asyncio.create_task(serve())
                logger.info(f"Started proxy on port {port} for site {site_name} -> target {target_port}")
            except Exception as e:
                logger.error(f"Error starting proxy server on port {port}: {e}")

    async def _handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter, port: int, site_name: str, target_port: int):
        try:
            # Read HTTP headers
            header_data = b""
            while b"\r\n\r\n" not in header_data:
                chunk = await reader.read(4096)
                if not chunk:
                    break
                header_data += chunk

            if not header_data:
                writer.close()
                await writer.wait_closed()
                return

            # Split headers and body
            parts = header_data.split(b"\r\n\r\n", 1)
            headers_part = parts[0]
            body_part = parts[1] if len(parts) > 1 else b""

            # Decode and replace Host header case-insensitively
            lines = headers_part.split(b"\r\n")
            for i, line in enumerate(lines):
                if line.lower().startswith(b"host:"):
                    lines[i] = f"Host: {site_name}".encode('utf-8')
                    break

            modified_headers = b"\r\n".join(lines) + b"\r\n\r\n"

            # Connect to Frappe backend
            try:
                backend_reader, backend_writer = await asyncio.open_connection("127.0.0.1", target_port)
            except Exception as e:
                logger.error(f"Failed to connect to backend on port {target_port}: {e}")
                # Return HTTP 502 Bad Gateway
                writer.write(
                    b"HTTP/1.1 502 Bad Gateway\r\n"
                    b"Content-Type: text/plain\r\n"
                    b"Connection: close\r\n\r\n"
                    b"Error connecting to Frappe local development server. Is the bench running?"
                )
                await writer.drain()
                writer.close()
                await writer.wait_closed()
                return

            # Send modified request to backend
            backend_writer.write(modified_headers)
            if body_part:
                backend_writer.write(body_part)
            await backend_writer.drain()

            # Pipe bytes bi-directionally
            async def pipe(r, w):
                try:
                    while True:
                        data = await r.read(8192)
                        if not data:
                            break
                        w.write(data)
                        await w.drain()
                except Exception:
                    pass
                finally:
                    try:
                        w.close()
                        await w.wait_closed()
                    except Exception:
                        pass

            await asyncio.gather(
                pipe(reader, backend_writer),
                pipe(backend_reader, writer),
                return_exceptions=True
            )

        except Exception as e:
            logger.error(f"Error in proxy connection on port {port}: {e}")
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    async def stop_proxy_for_site(self, port: int):
        async with self.lock:
            server = self.servers.pop(port, None)
            if server:
                server.close()
                await server.wait_closed()
                logger.info(f"Stopped proxy server on port {port}")
            task = self.tasks.pop(port, None)
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    async def stop_all(self):
        async with self.lock:
            for port, server in list(self.servers.items()):
                server.close()
                await server.wait_closed()
            self.servers.clear()

            for port, task in list(self.tasks.items()):
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            self.tasks.clear()
            logger.info("All site proxies stopped cleanly")

# Global proxy manager instance
proxy_manager = SiteProxyManager()
