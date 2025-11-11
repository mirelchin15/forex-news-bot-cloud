import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Telegram məlumatları
const TELEGRAM_TOKEN = "8397007603:AAHdIwCyHakw_2QFfSc0-dTM7fc1jCuJcGY";
const CHAT_ID = "6512494476";

// API-lər
const NEWSDATA_API = "pub_d5a139e5d39b4da7a30938d14ca93d58";
const OPENAI_API = process.env.OPENAI_API_KEY;

// 🔹 1. Xəbərləri alır
async function getForexNews() {
  const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API}&q=forex OR usd OR eurusd OR gold OR oil&language=en`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return "Heç bir xəbər tapılmadı.";
  }

  const topNews = data.results.slice(0, 3).map((n, i) => {
    return `📰 ${i + 1}. ${n.title}\n${n.description || ""}\n🔗 ${n.link}\n`;
  }).join("\n");

  return topNews;
}

// 🔹 2. ChatGPT ilə analiz edir (BUY / SELL qərarı)
async function analyzeNewsWithAI(newsText) {
  const prompt = `
Sən peşəkar Forex analitikasısan. Aşağıdakı xəbərləri oxu və qərar ver:
BUY, SELL və ya NEUTRAL.
Əsas fokus: USD, EUR, GOLD.
Cavabı bu formatda ver:
Decision: BUY / SELL / NEUTRAL
Reason: qısa izah.

Xəbərlər:
${newsText}
  `;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150
    })
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Analiz alına bilmədi.";
}

// 🔹 3. Telegrama göndərir
async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" })
  });
}

// 🔹 4. API Route
app.get("/", async (req, res) => {
  try {
    const news = await getForexNews();
    const aiResult = await analyzeNewsWithAI(news);
    const finalText = `📊 *Forex News Summary:*\n\n${news}\n\n🤖 *AI Decision:*\n${aiResult}`;

    await sendToTelegram(finalText);
    res.send("✅ Xəbərlər və AI analiz Telegrama göndərildi!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Xəta baş verdi.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server işləyir: http://localhost:${PORT}`));
