import React from 'react';
import type { AppStatus } from '../types';
import { Radio, Zap, Languages, Volume2, Check, XCircle } from 'lucide-react';

interface PipelineStep {
  id: AppStatus | 'init';
  label: string;
  icon: React.ReactNode;
  activeStatuses: AppStatus[];
  doneStatuses: AppStatus[];
}

const STEPS: PipelineStep[] = [
  {
    id: 'recording',
    label: 'Record',
    icon: <Radio className="w-3.5 h-3.5" />,
    activeStatuses: ['recording'],
    doneStatuses: ['detecting', 'translating', 'speaking', 'done'],
  },
  {
    id: 'detecting',
    label: 'Detect',
    icon: <Zap className="w-3.5 h-3.5" />,
    activeStatuses: ['detecting'],
    doneStatuses: ['translating', 'speaking', 'done'],
  },
  {
    id: 'translating',
    label: 'Translate',
    icon: <Languages className="w-3.5 h-3.5" />,
    activeStatuses: ['translating'],
    doneStatuses: ['speaking', 'done'],
  },
  {
    id: 'speaking',
    label: 'Play',
    icon: <Volume2 className="w-3.5 h-3.5" />,
    activeStatuses: ['speaking'],
    doneStatuses: ['done'],
  },
];

interface StatusBarProps {
  status: AppStatus;
  message: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, message }) => {
  const isError = status === 'error';

  return (
    <div className="flex flex-col gap-4 w-full font-sans">
      {/* Pipeline Visual Flow */}
      <div className="flex items-center justify-between w-full px-1">
        {STEPS.map((step, idx) => {
          const isActive = step.activeStatuses.includes(status);
          const isDone = step.doneStatuses.includes(status);
          const isLast = idx === STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step indicator block */}
              <div className="flex flex-col items-center gap-1.5 flex-none relative">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500
                    ${isDone 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                      : isActive 
                      ? 'bg-primary/10 border-primary text-primary shadow-[0_0_12px_rgba(99,102,241,0.3)] animate-pulse' 
                      : 'bg-zinc-950 border-white/[0.06] text-zinc-500'
                    }
                  `}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : step.icon}
                </div>
                <span
                  className={`
                    text-[9px] font-mono uppercase tracking-wider
                    ${isDone 
                      ? 'text-emerald-400 font-medium' 
                      : isActive 
                      ? 'text-primary font-medium' 
                      : 'text-zinc-600'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mb-4 mx-1 rounded-full overflow-hidden bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-primary to-accent"
                    style={{
                      width: isDone ? '100%' : isActive ? '50%' : '0%',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status Output Console */}
      <div
        className={`
          flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs leading-relaxed border backdrop-blur-sm
          ${isError 
            ? 'bg-rose-500/5 border-rose-500/25 text-rose-300' 
            : 'bg-white/[0.02] border-white/[0.06] text-sub'
          }
        `}
        style={{ minHeight: 38 }}
      >
        {isError ? (
          <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
        ) : (
          <span 
            className={`
              w-1.5 h-1.5 rounded-full flex-shrink-0
              ${status === 'idle' 
                ? 'bg-zinc-600' 
                : status === 'done' 
                ? 'bg-emerald-500' 
                : 'bg-primary animate-ping'
              }
            `} 
          />
        )}
        <span className="flex-1 font-sans">{message}</span>
      </div>
    </div>
  );
};
export default StatusBar;
