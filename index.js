import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔹 Environment dəyişənlər (Vercel mühitindən oxunur)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const OPENAI_API = process.env.OPENAI_API_KEY;
const NEWSDATA_API = process.env.NEWS_API_KEY;

// ✅ 1. Vacib iqtisadi xəbərləri alır
async function getImportantNews() {
  const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API}&q=forex OR usd OR eurusd OR gold OR fomc OR "rate decision" OR inflation OR "non farm payroll" OR "fed statement" OR ecb OR gdp OR "interest rate"&language=en&country=us,gb,eu`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.results || data.results.length === 0) return "⚠️ Vacib xəbər tapılmadı.";

  const filtered = data.results.slice(0, 5).map((n, i) => {
    return `📰 *${i + 1}. ${n.title}*\n${n.description || ""}\n🔗 ${n.link}\n`;
  }).join("\n");

  return filtered;
}

// ✅ 2. ChatGPT ilə analiz (vacib xəbər üçün BUY / SELL)
async function analyzeWithAI(newsText) {
  const prompt = `
Sən 30 illik təcrübəli Forex analitikasısan.
Aşağıdakı xəbərləri analiz et və qərar ver:
- Əgər USD güclənəcəksə: BUY USD
- Əgər USD zəifləyəcəksə: SELL USD
- Əgər xəbər neytraldırsa: NEUTRAL

Nəticəni bu formatda ver:
Decision: BUY / SELL / NEUTRAL
Reason: Qısa, aydın izah.

Xəbərlər:
${newsText}
`;

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200
    })
  });

  const data = await aiRes.json();
  return data.choices?.[0]?.message?.content || "❌ AI cavabı alına bilmədi.";
}

// ✅ 3. Nəticəni Telegrama göndərir
async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "Markdown"
    })
  });
}

// ✅ 4. Əsas route (cron və ya əl ilə test üçün)
app.get("/", async (req, res) => {
  try {
    const news = await getImportantNews();
    const aiDecision = await analyzeWithAI(news);

    const message = `
📢 *HIGH IMPACT FOREX NEWS ALERT*

${news}

🤖 *AI Decision:*
${aiDecision}
`;

    await sendToTelegram(message);
    res.send("✅ Vacib xəbərlər analiz olundu və Telegrama göndərildi.");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Xəta baş verdi.");
  }
});

// ✅ 5. Serveri işə salır
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server aktivdir: http://localhost:${PORT}`));
