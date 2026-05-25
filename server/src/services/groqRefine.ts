import Groq from 'groq-sdk';
import { createError } from '../middleware/errorHandler';

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      throw createError(
        'Groq API key not configured. Set GROQ_API_KEY in server/.env',
        503,
        'GROQ_KEY_MISSING'
      );
    }
    groqClient = new Groq({ apiKey: key });
  }
  return groqClient;
}

// ── Language display names for prompting ─────────────────────────────────────
const LANG_NAMES: Record<string, string> = {
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'bn-IN': 'Bengali',
  'gu-IN': 'Gujarati',
  'mr-IN': 'Marathi',
  'pa-IN': 'Punjabi',
  'od-IN': 'Odia',
  'en-IN': 'English',
};

export interface SmartRefineResult {
  refinedTranslation: string;       // Groq's improved translation
  thinking: string;                 // The model's reasoning (trimmed)
  contextNote: string;              // One-line cultural/contextual note
  tone: 'formal' | 'casual' | 'emotional' | 'technical' | 'neutral';
  confidence: 'high' | 'medium' | 'low';
  originalKept: boolean;            // true if Groq thought Sarvam was already perfect
}

/**
 * Uses Groq deepseek-r1 (thinking model) to analyse the conversation context,
 * detect tone/formality, and produce a culturally-nuanced translation refinement.
 */
export async function smartRefineTranslation(
  originalText: string,
  sarvamTranslation: string,
  sourceLangCode: string,
  targetLangCode: string,
  emotion?: { mood: string; gender: string; confidence: number }
): Promise<SmartRefineResult> {
  const client = getGroqClient();

  const sourceName = LANG_NAMES[sourceLangCode] ?? sourceLangCode;
  const targetName = LANG_NAMES[targetLangCode] ?? targetLangCode;

  let emotionContext = '';
  if (emotion && emotion.mood) {
    emotionContext = `\n- The speaker's detected emotional state is: "${emotion.mood}" (analyzed voice gender: ${emotion.gender}, confidence: ${Math.round(emotion.confidence * 100)}%). Adapt the vocabulary, intensity, and register of the translation to reflect this emotional context (e.g. match anger, calm, fear, or happiness in appropriate conversational ${targetName} phrasing).`;
  }

  const systemPrompt = `You are an expert Indian language linguist and cultural translator specializing in real-time speech translation for Indian languages.

Your role is to ANALYSE a machine translation and IMPROVE it using cultural intelligence, contextual awareness, and linguistic nuance. You understand the rich cultural context of Indian languages — honorifics, code-mixing, register differences (formal/casual), and regional variations.

ALWAYS respond with a valid JSON object matching this EXACT schema (no markdown, no extra text):
{
  "thinking_summary": "2-3 sentence summary of your reasoning",
  "context_note": "One concise sentence about cultural/contextual observations",
  "tone": "formal" | "casual" | "emotional" | "technical" | "neutral",
  "refined_translation": "Your improved translation in ${targetName}",
  "original_kept": true | false,
  "confidence": "high" | "medium" | "low"
}

Rules:
- ASR Error Correction: Correct obvious speech-to-text transcription mistakes (homophone errors, missing prepositions, or misspelt names/places in Indian context) using semantic clues.
- Code-Mixing Resolution: Translate mixed sentences (e.g. English words mixed into regional language, Hinglish, Tanglish) into natural, grammatically correct phrasing in ${targetName}.
- If the source and target languages are the same, act as a transcript cleanup agent: remove stutters, repair grammar, and format punctuation nicely without changing the language.
- If the Sarvam translation is already excellent, set original_kept: true and return it unchanged.
- Preserve proper nouns, names, and numbers exactly.
- Match the tone and register of the original speech.
- Use natural, conversational ${targetName} — not robotic literal translation.${emotionContext}
- confidence reflects how certain you are of the refinement`;

  const userPrompt = `Original speech (${sourceName}): "${originalText}"
Machine translation by Sarvam AI (${targetName}): "${sarvamTranslation}"

Analyse and refine this translation. Think deeply about:
1. What is the speaker's intent and tone?
2. Are there cultural nuances, idioms, or honorifics to preserve?
3. Is the Sarvam translation natural-sounding in ${targetName}?
4. Can it be improved for clarity, naturalness, or cultural accuracy?`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 2048,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';

    // Extract JSON from response (model may wrap in ```json ... ```)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Groq returned non-JSON response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      refinedTranslation: parsed.refined_translation || sarvamTranslation,
      thinking: parsed.thinking_summary || '',
      contextNote: parsed.context_note || '',
      tone: parsed.tone || 'neutral',
      confidence: parsed.confidence || 'medium',
      originalKept: !!parsed.original_kept,
    };
  } catch (err: unknown) {
    const error = err as Error;
    // If Groq fails, gracefully fall back (don't crash the pipeline)
    console.error('[Groq] Smart refine failed:', error.message);
    return {
      refinedTranslation: sarvamTranslation,
      thinking: 'Groq reasoning unavailable — using Sarvam translation.',
      contextNote: '',
      tone: 'neutral',
      confidence: 'low',
      originalKept: true,
    };
  }
}

/**
 * Health check for Groq connection
 */
export async function checkGroqHealth(): Promise<boolean> {
  try {
    const client = getGroqClient();
    // Minimal call to verify key is valid
    await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'ping' }],
      max_completion_tokens: 5,
    });
    return true;
  } catch {
    return false;
  }
}
