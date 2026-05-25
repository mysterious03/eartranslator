export interface OfflineTranslation {
  sourceLang: string;
  sourceText: string;
  targetLang: string;
  targetText: string;
  mood: 'fear' | 'sad' | 'neutral' | 'angry' | 'surprise';
}

// Simple local translation dictionary for emergency phrases
export const OFFLINE_DICTIONARY: OfflineTranslation[] = [
  // --- HINDI TO ENGLISH ---
  { sourceLang: 'hi-IN', sourceText: 'मदद करो', targetLang: 'en-IN', targetText: 'Help me', mood: 'fear' },
  { sourceLang: 'hi-IN', sourceText: 'बचाओ', targetLang: 'en-IN', targetText: 'Rescue me', mood: 'fear' },
  { sourceLang: 'hi-IN', sourceText: 'मुझे मदद चाहिए', targetLang: 'en-IN', targetText: 'I need help', mood: 'fear' },
  { sourceLang: 'hi-IN', sourceText: 'मुझे पानी चाहिए', targetLang: 'en-IN', targetText: 'I need water', mood: 'sad' },
  { sourceLang: 'hi-IN', sourceText: 'पानी चाहिए', targetLang: 'en-IN', targetText: 'Need water', mood: 'sad' },
  { sourceLang: 'hi-IN', sourceText: 'यहाँ कोई है', targetLang: 'en-IN', targetText: 'Is anyone here?', mood: 'surprise' },
  { sourceLang: 'hi-IN', sourceText: 'रास्ता कहाँ है', targetLang: 'en-IN', targetText: 'Where is the way?', mood: 'neutral' },
  { sourceLang: 'hi-IN', sourceText: 'डॉक्टर को बुलाओ', targetLang: 'en-IN', targetText: 'Call a doctor', mood: 'fear' },
  { sourceLang: 'hi-IN', sourceText: 'मैं चोटिल हूँ', targetLang: 'en-IN', targetText: 'I am hurt', mood: 'sad' },
  { sourceLang: 'hi-IN', sourceText: 'आग लगी है', targetLang: 'en-IN', targetText: 'There is a fire', mood: 'angry' },

  // --- TAMIL TO ENGLISH ---
  { sourceLang: 'ta-IN', sourceText: 'உதவி வேண்டும்', targetLang: 'en-IN', targetText: 'I need help', mood: 'fear' },
  { sourceLang: 'ta-IN', sourceText: 'காப்பாத்துங்க', targetLang: 'en-IN', targetText: 'Rescue me / Help me', mood: 'fear' },
  { sourceLang: 'ta-IN', sourceText: 'தண்ணீர் வேண்டும்', targetLang: 'en-IN', targetText: 'I need water', mood: 'sad' },
  { sourceLang: 'ta-IN', sourceText: 'தண்ணி வேணும்', targetLang: 'en-IN', targetText: 'I need water', mood: 'sad' },
  { sourceLang: 'ta-IN', sourceText: 'யாராவது இருக்கீங்களா', targetLang: 'en-IN', targetText: 'Is anyone here?', mood: 'surprise' },
  { sourceLang: 'ta-IN', sourceText: 'வழி எங்கே', targetLang: 'en-IN', targetText: 'Where is the path/way?', mood: 'neutral' },
  { sourceLang: 'ta-IN', sourceText: 'டாக்டரை கூப்பிடுங்க', targetLang: 'en-IN', targetText: 'Call a doctor', mood: 'fear' },
  { sourceLang: 'ta-IN', sourceText: 'எனக்கு அடிபட்டுள்ளது', targetLang: 'en-IN', targetText: 'I am hurt', mood: 'sad' },
  { sourceLang: 'ta-IN', sourceText: 'ஆபத்து', targetLang: 'en-IN', targetText: 'Danger', mood: 'fear' },

  // --- TELUGU TO ENGLISH ---
  { sourceLang: 'te-IN', sourceText: 'సహాయం చేయండి', targetLang: 'en-IN', targetText: 'Help me', mood: 'fear' },
  { sourceLang: 'te-IN', sourceText: 'మంచినీళ్లు కావాలి', targetLang: 'en-IN', targetText: 'I need water', mood: 'sad' },
  { sourceLang: 'te-IN', sourceText: 'ఎవరైనా ఉన్నారా', targetLang: 'en-IN', targetText: 'Is anyone here?', mood: 'surprise' },
  { sourceLang: 'te-IN', sourceText: 'వైద్యుడిని పిలవండి', targetLang: 'en-IN', targetText: 'Call a doctor', mood: 'fear' },
  { sourceLang: 'te-IN', sourceText: 'నాకు దెబ్బ తగిలింది', targetLang: 'en-IN', targetText: 'I am hurt', mood: 'sad' },

  // --- KANNADA TO ENGLISH ---
  { sourceLang: 'kn-IN', sourceText: 'ಸಹಾಯ ಮಾಡಿ', targetLang: 'en-IN', targetText: 'Help me', mood: 'fear' },
  { sourceLang: 'kn-IN', sourceText: 'ನೀರು ಬೇಕು', targetLang: 'en-IN', targetText: 'I need water', mood: 'sad' },
  { sourceLang: 'kn-IN', sourceText: 'ಯಾರಾದರೂ ಇದ್ದೀರಾ', targetLang: 'en-IN', targetText: 'Is anyone here?', mood: 'surprise' },
  { sourceLang: 'kn-IN', sourceText: 'ವೈದ್ಯರನ್ನು ಕರೆಯಿರಿ', targetLang: 'en-IN', targetText: 'Call a doctor', mood: 'fear' },

  // --- BENGALI TO ENGLISH ---
  { sourceLang: 'bn-IN', sourceText: 'সাহায্য করুন', targetLang: 'en-IN', targetText: 'Help me', mood: 'fear' },
  { sourceLang: 'bn-IN', sourceText: 'জল চাই', targetLang: 'en-IN', targetText: 'I need water', mood: 'sad' },
  { sourceLang: 'bn-IN', sourceText: 'এখানে কেউ আছেন', targetLang: 'en-IN', targetText: 'Is anyone here?', mood: 'surprise' },
  { sourceLang: 'bn-IN', sourceText: 'ডাক্তার ডাকুন', targetLang: 'en-IN', targetText: 'Call a doctor', mood: 'fear' },

  // --- ENGLISH TO REGIONAL ---
  { sourceLang: 'en-IN', sourceText: 'help me', targetLang: 'hi-IN', targetText: 'मदद करो', mood: 'fear' },
  { sourceLang: 'en-IN', sourceText: 'help me', targetLang: 'ta-IN', targetText: 'உதவி வேண்டும்', mood: 'fear' },
  { sourceLang: 'en-IN', sourceText: 'help me', targetLang: 'te-IN', targetText: 'సహాయం చేయండి', mood: 'fear' },
  { sourceLang: 'en-IN', sourceText: 'help me', targetLang: 'kn-IN', targetText: 'ಸಹಾಯ ಮಾಡಿ', mood: 'fear' },
  { sourceLang: 'en-IN', sourceText: 'help me', targetLang: 'bn-IN', targetText: 'সাহায্য করুন', mood: 'fear' },

  { sourceLang: 'en-IN', sourceText: 'i need water', targetLang: 'hi-IN', targetText: 'मुझे पानी चाहिए', mood: 'sad' },
  { sourceLang: 'en-IN', sourceText: 'i need water', targetLang: 'ta-IN', targetText: 'தண்ணீர் வேண்டும்', mood: 'sad' },
  { sourceLang: 'en-IN', sourceText: 'i need water', targetLang: 'te-IN', targetText: 'మంచినీళ్లు కావాలి', mood: 'sad' },
  { sourceLang: 'en-IN', sourceText: 'i need water', targetLang: 'kn-IN', targetText: 'ನೀರು ಬೇಕು', mood: 'sad' },
  { sourceLang: 'en-IN', sourceText: 'i need water', targetLang: 'bn-IN', targetText: 'জল চাই', mood: 'sad' },

  { sourceLang: 'en-IN', sourceText: 'is anyone here', targetLang: 'hi-IN', targetText: 'यहाँ कोई है?', mood: 'surprise' },
  { sourceLang: 'en-IN', sourceText: 'is anyone here', targetLang: 'ta-IN', targetText: 'யாராவது இருக்கீங்களா?', mood: 'surprise' },
  { sourceLang: 'en-IN', sourceText: 'is anyone here', targetLang: 'te-IN', targetText: 'ఎవరైనా ఉన్నారా?', mood: 'surprise' },
  
  { sourceLang: 'en-IN', sourceText: 'call a doctor', targetLang: 'hi-IN', targetText: 'डॉक्टर को बुलाओ', mood: 'fear' },
  { sourceLang: 'en-IN', sourceText: 'call a doctor', targetLang: 'ta-IN', targetText: 'டாக்டரை கூப்பிடுங்க', mood: 'fear' },
  { sourceLang: 'en-IN', sourceText: 'call a doctor', targetLang: 'te-IN', targetText: 'వైద్యుడిని పిలవండి', mood: 'fear' },
];

/**
 * Searches the local dictionary for the closest matching text
 */
export function matchOfflinePhrase(
  inputText: string,
  sourceLangCode: string,
  targetLangCode: string
): OfflineTranslation | null {
  const cleanInput = inputText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '').trim();
  if (!cleanInput) return null;

  // 1. Try exact/substring match first
  for (const item of OFFLINE_DICTIONARY) {
    const cleanSource = item.sourceText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '').trim();
    if (
      (cleanInput.includes(cleanSource) || cleanSource.includes(cleanInput)) &&
      (item.sourceLang === sourceLangCode || sourceLangCode === 'auto') &&
      item.targetLang === targetLangCode
    ) {
      return item;
    }
  }

  // 2. Fallback: match just by input text regardless of language if target matches
  for (const item of OFFLINE_DICTIONARY) {
    const cleanSource = item.sourceText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '').trim();
    if (cleanInput.includes(cleanSource) && item.targetLang === targetLangCode) {
      return item;
    }
  }

  return null;
}
