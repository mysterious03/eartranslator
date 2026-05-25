import React from 'react';
import type { SmartRefineResult, Tone } from '../types';
import { Brain, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface SmartInsightPanelProps {
  result: SmartRefineResult;
  sarvamTranslation: string;
}

const TONE_CONFIG: Record<Tone, { label: string; textClass: string; bgClass: string; borderClass: string }> = {
  formal:    { label: 'Formal',    textClass: 'text-indigo-400',  bgClass: 'bg-indigo-500/10',  borderClass: 'border-indigo-500/20'  },
  casual:    { label: 'Casual',    textClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20' },
  emotional: { label: 'Emotional', textClass: 'text-amber-400',   bgClass: 'bg-amber-500/10',   borderClass: 'border-amber-500/20'   },
  technical: { label: 'Technical', textClass: 'text-purple-400',  bgClass: 'bg-purple-500/10',  borderClass: 'border-purple-500/20'  },
  neutral:   { label: 'Neutral',   textClass: 'text-zinc-400',    bgClass: 'bg-zinc-500/10',    borderClass: 'border-zinc-500/20'    },
};

const CONFIDENCE_CONFIG = {
  high:   { label: 'High Confidence',   colorClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' },
  medium: { label: 'Medium Confidence', colorClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'  },
  low:    { label: 'Low Confidence',    colorClass: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]'   },
};

export const SmartInsightPanel: React.FC<SmartInsightPanelProps> = ({ result, sarvamTranslation }) => {
  const [expanded, setExpanded] = React.useState(true);

  const tone = TONE_CONFIG[result.tone] ?? TONE_CONFIG.neutral;
  const conf = CONFIDENCE_CONFIG[result.confidence] ?? CONFIDENCE_CONFIG.medium;
  const changed = !result.originalKept && result.refinedTranslation !== sarvamTranslation;

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-white/[0.05] border-l-4 border-l-secondary shadow-[0_0_15px_rgba(139,92,246,0.04)] animate-fade-in">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none bg-white/[0.01] border-b border-white/[0.04]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
            <Brain className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-xs font-display font-semibold text-text uppercase tracking-wide">
            Context Refinement Analysis
          </span>
          <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border border-secondary/20 bg-secondary/[0.05] text-secondary uppercase tracking-wider">
            Deepseek-R1
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tone badge */}
          <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${tone.bgClass} ${tone.borderClass} ${tone.textClass} uppercase tracking-wider font-bold`}>
            {tone.label}
          </span>
          
          {/* Confidence dot */}
          <span
            className={`w-1.5 h-1.5 rounded-full ${conf.colorClass}`}
            title={conf.label}
          />
          
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-sub" />
          ) : (
            <ChevronDown className="w-4 h-4 text-sub" />
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 flex flex-col gap-4 font-sans">
          {/* Thinking summary */}
          {result.thinking && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-sub font-semibold">
                Reasoning Trace Log
              </span>
              <div className="p-3.5 rounded-lg border border-white/[0.03] bg-zinc-950/50 text-xs leading-relaxed text-sub italic">
                &ldquo;{result.thinking}&rdquo;
              </div>
            </div>
          )}

          {/* Context note */}
          {result.contextNote && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.02] p-3">
              <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-200/85 leading-relaxed">
                {result.contextNote}
              </p>
            </div>
          )}

          {/* Diff view screen */}
          {changed && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-sub font-semibold">
                Refinement Delta
              </span>
              <div className="rounded-lg border border-white/[0.04] bg-zinc-950/80 text-xs overflow-hidden">
                {/* Before line */}
                <div className="flex items-start gap-3 px-3 py-2.5 border-b border-white/[0.02] bg-rose-500/5 text-rose-300">
                  <span className="text-[10px] text-rose-500/60 font-mono select-none w-5 text-right">-</span>
                  <p className="leading-relaxed flex-1 font-sans line-through opacity-70">
                    {sarvamTranslation}
                  </p>
                </div>
                {/* After line */}
                <div className="flex items-start gap-3 px-3 py-2.5 bg-emerald-500/5 text-emerald-300">
                  <span className="text-[10px] text-emerald-500/60 font-mono select-none w-5 text-right">+</span>
                  <p className="leading-relaxed flex-1 font-sans font-bold">
                    {result.refinedTranslation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {result.originalKept && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
              <span>✓</span>
              <span>Context verified. Translation is highly accurate.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default SmartInsightPanel;
