// /api/status.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if API keys are configured
  const openaiKey = !!process.env.OPENAI_API_KEY;
  const deepseekKey = !!process.env.DEEPSEEK_API_KEY;
  const geminiKey = !!process.env.GEMINI_API_KEY;

  const allKeysConfigured = openaiKey && deepseekKey && geminiKey;

  return res.status(200).json({
    success: true,
    available: allKeysConfigured,
    message: allKeysConfigured 
      ? 'All AI services are configured and ready' 
      : 'Some API keys are missing. Please configure them in Vercel environment variables.',
    services: {
      chatgpt: openaiKey ? 'configured' : 'missing',
      deepseek: deepseekKey ? 'configured' : 'missing',
      gemini: geminiKey ? 'configured' : 'missing'
    }
  });
}
