import express from "express";
import fetch from "node-fetch";

const app = express();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "Markdown"
    })
  });
  const data = await res.json();
  console.log("📨 Telegram response:", data);
  return data.ok;
}

// ✅ Ana route
app.get("/", async (req, res) => {
  res.send({
    ok: true,
    message: "✅ Forex News Bot Cloud is running!"
  });
});

// ✅ Test route
app.get("/test", async (req, res) => {
  const sent = await sendToTelegram("📡 Test message from /test endpoint!");
  if (sent) res.send("✅ Telegram message sent successfully!");
  else res.send("❌ Telegram test failed!");
});

// ✅ Server portu
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
