import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function analyzeWithGemini(prompt, facts) {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      console.warn("Gemini API key not found. Using fallback responses.");
      return getFallbackResponse(prompt);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const fullPrompt = `
You are a financial advisor helping users understand their spending patterns and financial decisions.

Context: ${JSON.stringify(facts, null, 2)}

User Request: ${prompt}

Please provide a helpful, concise response (2-3 sentences) that explains the financial implications in friendly, accessible language. Focus on actionable insights.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("Gemini API error:", error);
    return getFallbackResponse(prompt);
  }
}

function getFallbackResponse(prompt) {
  const fallbacks = {
    tradeoffs: "This purchase will impact your monthly cash flow. Consider if there are similar items at a lower price point, or if you can delay this purchase until next month.",
    substitutes: "Look for alternatives like generic brands, used items, or subscription services instead of one-time purchases. Small changes can add up to significant savings.",
    insights: "Your spending patterns show opportunities for optimization. Focus on your largest expense categories first for the biggest impact on your financial health.",
    default: "Your financial data suggests careful consideration of this decision. Every purchase is an opportunity to align your spending with your long-term goals."
  };

  const promptLower = prompt.toLowerCase();
  if (promptLower.includes("tradeoff")) return fallbacks.tradeoffs;
  if (promptLower.includes("substitute")) return fallbacks.substitutes;
  if (promptLower.includes("insight")) return fallbacks.insights;
  return fallbacks.default;
}

// Optional: Serverless API example for secure Gemini integration
export async function analyzeWithGeminiAPI(prompt, facts) {
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, facts }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Gemini API proxy error:", error);
    return getFallbackResponse(prompt);
  }
}