import OpenAI from 'openai';

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
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured in environment variables');
      return res.status(500).json({ error: 'Server configuration error: OpenAI API key missing' });
    }

    // Parse request body
    const { message, model = 'gpt-3.5-turbo' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Initialize OpenAI client
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log(`Processing OpenAI request with model: ${model}, message length: ${message.length}`);

    // Make API call
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    // Extract response
    const aiResponse = response.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response received from OpenAI');
    }

    // Return success
    return res.status(200).json({
      success: true,
      reply: aiResponse,
      model: response.model,
      usage: response.usage
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);

    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Something went wrong with the AI service';

    if (error.response) {
      // OpenAI API error
      statusCode = error.response.status;
      errorMessage = error.response.data?.error?.message || 'OpenAI API error';
    } else if (error.message.includes('API key')) {
      errorMessage = 'OpenAI API key error. Please check server configuration.';
    } else if (error.message.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      errorMessage = 'Network timeout. Please try again.';
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}