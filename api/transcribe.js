import axios from 'axios';
import FormData from 'form-data';
import busboy from 'busboy';

const SARVAM_BASE_URL = 'https://api.sarvam.ai';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

// Parse multipart/form-data and extract the audio file buffer
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    let fileBuffer = null;
    let mimeType = 'audio/webm';

    bb.on('file', (_fieldname, file, info) => {
      mimeType = info.mimeType || 'audio/webm';
      const chunks = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on('finish', () => {
      if (!fileBuffer) return reject(new Error('No audio file in request'));
      resolve({ buffer: fileBuffer, mimeType });
    });

    bb.on('error', reject);
    req.pipe(bb);
  });
}

export const config = {
  api: { bodyParser: false }, // Required for multipart
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sarvamKey = process.env.SARVAM_API_KEY;
  if (!sarvamKey) return res.status(503).json({ error: 'SARVAM_API_KEY not configured', code: 'API_KEY_MISSING' });

  try {
    const { buffer, mimeType } = await parseMultipart(req);

    const formData = new FormData();
    formData.append('file', buffer, {
      filename: 'audio.webm',
      contentType: mimeType,
    });
    formData.append('model', 'saaras:v3');
    formData.append('language_code', 'unknown'); // auto-detect
    formData.append('mode', 'transcribe');

    const response = await axios.post(`${SARVAM_BASE_URL}/speech-to-text`, formData, {
      headers: {
        ...formData.getHeaders(),
        'api-subscription-key': sarvamKey,
      },
      timeout: 30000,
    });

    const { transcript, language_code, language_probability } = response.data;

    if (!transcript || transcript.trim() === '') {
      return res.status(422).json({ error: 'No speech detected. Please speak clearly and try again.', code: 'NO_SPEECH' });
    }

    const confidence = typeof language_probability === 'number' ? language_probability : 1.0;

    res.json({
      transcript: transcript.trim(),
      detectedLanguage: normalizeLanguageCode(language_code),
      confidence,
      lowConfidence: confidence < 0.6,
      emotion: undefined,
      message: confidence < 0.6 ? 'Language detected with low confidence — try speaking more clearly' : undefined,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Transcription failed';
    res.status(status).json({ error: message, code: 'SARVAM_ERROR' });
  }
}
