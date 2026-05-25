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

const LANGUAGE_SPEAKERS = {
  'hi-IN': 'manisha',
  'ta-IN': 'anushka',
  'te-IN': 'vidya',
  'kn-IN': 'arya',
  'ml-IN': 'abhilash',
  'bn-IN': 'manisha',
  'gu-IN': 'manisha',
  'mr-IN': 'manisha',
  'pa-IN': 'manisha',
  'od-IN': 'manisha',
  'en-IN': 'anushka',
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = getSarvamKey(res);
  if (!key) return;

  try {
    const { text, languageCode } = req.body;

    if (!text?.trim())   return res.status(400).json({ error: 'Missing field: text', code: 'MISSING_TEXT' });
    if (!languageCode)   return res.status(400).json({ error: 'Missing field: languageCode', code: 'MISSING_LANG' });

    const normalized = normalizeLanguageCode(languageCode);
    const speaker = LANGUAGE_SPEAKERS[normalized] || 'manisha';

    const response = await axios.post(
      `${SARVAM_BASE_URL}/text-to-speech`,
      {
        inputs: [text.trim()],
        target_language_code: normalized,
        speaker,
        model: 'bulbul:v2',
        pace: 1.0,
        pitch: 0,
        loudness: 1.5,
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

    const base64Audio = response.data.audios?.[0];
    if (!base64Audio) return res.status(500).json({ error: 'No audio returned', code: 'TTS_NO_AUDIO' });

    const audioBuffer = Buffer.from(base64Audio, 'base64');
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(audioBuffer);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'TTS failed';
    res.status(status).json({ error: message, code: 'SARVAM_ERROR' });
  }
}
