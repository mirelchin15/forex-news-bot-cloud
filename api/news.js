import fetch from "node-fetch";

export default async function handler(req, res) {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

  try {
    // Step 1: Fetch forex news from TheNewsAPI
    console.log("Fetching news from TheNewsAPI...");
    const newsUrl = `https://api.thenewsapi.com/v1/news/all?api_token=${NEWS_API_KEY}&language=en&search=forex&limit=5`;
    const newsResponse = await fetch(newsUrl);
    const newsData = await newsResponse.json();
    
    console.log("News data received:", JSON.stringify(newsData).substring(0, 200));


        // Fallback: Try Tavily if no news from TheNewsAPI
    if (!newsData.data || newsData.data.length === 0) {
      console.log("No news from TheNewsAPI, trying Tavily...");
      
      const tavilyUrl = "https://api.tavily.com/search";
      const tavilyResponse = await fetch(tavilyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: "forex USD EUR GBP news today",
          search_depth: "basic",
          max_results: 5,
          include_domains: ["forexfactory.com", "investing.com", "fxstreet.com"]
        })
      });
      
      const tavilyData = await tavilyResponse.json();
      console.log("Tavily response:", JSON.stringify(tavilyData).substring(0, 200));
      
      if (tavilyData.results && tavilyData.results.length > 0) {
        // Convert Tavily format to newsData format
        newsData.data = tavilyData.results.map(r => ({
          title: r.title,
          description: r.content || r.snippet || 'No description',
          url: r.url
        }));
        console.log(`✅ Found ${newsData.data.length} news from Tavily`);
      } else {
        return res.status(200).send("No forex news found from both sources.");
      }
    }

    // Step 2: Analyze news with OpenAI
    const articles = newsData.data.slice(0, 5);
      const summaryPrompt = `CRITICAL: Before generating signals, you MUST search the web for current forex prices.

STEP 1: Search for "EUR/USD current price", "GBP/USD current price", "USD/JPY current price" to get TODAY's real-time market prices.

STEP 2: Based on the news below and the current prices you found from web search, create detailed forex trading signals.

News to analyze:
${articles.map(a => `Title: ${a.title}\nDescription: ${a.description || 'No description'}`).join('\n\n')}

For EACH signal, you MUST include:
- Currency Pair (e.g., EUR/USD)
- Signal Type: BUY or SELL
- Entry Price (use the REAL current price from your web search)
- Stop Loss (specific price level with pip count)
- Take Profit 1 & TP2 (specific price levels with pip counts)
- Risk/Reward Ratio
- Brief reason (based on news impact)

Format your response like this:

🔔 SIGNAL #1
💱 Pair: EUR/USD
📊 Action: BUY
📍 Entry: 1.0876 (use real price from web search)
🛑 Stop Loss: 1.0846 (-30 pips)
🎯 TP1: 1.0926 (+50 pips)
🎯 TP2: 1.0976 (+100 pips)
⚡ Risk/Reward: 1:2
📰 Reason: Strong USD weakness from news

IMPORTANT: You have web search enabled. USE IT to find current forex prices before generating signals!`;`;

    
    console.log("Sending to OpenAI...");

        // NEW: Use OpenAI Responses API with web search
    const openaiUrl = "https://api.openai.com/v1/responses";
    const aiResponse = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        input: summaryPrompt,
        tools: [{ type: "web_search_preview" }],
        tool_choice: "auto"
      })
    });
    
    const aiData = await aiResponse.json();
    console.log("OpenAI response:", JSON.stringify(aiData).substring(0, 300));

    // Extract signal from new response format
    let signalText = "No signal generated.";
    
    if (aiData.error) {
      console.error("OpenAI Error:", aiData.error);
      signalText = `❌ OpenAI Error: ${aiData.error.message || 'Unknown error'}`;
      } else if (aiData.output && aiData.output[0] && aiData.output[0].content && aiData.output[0].content[0]) {      signalText = aiData.output[0].content[0].text;
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
