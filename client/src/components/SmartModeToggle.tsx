import React from 'react';
import { Brain, Zap } from 'lucide-react';

interface SmartModeToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  groqReady: boolean;
  disabled?: boolean;
}

export const SmartModeToggle: React.FC<SmartModeToggleProps> = ({
  enabled,
  onToggle,
  groqReady,
  disabled,
}) => {
  return (
    <div
      className={`
        flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-300 backdrop-blur-md
        ${enabled 
          ? 'bg-primary/[0.04] border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.08)]' 
          : 'bg-white/[0.02] border-white/[0.05]'
        }
      `}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <div
          className={`
            w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300
            ${enabled 
              ? 'bg-primary/10 border-primary/30 text-primary' 
              : 'bg-zinc-950 border-white/[0.04] text-zinc-500'
            }
          `}
        >
          <Brain className="w-4 h-4" />
        </div>

        <div>
          <div className="flex items-center gap-1.5 font-sans">
            <span className="text-xs font-semibold text-text uppercase tracking-wide">Smart Mode</span>
            {enabled && groqReady && (
              <span className="flex items-center gap-0.5 text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-accent/20 bg-accent/[0.05] text-accent uppercase tracking-wider">
                <Zap className="w-2 h-2" />
                Refined
              </span>
            )}
          </div>
          <p className="text-[10px] text-sub leading-tight mt-0.5 font-sans">
            {enabled
              ? 'Deepseek refinement with cultural Indian phrasing'
              : 'Context-aware translation correction'}
          </p>
        </div>
      </div>

      {/* Switch track */}
      <button
        id="smart-mode-toggle"
        onClick={() => onToggle(!enabled)}
        disabled={disabled}
        aria-label={enabled ? 'Disable Smart Mode' : 'Enable Smart Mode'}
        className="relative flex-shrink-0 w-11 h-6 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span
          className={`
            block w-full h-full rounded-full transition-colors duration-300
            ${enabled ? 'bg-primary' : 'bg-zinc-800'}
          `}
        />
        <span
          className={`
            absolute top-0.5 w-5 h-5 rounded-full bg-zinc-950 border transition-all duration-300
            ${enabled 
              ? 'left-[22px] border-primary/40 bg-zinc-950' 
              : 'left-0.5 border-zinc-700 bg-zinc-400'
            }
          `}
        />
      </button>
    </div>
  );
};
export default SmartModeToggle;
