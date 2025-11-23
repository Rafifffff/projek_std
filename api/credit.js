// Vercel Serverless function to proxy requests to Groq API
// This function reads the API key from process.env.GROQ_API_KEY
// and forwards the prompt to Groq, returning the raw response to the client.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY not set in environment');
    return res.status(500).json({ error: 'Server misconfiguration: API key not found' });
  }

  try {
    const body = req.body;
    // Basic validation
    if (!body || !body.prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body' });
    }

    // Forward request to Groq OpenAI-compatible endpoint
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: body.model || 'llama-3.3-70b-versatile',
        messages: body.messages || [{ role: 'user', content: body.prompt }],
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
        max_tokens: body.max_tokens || 1000
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error('Groq API error', data);
      return res.status(502).json({ error: 'Upstream Groq API error', details: data });
    }

    // Return upstream response as-is (client will parse JSON)
    res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
}
