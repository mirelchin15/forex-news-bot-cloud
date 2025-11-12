import fetch from "node-fetch";

// Production deployment
export default async function handler(req, res) {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;

  try {
    // Step 1: Fetch forex news from TheNewsAPI
    const newsUrl = `https://api.thenewsapi.com/v1/news/all?api_token=${NEWS_API_KEY}&language=en&search=forex&limit=5`;
    const newsResponse = await fetch(newsUrl);
    const newsData = await newsResponse.json();

    if (!newsData.data || newsData.data.length === 0) {
      return res.status(200).send("No forex news found.");
    }

    // Step 2: Analyze news with OpenAI
    const articles = newsData.data.slice(0, 5);
    const summaryPrompt = `Analyze these forex news and provide trading signals (BUY, SELL, or NEUTRAL):\n\n${articles.map(a => `${a.title}: ${a.description}`).join('\n\n')}`;

    const openaiUrl = "https://api.openai.com/v1/chat/completions";
    const aiResponse = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }]
      })
    });

    const aiData = await aiResponse.json();
    const signalText = aiData.choices?.[0]?.message?.content || "No signal generated.";

    // Step 3: Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `🔔 Forex Signal Update\n\n${signalText}`,
        parse_mode: "Markdown"
      })
    });

    res.status(200).send("✅ Forex news analyzed and sent to Telegram!");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("❌ Error processing news.");
  }
}
