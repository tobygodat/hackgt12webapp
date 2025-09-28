import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function analyzeWithGemini(prompt, facts, conversationHistory = []) {
  try {
    console.log("DEBUG: Gemini API called with prompt:", prompt);
    console.log("DEBUG: API key exists:", !!import.meta.env.VITE_GEMINI_API_KEY);
    console.log("DEBUG: Facts data:", facts);
    console.log("DEBUG: Conversation history:", conversationHistory);

    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      console.warn("Gemini API key not found. Using fallback responses.");
      return getFallbackResponse(prompt);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    console.log("DEBUG: Model initialized successfully");

    // Format conversation history for context
    const conversationContext = conversationHistory.length > 0
      ? `\n\nCONVERSATION HISTORY:\n${conversationHistory.map(msg =>
          `${msg.role.toUpperCase()}: ${msg.content}`
        ).join('\n')}\n`
      : '';

    const fullPrompt = `
You are CartWatch AI, a friendly and knowledgeable financial assistant helping users make smarter financial decisions. You have access to their transaction data and spending patterns. Never use Markdown in your response.

FINANCIAL CONTEXT:
${JSON.stringify(facts, null, 2)}
${conversationContext}
PERSONALITY:
- Be supportive and encouraging, never judgmental
- Use friendly, conversational language
- Focus on actionable advice and practical tips
- Acknowledge good financial habits when you see them
- Provide specific, data-driven insights when possible
- Reference previous conversation when relevant
- Maintain context from earlier messages

CAPABILITIES:
- Analyze spending patterns and trends
- Suggest budget optimizations
- Identify areas for savings
- Provide personalized financial advice
- Explain complex financial concepts simply
- Help set realistic financial goals
- Continue conversations naturally

CURRENT USER QUESTION: ${prompt}

Please provide a helpful response (2-4 sentences) that:
1. Addresses their current question while considering previous conversation
2. Uses their actual financial data when relevant
3. Offers practical, actionable advice
4. Maintains an encouraging and supportive tone
5. Includes specific numbers or insights when helpful
6. References previous topics discussed if relevant
    `;

    console.log("DEBUG: Sending prompt to Gemini:", fullPrompt.substring(0, 200) + "...");

    const result = await model.generateContent(fullPrompt);
    console.log("DEBUG: Gemini result received:", result);

    const response = await result.response;
    console.log("DEBUG: Gemini response:", response);

    const responseText = response.text();
    console.log("DEBUG: Final response text:", responseText);

    return responseText;

  } catch (error) {
    console.error("Gemini API error:", error);
    console.error("Error details:", error.message, error.stack);
    return getFallbackResponse(prompt);
  }
}

function getFallbackResponse(prompt) {
  console.log("DEBUG: Using fallback response for prompt:", prompt);

  const promptLower = prompt.toLowerCase();

  // More specific responses based on common financial questions
  if (promptLower.includes("spend") || promptLower.includes("spent")) {
    return "I'm having trouble accessing the Gemini AI service right now, but I can see you're asking about your spending. Check your Insights page for detailed spending breakdowns by category and month.";
  }

  if (promptLower.includes("budget") || promptLower.includes("save")) {
    return "While I can't connect to AI services at the moment, here are some quick budgeting tips: Track your largest expense categories, set spending limits for discretionary purchases, and try the 50/30/20 rule (needs/wants/savings).";
  }

  if (promptLower.includes("category") || promptLower.includes("categories")) {
    return "I'm currently unable to analyze your spending categories through AI, but you can view your top spending categories in the Insights tab's pie chart to see where most of your money goes.";
  }

  if (promptLower.includes("tip") || promptLower.includes("advice")) {
    return "Here's some general financial advice while AI services are unavailable: Review your subscriptions monthly, compare prices before major purchases, and consider using the envelope method for discretionary spending.";
  }

  return "I'm having trouble connecting to the AI service right now. Please check that your Gemini API key is properly configured, or try again in a few moments. In the meantime, check your Insights page for spending analysis!";
}

// Optional: Serverless API example for secure Gemini integration
export async function analyzeWithGeminiAPI(prompt, facts) {
  try {
    console.log("DEBUG: Attempting serverless API call to /api/gemini");
    console.log("DEBUG: Prompt:", prompt);
    console.log("DEBUG: Facts:", facts);

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, facts }),
    });

    console.log("DEBUG: Fetch response status:", response.status);
    console.log("DEBUG: Fetch response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DEBUG: Server response error:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("DEBUG: Server response data:", data);
    return data.result;
  } catch (error) {
    console.error("Gemini API proxy error:", error);
    console.error("DEBUG: Falling back to client fallback response");
    return getFallbackResponse(prompt);
  }
}