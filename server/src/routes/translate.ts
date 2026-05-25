import { Router, Request, Response, NextFunction } from 'express';
import { translateText } from '../services/sarvam';
import { createError } from '../middleware/errorHandler';

export const translateRouter = Router();

interface TranslateBody {
  text?: string;
  sourceLang?: string;
  targetLang?: string;
}

translateRouter.post('/', async (req: Request<{}, {}, TranslateBody>, res: Response, next: NextFunction) => {
  try {
    const { text, sourceLang, targetLang } = req.body;

    if (!text || !text.trim()) {
      throw createError('Missing required field: text', 400, 'MISSING_TEXT');
    }
    if (!sourceLang) {
      throw createError('Missing required field: sourceLang', 400, 'MISSING_SOURCE_LANG');
    }
    if (!targetLang) {
      throw createError('Missing required field: targetLang', 400, 'MISSING_TARGET_LANG');
    }

    // If source and target are the same language, return as-is
    if (sourceLang === targetLang) {
      res.json({ translation: text });
      return;
    }

    const translation = await translateText(text, sourceLang, targetLang);
    res.json({ translation });
  } catch (err) {
    next(err);
  }
});
