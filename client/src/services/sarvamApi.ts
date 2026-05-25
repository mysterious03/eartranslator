import axios from 'axios';
import type { TranscribeResponse, TranslateResponse, SmartRefineResult } from '../types';

// baseURL is empty — all paths are absolute from site root e.g. /api/transcribe
const api = axios.create({
  baseURL: '',
  timeout: 30000,
});

// ─── Transcribe audio (auto language detection) ────────────────────────────

export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm'); // field name must be 'file'

  const { data } = await api.post<TranscribeResponse>('/api/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

// ─── Translate text ────────────────────────────────────────────────────────

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslateResponse> {
  const { data } = await api.post<TranslateResponse>('/api/translate', {
    text,
    sourceLang,
    targetLang,
  });
  return data;
}

// ─── Groq Smart Refine (llama-3.3-70b) ───────────────────────────────────

export async function refineTranslation(
  originalText: string,
  sarvamTranslation: string,
  sourceLang: string,
  targetLang: string,
  emotion?: { mood: string; gender: string; confidence: number }
): Promise<SmartRefineResult> {
  const { data } = await api.post<SmartRefineResult>('/api/refine', {
    originalText,
    sarvamTranslation,
    sourceLang,
    targetLang,
    emotion,
  }, { timeout: 45000 });
  return data;
}

// ─── Synthesize speech → play on specific output device ───────────────────

export async function synthesizeSpeech(
  text: string,
  languageCode: string
): Promise<string> {
  const response = await api.post(
    '/api/speak',
    { text, languageCode },
    { responseType: 'blob' }
  );
  const blob = new Blob([response.data], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

/**
 * Play audio on a specific output device (e.g. Bluetooth earbuds).
 * Uses HTMLMediaElement.setSinkId() — Chrome only.
 */
export async function playAudioOnDevice(
  audioUrl: string,
  outputDeviceId = 'default'
): Promise<void> {
  const audio = new Audio(audioUrl);

  // Route to selected output device if supported
  if (outputDeviceId !== 'default' && typeof (audio as any).setSinkId === 'function') {
    try {
      await (audio as any).setSinkId(outputDeviceId);
    } catch (err) {
      console.warn('setSinkId failed, using default output:', err);
    }
  }

  return new Promise<void>((resolve) => {
    audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(audioUrl); resolve(); };
    audio.play().catch(() => resolve());
  });
}

// ─── Health check ──────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{
  status: string;
  sarvamKeyConfigured: boolean;
  groqKeyConfigured: boolean;
}> {
  const { data } = await api.get('/api/health');
  return data;
}
