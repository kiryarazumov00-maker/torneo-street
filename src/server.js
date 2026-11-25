import "dotenv/config";
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { Bot, InlineKeyboard } from "grammy";
import { validateTelegramInitData } from "./auth.js";
import { getOrCreatePlayer, playerById, updatePlayer, leaderboard } from "./db.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });
const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const APP_URL = process.env.APP_URL || "";
const DEV_AUTH = process.env.DEV_AUTH === "true";

app.use(express.json({ limit: "32kb" }));
app.use(express.static("public"));

function auth(req, res, next) {
  const user = validateTelegramInitData(req.get("x-telegram-init-data"), BOT_TOKEN);
  if (user) {
    req.player = getOrCreatePlayer(user);
    return next();
  }
  if (DEV_AUTH && process.env.NODE_ENV !== "production") {
    req.player = getOrCreatePlayer({ id: 900000001, first_name: "Test Driver", username: "test_driver" });
    return next();
  }
  return res.status(401).json({ error: "Telegram authorization failed. Open the game from its Telegram bot." });
}

app.get("/api/health", (_req, res) => res.json({ ok: true, game: "Torneo Street" }));
app.get("/api/me", auth, (req, res) => res.json({ player: req.player }));
app.get("/api/leaderboard", auth, (_req, res) => res.json({ players: leaderboard() }));

app.post("/api/tune", auth, (req, res) => {
  const type = req.body?.type;
  const p = playerById(req.player.telegram_id);
  if (!["engine", "suspension"].includes(type)) return res.status(400).json({ error: "Unknown upgrade" });
  const price = type === "engine" ? 7000 * p.engine : 5000 * p.suspension;
  if (p.cash < price) return res.status(400).json({ error: "Not enough cash" });
  if (p[type] >= 5) return res.status(400).json({ error: "Maximum level reached" });
  const updated = updatePlayer(p.telegram_id, { cash: p.cash - price, [type]: p[type] + 1 });
  res.json({ player: updated, price });
});

app.post("/api/color", auth, (req, res) => {
  const color = String(req.body?.color || "");
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ error: "Invalid color" });
  res.json({ player: updatePlayer(req.player.telegram_id, { car_color: color }) });
});

app.post("/api/race/finish", auth, (req, res) => {
  const seconds = Number(req.body?.seconds);
  if (!Number.isFinite(seconds) || seconds < 5 || seconds > 900) return res.status(400).json({ error: "Invalid race time" });
  const reward = Math.max(500, Math.min(3500, Math.round(3500 - seconds * 8)));
  const p = playerById(req.player.telegram_id);
  const xp = p.xp + 120;
  const level = Math.floor(xp / 500) + 1;
  const updated = updatePlayer(p.telegram_id, { cash: p.cash + reward, xp, level });
  res.json({ player: updated, reward });
});

const online = new Map();
io.use((socket, next) => {
  const user = validateTelegramInitData(socket.handshake.auth?.initData, BOT_TOKEN);
  if (user) {
    socket.user = getOrCreatePlayer(user);
    return next();
  }
  if (DEV_AUTH && process.env.NODE_ENV !== "production") {
    socket.user = getOrCreatePlayer({ id: 900000001, first_name: "Test Driver", username: "test_driver" });
    return next();
  }
  next(new Error("Telegram authorization failed"));
});
io.on("connection", socket => {
  const id = String(socket.user.telegram_id);
  socket.on("drive", state => {
    if (!state || !Number.isFinite(state.x) || !Number.isFinite(state.y)) return;
    const player = playerById(id);
    const safe = {
      id, name: player.first_name, color: player.car_color,
      x: Math.max(40, Math.min(1960, state.x)),
      y: Math.max(40, Math.min(1960, state.y)),
      angle: Number.isFinite(state.angle) ? state.angle : 0
    };
    online.set(id, safe);
    socket.broadcast.emit("player-moved", safe);
  });
  socket.on("disconnect", () => {
    online.delete(id);
    io.emit("player-left", id);
  });
  socket.emit("world-players", [...online.values()].filter(p => p.id !== id));
});

if (BOT_TOKEN) {
  const bot = new Bot(BOT_TOKEN);
  bot.command("start", async ctx => {
    const keyboard = new InlineKeyboard().webApp("🏁 Играть в Torneo Street", APP_URL);
    await ctx.reply("Добро пожаловать в TORNEO STREET! Твой город уже ждёт. 🚗", { reply_markup: keyboard });
  });
  bot.command("help", ctx => ctx.reply("Нажми /start и открой игру кнопкой «Играть»."));
  bot.start().catch(err => console.error("Bot polling error:", err));
} else {
  console.warn("BOT_TOKEN is empty. Web server works, Telegram bot is disabled.");
}

server.listen(PORT, () => console.log(`Torneo Street listening on port ${PORT}`));
