import Groq from 'groq-sdk';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const LANG_NAMES = {
  'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
  'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'bn-IN': 'Bengali',
  'gu-IN': 'Gujarati', 'mr-IN': 'Marathi', 'pa-IN': 'Punjabi',
  'od-IN': 'Odia', 'en-IN': 'English',
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(503).json({ error: 'GROQ_API_KEY not configured', code: 'GROQ_KEY_MISSING' });

  try {
    const { originalText, sarvamTranslation, sourceLang, targetLang, emotion } = req.body;

    if (!originalText?.trim())     return res.status(400).json({ error: 'Missing: originalText' });
    if (!sarvamTranslation?.trim()) return res.status(400).json({ error: 'Missing: sarvamTranslation' });
    if (!sourceLang)               return res.status(400).json({ error: 'Missing: sourceLang' });
    if (!targetLang)               return res.status(400).json({ error: 'Missing: targetLang' });

    const sourceName = LANG_NAMES[sourceLang] ?? sourceLang;
    const targetName = LANG_NAMES[targetLang] ?? targetLang;

    let emotionContext = '';
    if (emotion?.mood) {
      emotionContext = `\n- The speaker's detected emotional state is: "${emotion.mood}" (gender: ${emotion.gender}, confidence: ${Math.round(emotion.confidence * 100)}%). Adapt tone accordingly.`;
    }

    const systemPrompt = `You are an expert Indian language linguist and cultural translator specializing in real-time speech translation.

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
- Correct obvious speech-to-text errors using semantic clues.
- Handle code-mixing (Hinglish, Tanglish) naturally.
- If source and target are the same, clean up grammar/punctuation only.
- If Sarvam translation is already excellent, set original_kept: true and return it unchanged.
- Preserve proper nouns, names, and numbers exactly.
- Match the tone and register of the original speech.${emotionContext}`;

    const userPrompt = `Original speech (${sourceName}): "${originalText}"
Machine translation by Sarvam AI (${targetName}): "${sarvamTranslation}"

Analyse and refine this translation.`;

    const client = new Groq({ apiKey: groqKey });
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 2048,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // Fallback gracefully
      return res.json({
        refinedTranslation: sarvamTranslation,
        thinking: 'Groq returned non-JSON — using Sarvam translation.',
        contextNote: '',
        tone: 'neutral',
        confidence: 'low',
        originalKept: true,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({
      refinedTranslation: parsed.refined_translation || sarvamTranslation,
      thinking: parsed.thinking_summary || '',
      contextNote: parsed.context_note || '',
      tone: parsed.tone || 'neutral',
      confidence: parsed.confidence || 'medium',
      originalKept: !!parsed.original_kept,
    });
  } catch (err) {
    console.error('[Groq] refine failed:', err.message);
    // Graceful fallback — don't crash
    res.json({
      refinedTranslation: req.body?.sarvamTranslation || '',
      thinking: 'Groq reasoning unavailable — using Sarvam translation.',
      contextNote: '',
      tone: 'neutral',
      confidence: 'low',
      originalKept: true,
    });
  }
}
