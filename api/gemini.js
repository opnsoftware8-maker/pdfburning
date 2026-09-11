// api/gemini.js
export default async function handler(req, res) {
  // ตั้งค่า CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
    }

    // รายการโมเดลที่เสถียรและพร้อมใช้งานตามลำดับความสำคัญ
    const candidateModels = [
      req.body?.model,
      'gemini-3-flash-preview',
      'gemini-3.5-flash',
      'gemini-3.8-flash'
    ].filter(Boolean);

    const { model, ...payload } = req.body || {};

    let lastError = null;
    for (const currentModel of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return res.status(200).json(data);
        } else {
          lastError = data?.error || { message: `Model ${currentModel} returned status ${response.status}` };
          console.warn(`Model ${currentModel} failed:`, lastError);
        }
      } catch (err) {
        lastError = { message: err.message };
        console.warn(`Model ${currentModel} error:`, err);
      }
    }

    return res.status(502).json({ error: lastError || 'All models failed to respond' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
