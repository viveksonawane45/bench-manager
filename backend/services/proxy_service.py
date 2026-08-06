import asyncio
import logging

logger = logging.getLogger(__name__)

class SiteProxyManager:
    def __init__(self):
        self.servers = {}  # port -> asyncio.AbstractServer
        self.tasks = {}    # port -> asyncio.Task
        self.targets = {}  # port -> (site_name, target_port)
        self.lock = asyncio.Lock()

    async def start_proxy_for_site(self, port: int, site_name: str, target_port: int = 8000):
        async with self.lock:
            if port in self.servers:
                current_config = self.targets.get(port)
                if current_config == (site_name, target_port):
                    logger.info(f"Proxy already running on port {port} with matching config for site {site_name}")
                    return
                else:
                    logger.info(f"Config changed for port {port}: old {current_config}, new ({site_name}, {target_port}). Recreating proxy.")
                    server = self.servers.pop(port, None)
                    if server:
                        server.close()
                        await server.wait_closed()
                    task = self.tasks.pop(port, None)
                    if task:
                        task.cancel()
                        try:
                            await task
                        except asyncio.CancelledError:
                            pass

            try:
                # Start and bind the server immediately inside the lock to prevent other tasks from attempting to bind
                server = await asyncio.start_server(
                    lambda r, w: self._handle_client(r, w, port, site_name, target_port),
                    "0.0.0.0",
                    port
                )
                self.servers[port] = server
                self.targets[port] = (site_name, target_port)

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

            port_suffix = f"_{port}"

            # Decode and rebuild headers to replace Host, Connection, and insert X-Frappe-Site-Name
            lines = headers_part.split(b"\r\n")
            new_lines = []
            
            # Keep request line (first line)
            if lines:
                new_lines.append(lines[0])
                
            for line in lines[1:]:
                if not line:
                    continue
                lower_line = line.lower()
                # Skip existing Host, Connection, Keep-Alive, and X-Frappe-Site-Name headers to avoid duplicates
                if (lower_line.startswith(b"host:") or 
                    lower_line.startswith(b"connection:") or 
                    lower_line.startswith(b"keep-alive:") or 
                    lower_line.startswith(b"x-frappe-site-name:")):
                    continue

                # Isolate Cookie header for this port (sid_<port> -> sid)
                if lower_line.startswith(b"cookie:"):
                    cookie_str = line[7:].decode('utf-8', errors='ignore').strip()
                    cookies = [c.strip() for c in cookie_str.split(";") if c.strip()]
                    rewritten_cookies = []
                    
                    for c in cookies:
                        if "=" in c:
                            key, val = c.split("=", 1)
                            key = key.strip()
                            val = val.strip()
                            if key.endswith(port_suffix):
                                base_key = key[:-len(port_suffix)]
                                rewritten_cookies.append(f"{base_key}={val}")
                            elif "_" in key and key.split("_")[-1].isdigit():
                                # Cookie for another port -> skip to avoid cross-site session leakage
                                continue
                            else:
                                rewritten_cookies.append(f"{key}={val}")
                    
                    if rewritten_cookies:
                        new_lines.append(f"Cookie: {'; '.join(rewritten_cookies)}".encode('utf-8'))
                    continue

                new_lines.append(line)
                
            # Add rewritten and new headers
            new_lines.append(f"Host: {site_name}".encode('utf-8'))
            new_lines.append(f"X-Frappe-Site-Name: {site_name}".encode('utf-8'))
            new_lines.append(b"Connection: close")
            
            modified_headers = b"\r\n".join(new_lines) + b"\r\n\r\n"

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

            # Read backend response headers to rewrite Set-Cookie headers with port suffix
            resp_header_data = b""
            while b"\r\n\r\n" not in resp_header_data:
                try:
                    chunk = await asyncio.wait_for(backend_reader.read(4096), timeout=2.0)
                    if not chunk:
                        break
                    resp_header_data += chunk
                except Exception:
                    break

            if resp_header_data and b"\r\n\r\n" in resp_header_data:
                resp_parts = resp_header_data.split(b"\r\n\r\n", 1)
                resp_headers_part = resp_parts[0]
                resp_body_prefix = resp_parts[1] if len(resp_parts) > 1 else b""

                resp_lines = resp_headers_part.split(b"\r\n")
                new_resp_lines = []

                for line in resp_lines:
                    if not line:
                        continue
                    if line.lower().startswith(b"set-cookie:"):
                        cookie_header = line[11:].decode('utf-8', errors='ignore').strip()
                        # Rewrite keys (sid=, system_user=, user_id=, user_image=, full_name=) to sid_<port>=, etc.
                        for cookie_name in ["sid", "system_user", "user_id", "user_image", "full_name"]:
                            pattern = f"{cookie_name}="
                            target = f"{cookie_name}{port_suffix}="
                            if pattern in cookie_header and target not in cookie_header:
                                cookie_header = cookie_header.replace(pattern, target, 1)
                        new_resp_lines.append(f"Set-Cookie: {cookie_header}".encode('utf-8'))
                    else:
                        new_resp_lines.append(line)

                modified_resp_headers = b"\r\n".join(new_resp_lines) + b"\r\n\r\n"
                writer.write(modified_resp_headers)
                if resp_body_prefix:
                    writer.write(resp_body_prefix)
                await writer.drain()

            # Pipe remaining bytes bi-directionally
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

            pipe1 = asyncio.create_task(pipe(reader, backend_writer))
            pipe2 = asyncio.create_task(pipe(backend_reader, writer))
            done, pending = await asyncio.wait([pipe1, pipe2], return_when=asyncio.FIRST_COMPLETED)
            for p in pending:
                p.cancel()

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
            self.targets.pop(port, None)
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
            self.targets.clear()

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
