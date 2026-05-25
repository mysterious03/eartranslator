import React from 'react';
import { Clock, Copy, Volume2, Trash2, ChevronRight } from 'lucide-react';
import type { ConversationEntry } from '../types';
import { synthesizeSpeech, playAudioOnDevice } from '../services/sarvamApi';
import { useAppStore } from '../store/useAppStore';

interface ConversationHistoryProps {
  history: ConversationEntry[];
  onClear: () => void;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const HistoryItem: React.FC<{ entry: ConversationEntry }> = ({ entry }) => {
  const [copied, setCopied] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const { outputDeviceId } = useAppStore();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${entry.transcript}\n\n${entry.translation}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handlePlay = async () => {
    if (playing) return;
    setPlaying(true);
    try {
      const url = await synthesizeSpeech(entry.translation, entry.targetLang);
      await playAudioOnDevice(url, outputDeviceId);
    } catch {
      // silent
    } finally {
      setPlaying(false);
    }
  };

  const MOOD_EMOJIS: Record<string, string> = {
    angry: '😡',
    calm: '😌',
    disgust: '🤢',
    fear: '😨',
    happy: '😊',
    sad: '😢',
    surprise: '😲',
    neutral: '😐',
  };

  // Define dynamic border and shadow color based on speaker emotion or translation confidence
  let cardClass = 'border-white/[0.06] bg-white/[0.01] hover:border-primary/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.06)]';
  let badgeClass = 'bg-primary/10 border-primary/20 text-primary';
  let confDot = 'bg-primary';
  let emotionBadge = null;

  if (entry.emotion) {
    const mood = entry.emotion.mood;
    const emoji = MOOD_EMOJIS[mood] || '😐';
    const confidencePct = Math.round(entry.emotion.confidence * 100);
    
    if (mood === 'angry') {
      cardClass = 'border-rose-500/25 bg-rose-950/[0.02] hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]';
      badgeClass = 'bg-rose-500/10 border-rose-500/35 text-rose-400';
      confDot = 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]';
    } else if (mood === 'fear') {
      cardClass = 'border-purple-500/25 bg-purple-950/[0.02] hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]';
      badgeClass = 'bg-purple-500/10 border-purple-500/35 text-purple-400';
      confDot = 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]';
    } else if (mood === 'sad') {
      cardClass = 'border-sky-500/25 bg-sky-950/[0.02] hover:border-sky-500/40 hover:shadow-[0_0_20px_rgba(14,165,233,0.1)]';
      badgeClass = 'bg-sky-500/10 border-sky-500/35 text-sky-400';
      confDot = 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]';
    } else if (mood === 'happy') {
      cardClass = 'border-emerald-500/25 bg-emerald-950/[0.02] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]';
      badgeClass = 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400';
      confDot = 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]';
    } else if (mood === 'surprise') {
      cardClass = 'border-amber-500/25 bg-amber-950/[0.02] hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]';
      badgeClass = 'bg-amber-500/10 border-amber-500/35 text-amber-400';
      confDot = 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]';
    } else {
      cardClass = 'border-teal-500/25 bg-teal-950/[0.02] hover:border-teal-500/40 hover:shadow-[0_0_20px_rgba(20,184,166,0.1)]';
      badgeClass = 'bg-teal-500/10 border-teal-500/35 text-teal-400';
      confDot = 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]';
    }

    emotionBadge = (
      <div className={`flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${badgeClass}`}>
        <span>{emoji} {mood} ({confidencePct}%)</span>
      </div>
    );
  } else {
    // Confidence fallback if no emotion matches
    if (entry.confidence >= 0.85) {
      cardClass = 'border-emerald-500/20 bg-emerald-950/[0.02] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]';
      badgeClass = 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400';
      confDot = 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]';
    } else if (entry.confidence >= 0.6) {
      cardClass = 'border-amber-500/20 bg-amber-950/[0.02] hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]';
      badgeClass = 'bg-amber-500/10 border-amber-500/35 text-amber-400';
      confDot = 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]';
    } else {
      cardClass = 'border-rose-500/20 bg-rose-950/[0.02] hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]';
      badgeClass = 'bg-rose-500/10 border-rose-500/35 text-rose-400';
      confDot = 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]';
    }
  }

  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 backdrop-blur-md ${cardClass} flex flex-col gap-3.5`}>
      {/* Defined header with gradient tags */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {/* Vibrant gradient conversion badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-gradient-to-r from-primary/10 to-accent/15 border border-primary/20 text-[9px] font-mono font-bold tracking-widest text-text">
            <span>{entry.sourceLangName.toUpperCase()}</span>
            <ChevronRight className="w-2.5 h-2.5 text-accent animate-pulse" />
            <span className="text-accent">{entry.targetLangName.toUpperCase()}</span>
          </div>

          {entry.isOffline && (
            <div className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[8px] uppercase tracking-wider font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse">
              Offline Mesh
            </div>
          )}

          <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span>{formatTime(entry.timestamp)}</span>
          </div>
        </div>

        {/* Confidence metric / Emotion badge */}
        <div className="flex items-center gap-2">
          {emotionBadge}
          <div className={`flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${entry.emotion ? 'bg-zinc-900 border-white/[0.04] text-zinc-400' : badgeClass}`}>
            {!entry.emotion && <span className={`w-1.5 h-1.5 rounded-full ${confDot} mr-1`} />}
            <span>{Math.round(entry.confidence * 100)}% Match</span>
          </div>
        </div>
      </div>

      {/* Structured transcript/translation blocks */}
      <div className="flex flex-col gap-2.5 font-sans pl-1.5">
        {/* Transcription (soft violet indicator) */}
        <div className="relative pl-3.5 border-l-2 border-primary/20 py-0.5">
          <span className="absolute left-0 top-1 text-[7px] font-mono uppercase tracking-widest text-primary/60">IN</span>
          <p className="text-xs text-indigo-200/70 leading-relaxed font-sans">{entry.transcript}</p>
        </div>

        {/* Translation (teal indicator) */}
        <div className="relative pl-3.5 border-l-2 border-accent/40 py-0.5">
          <span className="absolute left-0 top-1 text-[7px] font-mono uppercase tracking-widest text-accent/80">OUT</span>
          <p className="text-sm text-text font-bold leading-relaxed font-sans">{entry.translation}</p>
        </div>
      </div>

      {/* Styled Glass Action Buttons */}
      <div className="flex items-center gap-2 mt-1">
        <button
          id={`history-play-${entry.id}`}
          onClick={handlePlay}
          disabled={playing}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider
            border transition-all duration-300 disabled:opacity-40 hover:scale-105 active:scale-95
            ${playing 
              ? 'bg-accent/20 border-accent/40 text-accent font-semibold shadow-[0_0_8px_rgba(0,255,200,0.2)]' 
              : 'bg-accent/10 border-accent/20 hover:border-accent/40 text-accent hover:bg-accent/20 shadow-[0_0_10px_rgba(0,255,200,0.05)]'
            }
          `}
        >
          <Volume2 className={`w-3 h-3 ${playing ? 'animate-pulse' : ''}`} />
          {playing ? 'Playing...' : 'Play Audio'}
        </button>

        <button
          id={`history-copy-${entry.id}`}
          onClick={handleCopy}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider
            border transition-all duration-300 hover:scale-105 active:scale-95
            ${copied 
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-semibold shadow-[0_0_8px_rgba(52,211,153,0.2)]' 
              : 'bg-primary/10 border-primary/20 hover:border-primary/40 text-primary hover:bg-primary/20 shadow-[0_0_10px_rgba(99,102,241,0.05)]'
            }
          `}
        >
          <Copy className="w-3 h-3" />
          {copied ? 'Copied' : 'Copy Text'}
        </button>
      </div>
    </div>
  );
};

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({ history, onClear }) => {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 w-full font-sans mt-4">
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-3 bg-gradient-to-b from-primary to-accent rounded" />
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-sub font-bold">
            Interactive Session Logs ({history.length})
          </h2>
        </div>
        <button
          id="clear-history-button"
          onClick={onClear}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/15 text-[9px] font-mono uppercase tracking-wider text-rose-400 hover:border-rose-400/50 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Trash2 className="w-3 h-3" />
          Clear Workspace Logs
        </button>
      </div>
      <div className="flex flex-col gap-3.5 max-h-[360px] overflow-y-auto pr-1">
        {history.map((entry) => <HistoryItem key={entry.id} entry={entry} />)}
      </div>
    </div>
  );
};
export default ConversationHistory;
