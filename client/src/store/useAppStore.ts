import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppStatus, ConversationEntry, SmartRefineResult, EmotionData, MeshNode } from '../types';

interface AppState {
  // Target language (the one the user wants to translate INTO)
  targetLang: string;
  setTargetLang: (lang: string) => void;

  // Smart Mode toggle — uses Groq deepseek-r1 for reasoning
  smartMode: boolean;
  setSmartMode: (v: boolean) => void;

  // Groq refinement result for current session
  smartResult: SmartRefineResult | null;
  setSmartResult: (r: SmartRefineResult | null) => void;

  // Selected audio output device ID (for Bluetooth earbuds)
  outputDeviceId: string;
  setOutputDeviceId: (id: string) => void;

  // Recording state
  isRecording: boolean;
  setIsRecording: (v: boolean) => void;

  // Auto-detected source language
  detectedLanguage: string | null;
  detectedLanguageName: string | null;
  detectedConfidence: number | null;
  setDetectedLanguage: (code: string, name: string, confidence: number) => void;
  clearDetectedLanguage: () => void;

  // Current session texts
  currentTranscript: string;
  setCurrentTranscript: (t: string) => void;

  currentTranslation: string;
  setCurrentTranslation: (t: string) => void;

  // Pipeline status
  status: AppStatus;
  statusMessage: string;
  setStatus: (s: AppStatus, msg: string) => void;

  // Error detail for display
  errorCode: string | null;
  setErrorCode: (code: string | null) => void;

  // Conversation history (persisted)
  history: ConversationEntry[];
  addHistoryEntry: (e: ConversationEntry) => void;
  clearHistory: () => void;

  // API key health
  apiKeyOk: boolean | null;
  setApiKeyOk: (ok: boolean) => void;

  // Offline Mesh mode states
  offlineMode: boolean;
  setOfflineMode: (active: boolean) => void;
  detectedEmotion: EmotionData | null;
  setDetectedEmotion: (emotion: EmotionData | null) => void;
  meshNodes: MeshNode[];
  meshLogs: string[];
  addMeshLog: (log: string) => void;
  clearMeshLogs: () => void;
}

const INITIAL_MESH_NODES: MeshNode[] = [
  { id: 'node-self', name: 'Your Phone (Local)', distance: '0m', rssi: 0, battery: 94, status: 'online' },
  { id: 'node-pixel', name: 'Pixel 8 Pro (Relay)', distance: '1.8m', rssi: -62, battery: 78, status: 'relay' },
  { id: 'node-iphone', name: 'iPhone 15 Pro (Relay)', distance: '3.4m', rssi: -71, battery: 85, status: 'relay' },
  { id: 'node-galaxy', name: 'Galaxy S24 (Gateway)', distance: '5.2m', rssi: -84, battery: 61, status: 'gateway' },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      targetLang: 'ta-IN',
      setTargetLang: (lang) => set({ targetLang: lang }),

      smartMode: true,
      setSmartMode: (v) => set({ smartMode: v }),

      smartResult: null,
      setSmartResult: (r) => set({ smartResult: r }),

      outputDeviceId: 'default',
      setOutputDeviceId: (id) => set({ outputDeviceId: id }),

      isRecording: false,
      setIsRecording: (v) => set({ isRecording: v }),

      detectedLanguage: null,
      detectedLanguageName: null,
      detectedConfidence: null,
      setDetectedLanguage: (code, name, confidence) =>
        set({ detectedLanguage: code, detectedLanguageName: name, detectedConfidence: confidence }),
      clearDetectedLanguage: () =>
        set({ detectedLanguage: null, detectedLanguageName: null, detectedConfidence: null }),

      currentTranscript: '',
      setCurrentTranscript: (t) => set({ currentTranscript: t }),

      currentTranslation: '',
      setCurrentTranslation: (t) => set({ currentTranslation: t }),

      status: 'idle',
      statusMessage: 'Click the mic to start speaking',
      setStatus: (s, msg) => set({ status: s, statusMessage: msg }),

      errorCode: null,
      setErrorCode: (code) => set({ errorCode: code }),

      history: [],
      addHistoryEntry: (e) =>
        set((state) => ({ history: [e, ...state.history].slice(0, 50) })),
      clearHistory: () => set({ history: [] }),

      apiKeyOk: null,
      setApiKeyOk: (ok) => set({ apiKeyOk: ok }),

      // Offline defaults
      offlineMode: false,
      setOfflineMode: (active) => set({ offlineMode: active }),
      detectedEmotion: null,
      setDetectedEmotion: (emotion) => set({ detectedEmotion: emotion }),
      meshNodes: INITIAL_MESH_NODES,
      meshLogs: [],
      addMeshLog: (log) => set((state) => ({ meshLogs: [...state.meshLogs, log].slice(-100) })),
      clearMeshLogs: () => set({ meshLogs: [] }),
    }),
    {
      name: 'eartranslate-storage',
      partialize: (state) => ({
        targetLang: state.targetLang,
        history: state.history,
        smartMode: state.smartMode,
        outputDeviceId: state.outputDeviceId,
        offlineMode: state.offlineMode,
      }),
    }
  )
);
