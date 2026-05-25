export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    status: 'ok',
    sarvamKeyConfigured: !!process.env.SARVAM_API_KEY,
    groqKeyConfigured: !!process.env.GROQ_API_KEY,
  });
}
