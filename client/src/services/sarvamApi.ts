import axios from 'axios';
import type { TranscribeResponse, TranslateResponse, SmartRefineResult } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// ─── Transcribe audio (auto language detection) ────────────────────────────

export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');

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

// ─── Groq Smart Refine (deepseek-r1 thinking model) ──────────────────────

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
  }, { timeout: 45000 }); // thinking model takes longer
  return data;
}

// ─── Synthesize speech → play on specific output device ───────────────────

export async function synthesizeSpeech(
  text: string,
  languageCode: string,
  outputDeviceId = 'default'
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
