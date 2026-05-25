import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface EmotionResult {
  success: boolean;
  detected?: string;
  gender?: string;
  mood?: string;
  confidence?: number;
  error?: string;
}

/**
 * Runs the Python Speech Emotion Analyzer script on the audio buffer.
 */
export async function detectEmotion(audioBuffer: Buffer): Promise<EmotionResult> {
  const tempId = Math.random().toString(36).substring(7);
  const tempDir = path.join(__dirname, '..', '..', 'temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `temp_audio_${tempId}.wav`);

  try {
    // Write audio buffer to temp wav file
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Path to the Python prediction script
    const pythonScriptPath = path.join(__dirname, 'predict_emotion.py');

    // Run Python script
    const command = `python "${pythonScriptPath}" "${tempFilePath}"`;
    const { stdout } = await execPromise(command);

    // Extract JSON block from output
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Failed to extract JSON from Python output: ${stdout}`);
    }

    const result = JSON.parse(jsonMatch[0]);
    return result;

  } catch (err) {
    const error = err as Error;
    console.error('[EmotionDetector] Analysis failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Clean up temporary file
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupErr) {
      console.error('[EmotionDetector] Cleanup failed:', cleanupErr);
    }
  }
}
