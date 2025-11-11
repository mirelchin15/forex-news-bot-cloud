import fetch from "node-fetch";

export default async function handler(req, res) {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;

  try {
    // 📰 Step 1: Fetch latest Forex news
    const newsUrl = `https://newsapi.org/v2/everything?q=forex OR currency OR dollar OR euro&language=en&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`;
    const newsResponse = await fetch(newsUrl);
    const newsData = await newsResponse.json();

    if (!newsData.articles || newsData.articles.length === 0) {
      return res.status(200).send("No forex news found.");
    }

    // 🧠 Step 2: Use OpenAI to analyze news
    const openaiUrl = "https://api.openai.com/v1/chat/completions";
    const summaryPrompt = `
      Analyze these forex news headlines and decide for each:
      - If the impact is high, low, or medium.
      - If it suggests BUY, SELL, or NEUTRAL for major currency pairs.
      Only include strong signals (BUY or SELL) in your summary.
      
      News:
      ${newsData.articles.map(a => a.title).join("\n")}
    `;

    const aiResponse = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
      }),
    });

    const aiData = await aiResponse.json();
    const signalText = aiData.choices?.[0]?.message?.content || "No clear signal.";

    // 📡 Step 3: Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `📈 *TriggerEdge Forex Signal Update*\n\n${signalText}`,
        parse_mode: "Markdown",
      }),
    });

    res.status(200).send("✅ Forex news analyzed and signal sent to Telegram!");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("❌ Error processing news.");
  }
}
