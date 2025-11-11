import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Telegram məlumatları
const TELEGRAM_TOKEN = "8397007603:AAHdIwCyHakw_2QFfSc0-dTM7fc1jCuJcGY";
const CHAT_ID = "6512494476";

// Newsdata.io API token
const NEWSDATA_API = "pub_d5a139e5d39b4da7a30938d14ca93d58";

// Xəbərləri alır
async function getForexNews() {
  const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API}&q=forex OR usd OR eurusd OR gold OR oil&language=en`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return "Heç bir xəbər tapılmadı.";
  }

  const topNews = data.results.slice(0, 3).map((n, i) => {
    return `📰 ${i + 1}. ${n.title}\n🔗 ${n.link}\n`;
  }).join("\n");

  return `📊 **Forex News Update**\n\n${topNews}`;
}

// Telegrama göndərir
async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" })
  });
}

// API route
app.get("/", async (req, res) => {
  try {
    const newsText = await getForexNews();
    await sendToTelegram(newsText);
    res.send("✅ Xəbərlər uğurla Telegrama göndərildi!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Xəta baş verdi.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server işləyir: http://localhost:${PORT}`));
