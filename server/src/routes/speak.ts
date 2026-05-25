import { Router, Request, Response, NextFunction } from 'express';
import { synthesizeSpeech } from '../services/sarvam';
import { createError } from '../middleware/errorHandler';

export const speakRouter = Router();

interface SpeakBody {
  text?: string;
  languageCode?: string;
}

speakRouter.post('/', async (req: Request<{}, {}, SpeakBody>, res: Response, next: NextFunction) => {
  try {
    const { text, languageCode } = req.body;

    if (!text || !text.trim()) {
      throw createError('Missing required field: text', 400, 'MISSING_TEXT');
    }
    if (!languageCode) {
      throw createError('Missing required field: languageCode', 400, 'MISSING_LANG');
    }

    const audioBuffer = await synthesizeSpeech(text.trim(), languageCode);

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'no-cache',
    });

    res.send(audioBuffer);
  } catch (err) {
    next(err);
  }
});
