import fetch from "node-fetch";

export default async function handler(req, res) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;

  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    return res.status(400).json({ error: "Missing Telegram credentials" });
  }

  const message = "📡 Test message from Vercel /api/test endpoint!";
  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  const response = await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown"
    })
  });

  const data = await response.json();
  console.log("Telegram Response:", data);

  if (data.ok) {
    return res.status(200).send("✅ Telegram message sent successfully!");
  } else {
    return res.status(500).json({ error: data.description || "Failed to send" });
  }
}
