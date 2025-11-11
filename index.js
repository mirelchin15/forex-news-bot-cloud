import fetch from "node-fetch";

export default async function handler(req, res) {
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

  // Əsas səhifə yoxlaması
  if (req.url === "/") {
    return res.status(200).json({
      ok: true,
      has_openai: true,
      has_news: true,
      has_telegram: true,
      chat_id_set: !!CHAT_ID
    });
  }

  // Test endpoint (/api/test)
  if (req.url === "/test") {
    const sent = await sendToTelegram("📡 Test message from /test endpoint!");
    if (sent)
      return res.status(200).send("✅ Telegram message sent successfully!");
    else return res.status(500).send("❌ Telegram test failed!");
  }

  // Əgər tapılmadısa
  return res.status(404).json({ detail: "Not Found" });
}
