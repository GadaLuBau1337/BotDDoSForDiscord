#!/usr/bin/env python3
import sys
import time

if len(sys.argv) < 4:
    print("Usage: udp.py <host> <port> <time>")
    sys.exit(1)

host = sys.argv[1]
port = sys.argv[2]
duration = int(sys.argv[3])

print(f"[UDP] Simulasi serangan ke {host}:{port} selama {duration} detik.")

start = time.time()
while time.time() - start < duration:
    print(f"[UDP] Mengirim paket ke {host}:{port}...")
    time.sleep(5)

print("[UDP] Serangan selesai.")
