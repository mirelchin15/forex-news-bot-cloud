import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔹 Environment dəyişənlər
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const OPENAI_API = process.env.OPENAI_API_KEY;
const NEWSDATA_API = process.env.NEWS_API_KEY;

// ✅ 1. Xəbərləri alır (vacibləri filtr edir)
async function getImportantNews() {
  const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API}&q=forex OR usd OR eurusd OR gold OR fomc OR "rate decision" OR inflation OR "non farm payroll" OR "fed statement" OR ecb OR gdp OR "interest rate"&language=en&country=us,gb,eu`;
  console.log("🔎 Fetching news from:", url);

  const res = await fetch(url);
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    console.log("⚠️ No news found.");
    return "Heç bir vacib xəbər tapılmadı.";
  }

  const newsList = data.results.slice(0, 5).map((n, i) => {
    return `📰 *${i + 1}. ${n.title}*\n${n.description || ""}\n🔗 ${n.link}\n`;
  }).join("\n");

  console.log("🧾 News fetched:\n", newsList);
  return newsList;
}

// ✅ 2. AI analiz edir
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

  console.log("🧠 Sending to OpenAI...");
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
  console.log("🤖 AI response raw:", JSON.stringify(data, null, 2));
  return data.choices?.[0]?.message?.content || "❌ AI cavabı alına bilmədi.";
}

// ✅ 3. Telegrama göndərir
async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  console.log("📤 Sending to Telegram...");

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
  console.log("📨 Telegram response:", JSON.stringify(data, null, 2));
  return data.ok;
}

// ✅ 4. Əsas route (test üçün)
app.get("/", async (req, res) => {
  try {
    console.log("🚀 Starting news + AI pipeline...");
    const news = await getImportantNews();
    const aiDecision = await analyzeWithAI(news);

    const message = `
📢 *HIGH IMPACT FOREX NEWS ALERT*

${news}

🤖 *AI Decision:*
${aiDecision}
`;

    const sent = await sendToTelegram(message);
    if (sent) {
      console.log("✅ Message successfully sent to Telegram.");
      res.send("✅ Telegrama uğurla göndərildi!");
    } else {
      console.log("❌ Telegram göndərişində problem.");
      res.status(500).send("❌ Telegram problemi.");
    }
  } catch (err) {
    console.error("🔥 Xəta:", err);
    res.status(500).send("Serverdə xəta baş verdi.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server aktivdir: http://localhost:${PORT}`));
