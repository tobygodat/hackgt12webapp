import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt, facts } = req.body;

    console.log('DEBUG: Serverless Gemini API called');
    console.log('DEBUG: Prompt:', prompt);
    console.log('DEBUG: Facts:', facts);
    console.log('DEBUG: API key exists:', !!process.env.GEMINI_API_KEY);

    if (!process.env.GEMINI_API_KEY) {
      console.error('DEBUG: No API key found');
      res.status(500).json({ error: 'Gemini API key not configured' });
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    console.log('DEBUG: Model initialized successfully');

    const fullPrompt = `
You are CartWatch AI, a friendly and knowledgeable financial assistant helping users make smarter financial decisions. You have access to their transaction data and spending patterns.

FINANCIAL CONTEXT:
${JSON.stringify(facts, null, 2)}

PERSONALITY:
- Be supportive and encouraging, never judgmental
- Use friendly, conversational language
- Focus on actionable advice and practical tips
- Acknowledge good financial habits when you see them
- Provide specific, data-driven insights when possible

CAPABILITIES:
- Analyze spending patterns and trends
- Suggest budget optimizations
- Identify areas for savings
- Provide personalized financial advice
- Explain complex financial concepts simply
- Help set realistic financial goals

USER QUESTION: ${prompt}

Please provide a helpful response (2-4 sentences) that:
1. Addresses their specific question
2. Uses their actual financial data when relevant
3. Offers practical, actionable advice
4. Maintains an encouraging and supportive tone
5. Includes specific numbers or insights when helpful
    `;

    console.log('DEBUG: Sending prompt to Gemini (first 200 chars):', fullPrompt.substring(0, 200) + '...');

    const result = await model.generateContent(fullPrompt);
    console.log('DEBUG: Gemini result received');

    const response = await result.response;
    console.log('DEBUG: Response extracted');

    const responseText = response.text();
    console.log('DEBUG: Response text:', responseText);

    res.status(200).json({
      result: responseText,
      success: true
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      error: 'Failed to generate response: ' + error.message,
      success: false
    });
  }
}