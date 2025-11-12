import fetch from "node-fetch";

export default async function handler(req, res) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const NEWS_API_KEY = process.env.NEWS_API_KEY;

  // Only accept POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(200).send('Telegram Webhook Active');
  }

  try {
    const { message } = req.body;
    
    if (!message || !message.text) {
      return res.status(200).send('OK');
    }

    const chatId = message.chat.id;
    const userMessage = message.text.trim().toUpperCase();

    console.log(`Received message from ${chatId}: ${userMessage}`);

    // Check if it's a currency pair request (e.g., EURUSD, GBPUSD)
    const currencyPairRegex = /^[A-Z]{6}$/; // Matches 6-letter currency pairs
    
    if (currencyPairRegex.test(userMessage)) {
      // Fetch forex news
      const newsUrl = `https://api.thenewsapi.com/v1/news/all?api_token=${NEWS_API_KEY}&language=en&search=forex ${userMessage}&limit=3`;
      const newsResponse = await fetch(newsUrl);
      const newsData = await newsResponse.json();

      let analysisPrompt;
      if (newsData.data && newsData.data.length > 0) {
        const articles = newsData.data.slice(0, 3);
        analysisPrompt = `Analyze these recent forex news articles about ${userMessage} and provide a trading signal (BUY, SELL, or NEUTRAL) with reasoning:\n\n${articles.map(a => `Title: ${a.title}\nDescription: ${a.description || 'No description'}`).join('\n\n')}`;
      } else {
        analysisPrompt = `Provide a technical analysis for ${userMessage} currency pair with a trading signal (BUY, SELL, or NEUTRAL) based on current market trends.`;
      }

      // Get OpenAI analysis
      const openaiUrl = "https://api.openai.com/v1/chat/completions";
      const aiResponse = await fetch(openaiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: "You are a professional forex trading analyst. Provide clear, concise trading signals with brief reasoning. Keep responses under 200 words."
          }, {
            role: "user",
            content: analysisPrompt
          }],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      const aiData = await aiResponse.json();
      let replyText = "📊 Analysis for " + userMessage + ":\n\n";

      if (aiData.choices && aiData.choices[0] && aiData.choices[0].message) {
        replyText += aiData.choices[0].message.content;
      } else {
        replyText += "❌ Unable to generate analysis. Please try again.";
      }

      // Send reply to Telegram
      await sendTelegramMessage(chatId, replyText, TELEGRAM_TOKEN);
      return res.status(200).send('OK');
    }

    // Handle /start command
    if (userMessage === '/START') {
      const welcomeText = `👋 Welcome to Forex Signal Bot!\n\nSend me a currency pair (e.g., EURUSD, GBPUSD) and I'll provide you with analysis and trading signals.\n\nExample: Type "EURUSD" to get EUR/USD analysis.`;
      await sendTelegramMessage(chatId, welcomeText, TELEGRAM_TOKEN);
      return res.status(200).send('OK');
    }

    // Default response for unrecognized messages
    const helpText = `Please send a 6-letter currency pair (e.g., EURUSD, GBPUSD, USDJPY) to get analysis.`;
    await sendTelegramMessage(chatId, helpText, TELEGRAM_TOKEN);
    return res.status(200).send('OK');

  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(200).send('OK'); // Always return 200 to Telegram
  }
}

async function sendTelegramMessage(chatId, text, token) {
  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown"
    })
  });
}
