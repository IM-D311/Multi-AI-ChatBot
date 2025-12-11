import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('Gemini API key is not configured in environment variables');
      return res.status(500).json({ error: 'Server configuration error: Gemini API key missing' });
    }

    // Parse request body
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });

    console.log(`Processing Gemini request, message length: ${message.length}`);

    // Make API call
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are Gemini, a multimodal AI assistant specialized in visual understanding, creative tasks, and comprehensive explanations. Provide detailed, engaging, and helpful responses.

User question: ${message}`
            }
          ]
        }
      ]
    });

    // Extract response
    const response = await result.response;
    const aiResponse = response.text();

    if (!aiResponse) {
      throw new Error('No response received from Gemini');
    }

    // Return success
    return res.status(200).json({
      success: true,
      reply: aiResponse,
      model: 'gemini-pro'
    });

  } catch (error) {
    console.error('Gemini API Error:', error);

    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Something went wrong with Gemini AI service';

    if (error.status) {
      statusCode = error.status;
      errorMessage = error.message || 'Gemini API error';
    } else if (error.message.includes('API key')) {
      errorMessage = 'Gemini API key error. Please check server configuration.';
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      statusCode = 429;
      errorMessage = 'API quota exceeded. Please try again later.';
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}