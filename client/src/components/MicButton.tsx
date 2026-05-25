import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

type MicState = 'idle' | 'recording' | 'processing';

interface MicButtonProps {
  state: MicState;
  onClick: () => void;
  disabled?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({ state, onClick, disabled }) => {
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulsing ring - active on recording */}
      {isRecording && (
        <>
          <span className="absolute w-[150px] h-[150px] rounded-full border border-primary/30 animate-ping-slow" />
          <span className="absolute w-[130px] h-[130px] rounded-full border border-accent/20 animate-ping" style={{ animationDelay: '0.5s' }} />
        </>
      )}

      {/* Ambient background glow behind button */}
      <div 
        className={`
          absolute w-[120px] h-[120px] rounded-full filter blur-xl opacity-30 transition-all duration-700
          ${isRecording 
            ? 'bg-rose-500 opacity-40 scale-110' 
            : isProcessing 
            ? 'bg-accent opacity-40 scale-105' 
            : 'bg-primary'
          }
        `} 
      />

      {/* Button Body */}
      <button
        id="mic-toggle-button"
        onClick={onClick}
        disabled={disabled || isProcessing}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        className={`
          relative z-10 w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-300 backdrop-blur-md select-none border focus:outline-none
          ${isRecording 
            ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 hover:bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.25)]' 
            : isProcessing
            ? 'bg-white/5 border-white/10 text-zinc-500 cursor-wait'
            : 'bg-white/[0.03] border-white/10 hover:border-accent/40 text-text hover:text-accent hover:shadow-[0_0_25px_rgba(0,255,200,0.15)] hover:scale-105'
          }
        `}
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-8 h-8 drop-shadow-md text-rose-400" />
        ) : (
          <Mic className="w-8 h-8 drop-shadow-md" />
        )}
      </button>
    </div>
  );
};
