import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { createError } from '../middleware/errorHandler';

const SARVAM_BASE_URL = 'https://api.sarvam.ai';
const REQUEST_TIMEOUT = 30000; // 30 seconds

function getSarvamKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key || key === 'your_sarvam_api_key_here') {
    throw createError(
      'Sarvam API key not configured. Please set SARVAM_API_KEY in server/.env and get a free key at https://dashboard.sarvam.ai',
      503,
      'API_KEY_MISSING'
    );
  }
  return key;
}

export function normalizeLanguageCode(code: string | undefined | null): string {
  if (!code) return 'en-IN';
  const clean = code.trim();
  if (clean === 'unknown') return 'en-IN';
  if (!clean.includes('-')) {
    if (clean === 'en') return 'en-IN';
    return `${clean}-IN`;
  }
  return clean;
}


function handleSarvamError(err: unknown, context: string): never {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const data = err.response?.data;

    if (status === 401 || status === 403) {
      throw createError(
        'Invalid Sarvam API key. Please check your SARVAM_API_KEY at https://dashboard.sarvam.ai',
        401,
        'API_KEY_INVALID'
      );
    }
    if (status === 429) {
      throw createError('Sarvam API rate limit exceeded. Please wait a moment and try again.', 429, 'RATE_LIMIT');
    }
    if (err.code === 'ECONNABORTED') {
      throw createError('Request to Sarvam AI timed out. Please try again.', 408, 'TIMEOUT');
    }

    const message = data?.message || data?.error || err.message;
    throw createError(`Sarvam AI ${context} failed: ${message}`, status || 500, 'SARVAM_ERROR');
  }
  throw err;
}

// ─── Speech-to-Text with Auto Language Detection ─────────────────────────────

export interface STTResult {
  transcript: string;
  detectedLanguage: string;   // e.g. "ta-IN"
  confidence: number;         // 0-1
}

export async function transcribeWithAutoDetect(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<STTResult> {
  const key = getSarvamKey();

  const formData = new FormData();
  formData.append('file', audioBuffer, {
    filename: 'audio.webm',
    contentType: mimeType,
  });
  formData.append('model', 'saaras:v3');
  formData.append('language_code', 'unknown'); // ← auto-detect
  formData.append('mode', 'transcribe');

  try {
    const response = await axios.post(`${SARVAM_BASE_URL}/speech-to-text`, formData, {
      headers: {
        ...formData.getHeaders(),
        'api-subscription-key': key,
      },
      timeout: REQUEST_TIMEOUT,
    });

    const { transcript, language_code, language_probability } = response.data;

    if (!transcript || transcript.trim() === '') {
      throw createError('No speech detected. Please speak clearly and try again.', 422, 'NO_SPEECH');
    }

    return {
      transcript: transcript.trim(),
      detectedLanguage: normalizeLanguageCode(language_code),
      confidence: typeof language_probability === 'number' ? language_probability : 1.0,
    };
  } catch (err) {
    if ((err as { code?: string }).code === 'NO_SPEECH') throw err;
    handleSarvamError(err, 'Speech-to-Text');
  }
}

// ─── Speech-to-Text + Translate in ONE call (for English target) ─────────────

export interface STTTranslateResult {
  transcript: string;
  translation: string;
  detectedLanguage: string;
  confidence: number;
}

export async function transcribeAndTranslate(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<STTTranslateResult> {
  const key = getSarvamKey();

  const formData = new FormData();
  formData.append('file', audioBuffer, {
    filename: 'audio.webm',
    contentType: mimeType,
  });
  formData.append('model', 'saaras:v3');
  formData.append('language_code', 'unknown');

  try {
    const response = await axios.post(`${SARVAM_BASE_URL}/speech-to-text-translate`, formData, {
      headers: {
        ...formData.getHeaders(),
        'api-subscription-key': key,
      },
      timeout: REQUEST_TIMEOUT,
    });

    const { transcript, translation, language_code, language_probability } = response.data;

    return {
      transcript: (transcript || '').trim(),
      translation: (translation || transcript || '').trim(),
      detectedLanguage: normalizeLanguageCode(language_code),
      confidence: typeof language_probability === 'number' ? language_probability : 1.0,
    };
  } catch (err) {
    handleSarvamError(err, 'Speech-to-Text-Translate');
  }
}

// ─── Text Translation ─────────────────────────────────────────────────────────

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const key = getSarvamKey();
  const src = normalizeLanguageCode(sourceLang);
  const tgt = normalizeLanguageCode(targetLang);

  try {
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
        timeout: REQUEST_TIMEOUT,
      }
    );

    return response.data.translated_text || text;
  } catch (err) {
    handleSarvamError(err, 'Translation');
  }
}

// ─── Text-to-Speech (Indian voices) ──────────────────────────────────────────

const LANGUAGE_SPEAKERS: Record<string, string> = {
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

export async function synthesizeSpeech(text: string, languageCode: string): Promise<Buffer> {
  const key = getSarvamKey();
  const normalized = normalizeLanguageCode(languageCode);
  const speaker = LANGUAGE_SPEAKERS[normalized] || 'manisha';

  try {
    const response = await axios.post(
      `${SARVAM_BASE_URL}/text-to-speech`,
      {
        inputs: [text],
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
        timeout: REQUEST_TIMEOUT,
      }
    );

    const base64Audio: string = response.data.audios?.[0];
    if (!base64Audio) {
      throw createError('No audio returned from Sarvam TTS', 500, 'TTS_NO_AUDIO');
    }

    return Buffer.from(base64Audio, 'base64');
  } catch (err) {
    if ((err as { code?: string }).code === 'TTS_NO_AUDIO') throw err;
    handleSarvamError(err, 'Text-to-Speech');
  }
}
