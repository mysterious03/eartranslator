import React from 'react';
import { FileText } from 'lucide-react';

interface TranscriptPanelProps {
  transcript: string;
  languageName: string | null;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ transcript, languageName }) => {
  if (!transcript) return null;

  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in relative border-l-4 border-l-primary shadow-[0_0_15px_rgba(99,102,241,0.04)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <FileText className="w-3 h-3" />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
          {languageName ? `Speech Transcript [ ${languageName} ]` : 'Speech Transcript'}
        </span>
      </div>
      <p className="text-sm text-text leading-relaxed font-sans font-light pl-0.5">{transcript}</p>
    </div>
  );
};
export default TranscriptPanel;
