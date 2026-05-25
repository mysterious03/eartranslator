import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { transcribeRouter } from './routes/transcribe';
import { translateRouter } from './routes/translate';
import { speakRouter } from './routes/speak';
import { refineRouter } from './routes/refine';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sarvamKeyConfigured: !!process.env.SARVAM_API_KEY,
    groqKeyConfigured: !!process.env.GROQ_API_KEY,
  });
});

// API Routes
app.use('/api/transcribe', transcribeRouter);
app.use('/api/translate', translateRouter);
app.use('/api/speak', speakRouter);
app.use('/api/refine', refineRouter);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🎧 EarTranslate Server running on http://localhost:${PORT}`);
  console.log(`   Sarvam API Key: ${process.env.SARVAM_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Groq API Key:   ${process.env.GROQ_API_KEY ? '✅ Configured (deepseek-r1 Smart Mode)' : '❌ Missing'}`);
  console.log(`   CORS Origin: ${CORS_ORIGIN}\n`);
});

export default app;
