import { Router, Request, Response, NextFunction } from 'express';
import { smartRefineTranslation } from '../services/groqRefine';
import { createError } from '../middleware/errorHandler';

export const refineRouter = Router();

interface RefineBody {
  originalText?: string;
  sarvamTranslation?: string;
  sourceLang?: string;
  targetLang?: string;
  emotion?: { mood: string; gender: string; confidence: number };
}

refineRouter.post('/', async (req: Request<{}, {}, RefineBody>, res: Response, next: NextFunction) => {
  try {
    const { originalText, sarvamTranslation, sourceLang, targetLang, emotion } = req.body;

    if (!originalText?.trim()) throw createError('Missing: originalText', 400, 'MISSING_FIELD');
    if (!sarvamTranslation?.trim()) throw createError('Missing: sarvamTranslation', 400, 'MISSING_FIELD');
    if (!sourceLang) throw createError('Missing: sourceLang', 400, 'MISSING_FIELD');
    if (!targetLang) throw createError('Missing: targetLang', 400, 'MISSING_FIELD');

    const result = await smartRefineTranslation(
      originalText.trim(),
      sarvamTranslation.trim(),
      sourceLang,
      targetLang,
      emotion
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});
