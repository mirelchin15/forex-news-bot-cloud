import fetch from "node-fetch";

export default async function handler(req, res) {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;

  try {
    // Step 1: Fetch forex news from TheNewsAPI
    console.log("Fetching news from TheNewsAPI...");
    const newsUrl = `https://api.thenewsapi.com/v1/news/all?api_token=${NEWS_API_KEY}&language=en&search=forex&limit=5`;
    const newsResponse = await fetch(newsUrl);
    const newsData = await newsResponse.json();
    
    console.log("News data received:", JSON.stringify(newsData).substring(0, 200));

    if (!newsData.data || newsData.data.length === 0) {
      return res.status(200).send("No forex news found.");
    }

    // Step 2: Analyze news with OpenAI
    const articles = newsData.data.slice(0, 5);
    const summaryPrompt = `CRITICAL: You MUST analyze ONLY the specific news articles provided below. Do NOT use hypothetical scenarios or general market knowledge.

For EACH article below:
1. Read the title and description carefully
2. Identify which currency pair(s) it affects
3. Determine if it suggests BUY, SELL, or NEUTRAL
4. Provide specific Entry price, Stop Loss (SL), and Take Profit (TP) levels

IMPORTANT RULES:
- ONLY analyze the articles listed below - do NOT make assumptions
- MUST reference specific article titles in your analysis
- MUST provide exact Entry/SL/TP price levels
- NO hypothetical language like "if..." or "based on typical scenarios"
- If an article does not clearly suggest a trade direction, mark it as NEUTRAL

NEWS ARTICLES TO ANALYZE:\n\n" + articles.map(a => `Title: \${a.title}\nDescription: \${a.description || 'No description'}\n`).join('\n')
    
    console.log("Sending to OpenAI...");
    const openaiUrl = "https://api.openai.com/v1/chat/completions";
    const aiResponse = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: "You are a professional forex trading analyst. Your job is to analyze the SPECIFIC news articles provided and give trading signals based on them. RULES: 1) Reference specific article titles, 2) Provide Entry/SL/TP levels, 3) NO hypothetical scenarios."
        }, {
          role: "user",
          content: summaryPrompt
        }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const aiData = await aiResponse.json();
    console.log("OpenAI response:", JSON.stringify(aiData).substring(0, 300));

    // Better error handling for OpenAI response
    let signalText = "No signal generated.";
    
    if (aiData.error) {
      console.error("OpenAI Error:", aiData.error);
      signalText = `❌ OpenAI Error: ${aiData.error.message || 'Unknown error'}`;
    } else if (aiData.choices && aiData.choices.length > 0 && aiData.choices[0].message) {
      signalText = aiData.choices[0].message.content;
      console.log("Signal generated successfully:", signalText.substring(0, 100));
    } else {
      console.error("Unexpected OpenAI response structure:", aiData);
      signalText = "⚠️ Unable to generate signal. OpenAI response was invalid.";
    }

    // Step 3: Send to Telegram
    console.log("Sending to Telegram...");
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `🔔 Forex Signal Update\n\n${signalText}`,
        parse_mode: "Markdown"
      })
    });

    const telegramData = await telegramResponse.json();
    console.log("Telegram response:", telegramData.ok ? 'Success' : 'Failed');

    if (!telegramData.ok) {
      console.error("Telegram error:", telegramData);
    }

    res.status(200).send("✅ Forex news analyzed and sent to Telegram!");
    
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).send(`❌ Error processing news: ${error.message}`);
  }
}
