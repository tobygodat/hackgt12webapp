// Example serverless function for secure Gemini integration
// This can be deployed to Vercel, Netlify, or Google Cloud Functions

import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // CORS headers for browser requests
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

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'Gemini API key not configured' });
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const fullPrompt = `
You are a financial advisor helping users understand their spending patterns and financial decisions.

Context: ${JSON.stringify(facts, null, 2)}

User Request: ${prompt}

Please provide a helpful, concise response (2-3 sentences) that explains the financial implications in friendly, accessible language. Focus on actionable insights.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;

    res.status(200).json({
      result: response.text(),
      success: true
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      success: false
    });
  }
}

// Alternative Express.js example
/*
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt, facts } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const fullPrompt = `
You are a financial advisor helping users understand their spending patterns and financial decisions.

Context: ${JSON.stringify(facts, null, 2)}

User Request: ${prompt}

Please provide a helpful, concise response (2-3 sentences) that explains the financial implications in friendly, accessible language. Focus on actionable insights.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;

    res.json({
      result: response.text(),
      success: true
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      success: false
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Gemini API server running on port ${PORT}`);
});
*/