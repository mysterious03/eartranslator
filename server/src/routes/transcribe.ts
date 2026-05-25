import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../middleware/upload';
import { transcribeWithAutoDetect } from '../services/sarvam';
import { detectEmotion, EmotionResult } from '../services/emotionDetector';

export const transcribeRouter = Router();

transcribeRouter.post(
  '/',
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No audio file provided', code: 'NO_FILE' });
        return;
      }

      const mimeType = req.file.mimetype || 'audio/webm';

      // Run transcription and emotion detection in parallel
      const [transcribeResult, emotionResult] = await Promise.all([
        transcribeWithAutoDetect(req.file.buffer, mimeType),
        detectEmotion(req.file.buffer).catch((): EmotionResult => ({ success: false }))
      ]);

      // Warn if confidence is low
      const lowConfidence = transcribeResult.confidence < 0.6;

      res.json({
        transcript: transcribeResult.transcript,
        detectedLanguage: transcribeResult.detectedLanguage,
        confidence: transcribeResult.confidence,
        lowConfidence,
        emotion: (emotionResult.success && emotionResult.detected) ? {
          detected: emotionResult.detected,
          gender: emotionResult.gender || 'female',
          mood: emotionResult.mood || 'neutral',
          confidence: emotionResult.confidence || 0.8
        } : undefined,
        message: lowConfidence
          ? 'Language detected with low confidence — try speaking more clearly'
          : undefined,
      });
    } catch (err) {
      next(err);
    }
  }
);
