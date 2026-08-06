#!/bin/bash
export PATH="$PATH:/home/frappe/.local/bin"
cd /home/frappe/new-bench16

echo "=== Installing erpnext on new16.local ==="
bench --site new16.local install-app erpnext --force 2>&1

echo ""
echo "=== Exit code: $? ==="

echo ""
echo "=== Checking installed apps ==="
bench --site new16.local list-apps 2>&1

echo ""
echo "=== site_config.json ==="
cat sites/new16.local/site_config.json
