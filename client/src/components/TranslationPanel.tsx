import React from 'react';
import { Languages, Volume2 } from 'lucide-react';
import { synthesizeSpeech, playAudioOnDevice } from '../services/sarvamApi';
import { useAppStore } from '../store/useAppStore';

interface TranslationPanelProps {
  translation: string;
  targetLangName: string;
  targetLangCode: string;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  translation,
  targetLangName,
  targetLangCode,
}) => {
  const [playing, setPlaying] = React.useState(false);
  const { outputDeviceId } = useAppStore();

  const handlePlayback = async () => {
    if (playing || !translation) return;
    setPlaying(true);
    try {
      const url = await synthesizeSpeech(translation, targetLangCode);
      await playAudioOnDevice(url, outputDeviceId);
    } catch {
      // silent
    } finally {
      setPlaying(false);
    }
  };

  if (!translation) return null;

  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in relative border-l-4 border-l-accent shadow-[0_0_20px_rgba(0,255,200,0.04)] overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
            <Languages className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">
            Translated Speech [ {targetLangName} ]
          </span>
        </div>

        <button
          id="replay-translation-button"
          onClick={handlePlayback}
          disabled={playing}
          title="Play translation in earbuds"
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider
            border transition-all duration-300 disabled:opacity-40 hover:scale-105 active:scale-95
            ${playing 
              ? 'bg-accent/20 border-accent/40 text-accent font-semibold shadow-[0_0_10px_rgba(0,255,200,0.25)]' 
              : 'bg-accent/10 border-accent/20 hover:border-accent/40 text-accent hover:bg-accent/20 hover:shadow-[0_0_12px_rgba(0,255,200,0.1)]'
            }
          `}
        >
          <Volume2 className={`w-3.5 h-3.5 ${playing ? 'animate-pulse' : ''}`} />
          {playing ? 'PLAYING...' : 'REPLAY AUDIO'}
        </button>
      </div>

      <p className="text-base text-text leading-relaxed font-sans font-bold pl-0.5">
        {translation}
      </p>
    </div>
  );
};
export default TranslationPanel;
