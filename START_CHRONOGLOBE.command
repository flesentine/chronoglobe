#!/bin/bash
cd "$(dirname "$0")" || exit 1
lsof -ti tcp:8080 | xargs kill -9 2>/dev/null || true
python3 server.py 8080 >/tmp/chronoglobe.log 2>&1 &
sleep 2
open "http://localhost:8080/index.html?reload=$(date +%s)"
