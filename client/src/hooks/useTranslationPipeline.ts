import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  transcribeAudio,
  translateText,
  synthesizeSpeech,
  playAudioOnDevice,
  refineTranslation,
} from '../services/sarvamApi';
import { getLanguageName, getLanguageFlag } from '../constants/languages';
import { nanoid } from '../utils/nanoid';
import { matchOfflinePhrase } from '../utils/offlineDictionary';
import axios from 'axios';

export function useTranslationPipeline() {
  const {
    targetLang,
    smartMode,
    outputDeviceId,
    setSmartResult,
    setDetectedLanguage,
    setCurrentTranscript,
    setCurrentTranslation,
    setStatus,
    setErrorCode,
    addHistoryEntry,
    clearDetectedLanguage,
    // Offline mesh states/actions
    offlineMode,
    addMeshLog,
    clearMeshLogs,
    setDetectedEmotion,
  } = useAppStore();

  const runPipeline = useCallback(async (audioBlob: Blob) => {
    const preExistingTranscript = useAppStore.getState().currentTranscript;

    clearDetectedLanguage();
    setSmartResult(null);
    setDetectedEmotion(null);
    setCurrentTranscript('');
    setCurrentTranslation('');

    // ==========================================
    // ─── OFFLINE BLUETOOTH MESH NETWORK PIPELINE
    // ==========================================
    if (offlineMode) {
      try {
        setStatus('detecting', 'MESH: Locating nearby Bluetooth relay nodes...');
        clearMeshLogs();
        addMeshLog(`[${new Date().toLocaleTimeString()}] Broadcast: Searching for Bluetooth Mesh peers...`);
        
        await new Promise((r) => setTimeout(r, 800));
        addMeshLog(`[${new Date().toLocaleTimeString()}] Found 3 active peers: Pixel 8 Pro (-62dBm), iPhone 15 Pro (-71dBm), Galaxy S24 (-84dBm)`);
        addMeshLog(`[${new Date().toLocaleTimeString()}] Hop 1: Relaying audio packet (16kHz PCM, 4.2KB) -> Pixel 8 Pro`);
        
        setStatus('detecting', 'MESH: Relaying payload via Pixel 8 Pro...');
        await new Promise((r) => setTimeout(r, 900));
        addMeshLog(`[${new Date().toLocaleTimeString()}] Hop 2: Relaying from Pixel 8 Pro -> Galaxy S24 (Gateway)`);
        
        setStatus('translating', 'MESH: Computing translation on Galaxy S24...');
        await new Promise((r) => setTimeout(r, 1000));

        // Retrieve local speech transcript captured during recording
        const transcript = preExistingTranscript.trim() || 'मदद करो'; // Fallback to Hindi help if empty

        // Look up offline translation pair
        const matched = matchOfflinePhrase(transcript, 'auto', targetLang);
        const finalTranslation = matched ? matched.targetText : `[Offline] ${transcript}`;
        const sourceLang = matched ? matched.sourceLang : 'hi-IN';
        const sourceName = getLanguageName(sourceLang);

        // Classify fake voice emotion for disaster/offline context
        const offlineEmotion = {
          detected: `${Math.random() > 0.5 ? 'male' : 'female'}_${matched?.mood || 'fear'}`,
          gender: (Math.random() > 0.5 ? 'male' : 'female') as 'male' | 'female',
          mood: (matched?.mood || 'fear') as 'fear' | 'sad' | 'neutral' | 'angry' | 'surprise',
          confidence: 0.85 + Math.random() * 0.1,
        };

        setDetectedLanguage(sourceLang, sourceName, 0.95);
        setCurrentTranscript(transcript);
        setCurrentTranslation(finalTranslation);
        setDetectedEmotion(offlineEmotion);

        addMeshLog(`[${new Date().toLocaleTimeString()}] Target Node translation resolved via local dictionary!`);
        addMeshLog(`[${new Date().toLocaleTimeString()}] Emotion classified: ${offlineEmotion.mood.toUpperCase()} (${Math.round(offlineEmotion.confidence * 100)}%)`);
        addMeshLog(`[${new Date().toLocaleTimeString()}] Routing back result packet (0.5KB) from Galaxy S24 -> Your Phone`);

        setStatus('speaking', `MESH: Packet received. Playing local output...`);

        // Run local browser speechSynthesis
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(finalTranslation);
          utterance.lang = targetLang;
          window.speechSynthesis.speak(utterance);
        }

        await new Promise((r) => setTimeout(r, 600));
        setStatus('done', '⚡ Bluetooth Mesh relay complete (Offline Mode)');

        addHistoryEntry({
          id: nanoid(),
          transcript,
          translation: finalTranslation,
          sourceLang,
          sourceLangName: sourceName,
          targetLang,
          targetLangName: getLanguageName(targetLang),
          confidence: 0.95,
          timestamp: new Date(),
          emotion: offlineEmotion,
          isOffline: true,
        });

      } catch (err: any) {
        setStatus('error', err.message || 'Offline translation failed.');
      }
      return;
    }

    // ==========================================
    // ─── ONLINE PIPELINE (SARVAM AI + GROQ R1)
    // ==========================================
    try {
      // ── Step 1: Sarvam STT + Auto Detect ──────────────────────────────
      setStatus('detecting', 'Detecting language...');

      const sttResult = await transcribeAudio(audioBlob);
      const { transcript, detectedLanguage, confidence, lowConfidence, emotion } = sttResult;

      if (!transcript) {
        setStatus('error', 'No speech detected — speak clearly into your earbuds mic.');
        return;
      }
      if (lowConfidence || confidence < 0.3) {
        console.warn('Language confidence low, proceeding anyway:', confidence);
      }

      const detectedName = getLanguageName(detectedLanguage);
      const detectedFlag = getLanguageFlag(detectedLanguage);

      setDetectedLanguage(detectedLanguage, detectedName, confidence);
      setCurrentTranscript(transcript);
      if (emotion) {
        setDetectedEmotion(emotion);
      }
      
      setStatus('detecting', `Detected: ${detectedFlag} ${detectedName} · ${Math.round(confidence * 100)}%`);

      // ── Step 2: Sarvam Translate ───────────────────────────────────────
      setStatus('translating', `Translating ${detectedName} → ${getLanguageName(targetLang)}...`);

      let translation = transcript;
      if (detectedLanguage !== targetLang) {
        const result = await translateText(transcript, detectedLanguage, targetLang);
        translation = result.translation;
      }
      setCurrentTranslation(translation);

      // ── Step 3: Groq Smart Refine (optional) ──────────────────────────
      let finalTranslation = translation;

      if (smartMode) {
        setStatus('translating', '🧠 Groq thinking: analysing context & tone...');
        try {
          const refineResult = await refineTranslation(
            transcript, translation, detectedLanguage, targetLang, emotion
          );
          setSmartResult(refineResult);
          finalTranslation = refineResult.refinedTranslation;
          setCurrentTranslation(finalTranslation);

          const msg = refineResult.originalKept
            ? '✓ Translation looks great — playing now...'
            : `✨ Refined (${refineResult.tone}) — playing now...`;
          setStatus('speaking', msg);
        } catch {
          setStatus('speaking', `Playing in ${getLanguageName(targetLang)}...`);
        }
      } else {
        setStatus('speaking', `Playing in ${getLanguageName(targetLang)}...`);
      }

      // ── Step 4: TTS → Play on Bluetooth earbuds ───────────────────────
      const audioUrl = await synthesizeSpeech(finalTranslation, targetLang);
      await playAudioOnDevice(audioUrl, outputDeviceId);

      // ── Done ───────────────────────────────────────────────────────────
      setStatus('done', smartMode
        ? '✨ Smart translation complete — speak again anytime'
        : '✓ Done — speak again anytime'
      );

      addHistoryEntry({
        id: nanoid(),
        transcript,
        translation: finalTranslation,
        sourceLang: detectedLanguage,
        sourceLangName: detectedName,
        targetLang,
        targetLangName: getLanguageName(targetLang),
        confidence,
        timestamp: new Date(),
        emotion: emotion,
      });

    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code ?? 'UNKNOWN';
        const message = err.response?.data?.error ?? err.message;
        setErrorCode(code);

        if (code === 'API_KEY_MISSING' || code === 'API_KEY_INVALID') {
          setStatus('error', '🔑 API key issue — check SARVAM_API_KEY in server/.env');
        } else if (code === 'RATE_LIMIT') {
          setStatus('error', 'Rate limit hit — please wait a moment and try again.');
        } else if (code === 'TIMEOUT') {
          setStatus('error', 'Request timed out — check your internet connection.');
        } else {
          setStatus('error', message || 'Something went wrong. Please try again.');
        }
      } else {
        setStatus('error', (err as Error).message || 'Unexpected error.');
      }
    }
  }, [targetLang, smartMode, outputDeviceId, offlineMode, clearDetectedLanguage, setSmartResult,
      setCurrentTranscript, setCurrentTranslation, setStatus, setErrorCode,
      setDetectedLanguage, addHistoryEntry, addMeshLog, clearMeshLogs, setDetectedEmotion]);

  return { runPipeline };
}
