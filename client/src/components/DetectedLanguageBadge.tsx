import React from 'react';
import { getLanguageFlag } from '../constants/languages';

interface DetectedLanguageBadgeProps {
  languageName: string | null;
  languageCode: string | null;
  confidence: number | null;
}

export const DetectedLanguageBadge: React.FC<DetectedLanguageBadgeProps> = ({
  languageName,
  languageCode,
  confidence,
}) => {
  if (!languageName || !languageCode) return null;

  const pct = confidence !== null ? Math.round(confidence * 100) : null;
  const flag = getLanguageFlag(languageCode);

  const confidenceColorClass =
    confidence !== null && confidence >= 0.85
      ? 'text-emerald-400'
      : confidence !== null && confidence >= 0.6
      ? 'text-amber-400'
      : 'text-rose-400';

  const confidenceDotClass =
    confidence !== null && confidence >= 0.85
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
      : confidence !== null && confidence >= 0.6
      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
      : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]';

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono select-none animate-fade-in
        bg-white/[0.03] border-white/[0.06] text-sub backdrop-blur-md
      `}
    >
      <span className="text-xs">{flag}</span>
      <span className="uppercase text-[9px] tracking-wider text-zinc-500">Language Detected:</span>
      <span className="text-text font-semibold uppercase">{languageName}</span>
      
      {pct !== null && (
        <>
          <span className="text-zinc-700">|</span>
          <span className="uppercase text-[9px] tracking-wider text-zinc-500 font-mono">conf:</span>
          <span className={`${confidenceColorClass} font-bold`}>{pct}%</span>
          <span className={`w-1.5 h-1.5 rounded-full ${confidenceDotClass}`} />
        </>
      )}
    </div>
  );
};
export default DetectedLanguageBadge;
