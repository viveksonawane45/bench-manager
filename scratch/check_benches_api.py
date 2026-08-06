#!/usr/bin/env python3
import json
import urllib.request

with urllib.request.urlopen("http://127.0.0.1:8005/api/benches", timeout=30) as res:
    data = json.load(res)

b = next(x for x in data if x["name"] == "frappe-bench")
print("keys", sorted(b.keys()))
apps = b.get("apps") or []
print("apps_count", len(apps))
print("apps_sample", [a.get("name") for a in apps[:8]])
site = (b.get("sites") or [{}])[0]
print("site", site.get("name"))
installed = site.get("installed_apps") or []
print("installed_count", len(installed))
print("installed_sample", [a.get("name") if isinstance(a, dict) else a for a in installed[:8]])
