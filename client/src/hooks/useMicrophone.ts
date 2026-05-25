import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// ── Voice Activity Detection config ─────────────────────────────────────────
const SILENCE_THRESHOLD = 8;        // RMS below this = silence (0-255) (Conservative for low-gain mics)
const SILENCE_DURATION_MS = 2200;   // auto-stop after 2.2s of silence (Prevents early cutoffs)
const MIN_RECORD_MS = 800;          // don't auto-stop before this

interface UseMicrophoneReturn {
  startRecording: (deviceId?: string) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  analyserNode: React.MutableRefObject<AnalyserNode | null>;
  isVADSilent: React.MutableRefObject<boolean>;
  silenceCountdownRef: React.MutableRefObject<number>; // 0-1 progress toward auto-stop
}

export function useMicrophone(onAutoStop?: () => void): UseMicrophoneReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserNode = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordStartRef = useRef<number>(0);
  const isVADSilent = useRef<boolean>(false);
  const silenceCountdownRef = useRef<number>(0); // 0 = talking, 1 = about to stop
  const vadRafRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);

  // Offline ASR variables
  const recognitionRef = useRef<any>(null);
  const speechTranscriptRef = useRef<string>('');

  const startOfflineSpeechRecognition = useCallback(() => {
    if (!SpeechRecognition) return;
    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'hi-IN'; // Default spoken language to Hindi for emergency capture
      
      speechTranscriptRef.current = '';
      rec.onresult = (e: any) => {
        const text = e.results[e.results.length - 1][0].transcript;
        if (text) {
          speechTranscriptRef.current = text.trim();
          useAppStore.setState({ currentTranscript: text.trim() });
        }
      };
      rec.onerror = (e: any) => {
        console.warn('[Offline Speech] Recognition error:', e.error);
      };
      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.warn('[Offline Speech] Failed to start:', err);
    }
  }, []);

  const stopOfflineSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  }, []);


  const { setStatus } = useAppStore();

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  function cleanupAudio() {
    cancelAnimationFrame(vadRafRef.current);
    if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    analyserNode.current = null;
    audioCtxRef.current = null;
    silenceStartRef.current = null;
    silenceCountdownRef.current = 0;
    isVADSilent.current = false;
  }

  // ── VAD loop using AnalyserNode ──────────────────────────────────────────
  function startVAD() {
    const analyser = analyserNode.current;
    if (!analyser) return;

    const dataArr = new Uint8Array(analyser.frequencyBinCount);

    function loop() {
      const activeAnalyser = analyserNode.current;
      if (!activeAnalyser) return;
      activeAnalyser.getByteTimeDomainData(dataArr);

      // RMS of waveform — 128 is silence midpoint in time domain
      let sumSq = 0;
      for (let i = 0; i < dataArr.length; i++) {
        const v = (dataArr[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / dataArr.length) * 255;

      const now = Date.now();
      const elapsed = now - recordStartRef.current;

      if (rms < SILENCE_THRESHOLD) {
        isVADSilent.current = true;
        if (silenceStartRef.current === null) {
          silenceStartRef.current = now;
        }
        const silenceDuration = now - silenceStartRef.current;
        silenceCountdownRef.current = Math.min(1, silenceDuration / SILENCE_DURATION_MS);

        // Auto-stop if enough silence AND minimum record time elapsed
        if (silenceDuration >= SILENCE_DURATION_MS && elapsed >= MIN_RECORD_MS) {
          cancelAnimationFrame(vadRafRef.current);
          onAutoStop?.();
          return;
        }
      } else {
        isVADSilent.current = false;
        silenceStartRef.current = null;
        silenceCountdownRef.current = 0;
      }

      vadRafRef.current = requestAnimationFrame(loop);
    }

    vadRafRef.current = requestAnimationFrame(loop);
  }

  const startRecording = useCallback(async (deviceId = 'default') => {
    try {
      cleanupAudio();
      chunksRef.current = [];

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Set up Web Audio graph for VAD + visualisation
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserNode.current = analyser;

      // Pick best MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      recordStartRef.current = Date.now();

      // Start offline speech recognition if offlineMode is active
      const { offlineMode } = useAppStore.getState();
      if (offlineMode) {
        startOfflineSpeechRecognition();
      }

      // Start VAD loop
      startVAD();

    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setStatus('error', 'Microphone permission denied — please allow access in Chrome and refresh.');
      } else if (error.name === 'NotFoundError') {
        setStatus('error', 'Selected microphone not found — please check your Bluetooth earbuds are connected.');
      } else if (error.name === 'OverconstrainedError') {
        setStatus('error', 'Could not access selected device — try selecting a different microphone.');
      } else {
        setStatus('error', `Microphone error: ${error.message}`);
      }
      throw err;
    }
  }, [onAutoStop, setStatus]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      cancelAnimationFrame(vadRafRef.current);
      silenceCountdownRef.current = 0;
      isVADSilent.current = false;

      // Stop offline ASR
      const { offlineMode } = useAppStore.getState();
      if (offlineMode) {
        stopOfflineSpeechRecognition();
        if (speechTranscriptRef.current) {
          useAppStore.setState({ currentTranscript: speechTranscriptRef.current });
        }
      }

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanupAudio();
        resolve(null);
        return;
      }

      resolveStopRef.current = resolve;

      recorder.onstop = () => {
        cleanupAudio();

        if (chunksRef.current.length === 0) {
          resolve(null);
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  return { startRecording, stopRecording, analyserNode, isVADSilent, silenceCountdownRef };
}
