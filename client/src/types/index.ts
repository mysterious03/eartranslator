export interface EmotionData {
  detected: string;
  gender: 'female' | 'male';
  mood: 'angry' | 'calm' | 'disgust' | 'fear' | 'happy' | 'sad' | 'surprise' | 'neutral';
  confidence: number;
}

export interface MeshNode {
  id: string;
  name: string;
  distance: string;
  rssi: number;
  battery: number;
  status: 'online' | 'relay' | 'gateway';
}

export interface ConversationEntry {
  id: string;
  transcript: string;
  translation: string;
  sourceLang: string;
  sourceLangName: string;
  targetLang: string;
  targetLangName: string;
  confidence: number;
  timestamp: Date;
  audioBase64?: string;
  emotion?: EmotionData;
  isOffline?: boolean;
}

export type AppStatus =
  | 'idle'
  | 'recording'
  | 'detecting'
  | 'translating'
  | 'speaking'
  | 'done'
  | 'error';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  speaker: string;
}

export interface TranscribeResponse {
  transcript: string;
  detectedLanguage: string;
  confidence: number;
  lowConfidence: boolean;
  message?: string;
  emotion?: EmotionData;
}

export interface TranslateResponse {
  translation: string;
}

export interface ApiError {
  error: string;
  code: string;
}

export type Tone = 'formal' | 'casual' | 'emotional' | 'technical' | 'neutral';
export type RefineConfidence = 'high' | 'medium' | 'low';

export interface SmartRefineResult {
  refinedTranslation: string;
  thinking: string;
  contextNote: string;
  tone: Tone;
  confidence: RefineConfidence;
  originalKept: boolean;
}
