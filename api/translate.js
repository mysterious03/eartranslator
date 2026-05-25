import axios from 'axios';

const SARVAM_BASE_URL = 'https://api.sarvam.ai';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getSarvamKey(res) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'SARVAM_API_KEY not configured', code: 'API_KEY_MISSING' });
    return null;
  }
  return key;
}

function normalizeLanguageCode(code) {
  if (!code) return 'en-IN';
  const clean = code.trim();
  if (clean === 'unknown') return 'en-IN';
  if (!clean.includes('-')) {
    if (clean === 'en') return 'en-IN';
    return `${clean}-IN`;
  }
  return clean;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = getSarvamKey(res);
  if (!key) return;

  try {
    const { text, sourceLang, targetLang } = req.body;

    if (!text?.trim()) return res.status(400).json({ error: 'Missing field: text', code: 'MISSING_TEXT' });
    if (!sourceLang)   return res.status(400).json({ error: 'Missing field: sourceLang', code: 'MISSING_SOURCE_LANG' });
    if (!targetLang)   return res.status(400).json({ error: 'Missing field: targetLang', code: 'MISSING_TARGET_LANG' });

    const src = normalizeLanguageCode(sourceLang);
    const tgt = normalizeLanguageCode(targetLang);

    if (src === tgt) return res.json({ translation: text });

    const response = await axios.post(
      `${SARVAM_BASE_URL}/translate`,
      {
        input: text,
        source_language_code: src,
        target_language_code: tgt,
        mode: 'formal',
        enable_preprocessing: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': key,
        },
        timeout: 30000,
      }
    );

    res.json({ translation: response.data.translated_text || text });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Translation failed';
    res.status(status).json({ error: message, code: 'SARVAM_ERROR' });
  }
}
