import json
import urllib.request

base = "http://localhost:8005/api/benches"

def test_endpoint(endpoint, payload):
    url = f"{base}/{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        res = urllib.request.urlopen(req)
        print(f"[{endpoint}] Status: {res.status}, Response: {res.read().decode('utf-8')}")
    except Exception as e:
        print(f"[{endpoint}] Error: {e}")

test_endpoint("clear-cache", {"bench_path": "/home/frappe/demo-bench"})
test_endpoint("migrate", {"bench_path": "/home/frappe/demo-bench"})
test_endpoint("build", {"bench_path": "/home/frappe/demo-bench"})
test_endpoint("batch-action", {"bench_paths": ["/home/frappe/demo-bench"], "action": "clear-cache"})
