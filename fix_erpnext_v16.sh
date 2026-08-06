#!/bin/bash
export PATH="$PATH:/home/frappe/.local/bin"

echo "=== Killing old new-bench16 processes ==="
# Kill the specific PIDs for new-bench16
pkill -f "new-bench16/env/bin/python" 2>/dev/null
pkill -f "new-bench16/apps/frappe/node_modules" 2>/dev/null
sleep 2

echo "=== Verifying processes killed ==="
ps aux | grep new-bench16 | grep -v grep || echo "All new-bench16 processes killed"

echo ""
echo "=== Starting new-bench16 via bench start ==="
cd /home/frappe/new-bench16
nohup bench start > /tmp/new-bench16.log 2>&1 &
sleep 5

echo ""
echo "=== Checking new processes ==="
ps aux | grep new-bench16 | grep -v grep | head -10

echo ""
echo "=== Last lines of bench log ==="
tail -20 /tmp/new-bench16.log
