import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
  silenceProgress?: number; // 0-1, shows countdown to auto-stop
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  analyserNode,
  isActive,
  silenceProgress = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const BAR_COUNT = 64;
    const BAR_GAP = 2;

    const drawIdle = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barW = (W - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;

      for (let i = 0; i < BAR_COUNT; i++) {
        const height = 4 + Math.sin(Date.now() / 500 + i * 0.25) * 2;
        const x = i * (barW + BAR_GAP);
        const y = (H - height) / 2;

        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)'; // Quiet indigo wave
        ctx.fillRect(x, y, barW, height);
      }
      rafRef.current = requestAnimationFrame(drawIdle);
    };

    const drawLive = () => {
      if (!analyserNode) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const bufferLen = analyserNode.frequencyBinCount;
      const dataArr = new Uint8Array(bufferLen);
      analyserNode.getByteFrequencyData(dataArr);

      const barW = (W - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
      const step = Math.floor(bufferLen / BAR_COUNT);

      const silenceFade = silenceProgress ?? 0;

      // Create an elegant Indigo-to-Teal horizontal gradient for the waveform
      const mainGrad = ctx.createLinearGradient(0, 0, W, 0);
      mainGrad.addColorStop(0, '#6366f1'); // Indigo
      mainGrad.addColorStop(1, '#00FFC8'); // Teal

      for (let i = 0; i < BAR_COUNT; i++) {
        const value = dataArr[i * step] / 255;
        const scaleValue = Math.pow(value, 1.15); // Better visualization spread
        const height = Math.max(4, scaleValue * H * 0.85);
        const x = i * (barW + BAR_GAP);
        const y = (H - height) / 2;

        if (silenceFade > 0.15) {
          // Fade wave color to a soft, semi-transparent grey when silence begins
          const alpha = Math.max(0.1, 0.5 - silenceFade * 0.4);
          ctx.fillStyle = `rgba(110, 115, 145, ${alpha})`;
        } else {
          ctx.fillStyle = mainGrad;
        }

        ctx.fillRect(x, y, barW, height);
      }

      // Draw silence countdown tracking line at the bottom
      if (silenceFade > 0.02) {
        const barH = 2;
        const barY = H - barH;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(0, barY, W, barH);

        // Indigo-to-Teal countdown indicator line
        const lineGrad = ctx.createLinearGradient(0, 0, W * (1 - silenceFade), 0);
        lineGrad.addColorStop(0, '#f43f5e'); // Soft alert pink/red
        lineGrad.addColorStop(1, '#6366f1'); // Indigo transition
        
        ctx.fillStyle = lineGrad;
        ctx.fillRect(0, barY, W * (1 - silenceFade), barH);
      }

      rafRef.current = requestAnimationFrame(drawLive);
    };

    cancelAnimationFrame(rafRef.current);

    if (isActive && analyserNode) {
      drawLive();
    } else {
      drawIdle();
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode, isActive, silenceProgress]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={60}
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
export default WaveformVisualizer;
