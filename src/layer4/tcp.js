const args = process.argv.slice(2);

if (args.length < 3) {
  console.log("Usage: tcp.js <host> <port> <time>");
  process.exit(1);
}

const [host, port, duration] = args;
console.log(`[TCP] Simulasi serangan ke ${host}:${port} selama ${duration} detik.`);

let elapsed = 0;
const interval = setInterval(() => {
  elapsed += 5;
  console.log(`[TCP] Mengirim paket ke ${host}:${port}...`);
  if (elapsed >= duration) {
    clearInterval(interval);
    console.log("[TCP] Serangan selesai.");
  }
}, 5000);
