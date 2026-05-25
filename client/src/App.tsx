import { useEffect, useCallback, useState, useRef } from 'react';
import { useAppStore } from './store/useAppStore';
import { useMicrophone } from './hooks/useMicrophone';
import { useTranslationPipeline } from './hooks/useTranslationPipeline';
import { useAudioDevices } from './hooks/useAudioDevices';
import { checkHealth, translateText } from './services/sarvamApi';
import { getLanguageName } from './constants/languages';
import { matchOfflinePhrase } from './utils/offlineDictionary';

// Components
import { MicButton } from './components/MicButton';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { LanguageSelector } from './components/LanguageSelector';
import { DetectedLanguageBadge } from './components/DetectedLanguageBadge';
import { StatusBar } from './components/StatusBar';
import { TranscriptPanel } from './components/TranscriptPanel';
import { TranslationPanel } from './components/TranslationPanel';
import { SmartInsightPanel } from './components/SmartInsightPanel';
import { SmartModeToggle } from './components/SmartModeToggle';
import { DeviceSelector } from './components/DeviceSelector';
import { ConversationHistory } from './components/ConversationHistory';
import { ScrollReveal } from './components/ScrollReveal';
import { MeshVisualizer } from './components/MeshVisualizer';
import { InteractiveBackground } from './components/InteractiveBackground';
import { EarbudExplorer } from './components/EarbudExplorer';

import { 
  Headphones, 
  Activity, 
  ShieldAlert, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Mic, 
  Clock, 
  Volume2,
  Terminal,
  Layers,
  WifiOff,
  Play
} from 'lucide-react';

type MicState = 'idle' | 'recording' | 'processing';

function App() {
  const {
    targetLang, setTargetLang,
    isRecording, setIsRecording,
    smartMode, setSmartMode,
    smartResult,
    setOutputDeviceId,
    detectedLanguage, detectedLanguageName, detectedConfidence,
    currentTranscript, currentTranslation,
    status, statusMessage, setStatus,
    history, clearHistory,
    apiKeyOk, setApiKeyOk,
    // Offline Mesh store integrations
    offlineMode, setOfflineMode,
    detectedEmotion,
    meshLogs,
  } = useAppStore();

  const [liveAnalyser, setLiveAnalyser] = useState<AnalyserNode | null>(null);
  const [silenceProgress, setSilenceProgress] = useState(0);
  const [groqReady, setGroqReady] = useState(false);
  const [sarvamRawTranslation, setSarvamRawTranslation] = useState('');
  const silenceRafRef = useRef<number>(0);
  const [systemTime, setSystemTime] = useState('');

  // Landing Page Interactive Demo Simulator states
  const [demoMode, setDemoMode] = useState<'preset' | 'real-mic'>('preset');
  const [demoLang, setDemoLang] = useState('hi-IN');
  const [demoStatus, setDemoStatus] = useState<'idle' | 'recording' | 'processing' | 'done'>('idle');
  const [demoTranscript, setDemoTranscript] = useState('');
  const [demoTranslation, setDemoTranslation] = useState('');
  const [demoEmotion, setDemoEmotion] = useState('');
  const [isDemoMicActive, setIsDemoMicActive] = useState(false);
  const demoRecRef = useRef<any>(null);

  // Animated Mesh stats ticker
  const [nodesCount, setNodesCount] = useState(1482);
  const [packetsRelayed, setPacketsRelayed] = useState(92410);

  useEffect(() => {
    const interval = setInterval(() => {
      setNodesCount(prev => prev + (Math.random() > 0.75 ? 1 : 0));
      setPacketsRelayed(prev => prev + Math.floor(Math.random() * 3));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Refs that bridge handleAutoStop ↔ hooks (avoids stale closure)
  const stopRecordingRef = useRef<(() => Promise<Blob | null>) | null>(null);
  const runPipelineRef = useRef<((blob: Blob) => Promise<void>) | null>(null);
  const isRecordingRef = useRef(isRecording);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // ── System clock indicator ──────────────────────────────────────────────────
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Audio devices ──────────────────────────────────────────────────────────
  const {
    inputDevices, outputDevices,
    selectedInputId, selectedOutputId,
    setSelectedInputId, setSelectedOutputId,
    refreshDevices, permissionGranted, requestPermission,
  } = useAudioDevices();

  useEffect(() => {
    setOutputDeviceId(selectedOutputId);
  }, [selectedOutputId, setOutputDeviceId]);

  // ── VAD auto-stop callback ─────────────────────────────────────────────────
  const handleAutoStop = useCallback(async () => {
    if (!isRecordingRef.current) return;

    setIsRecording(false);
    setLiveAnalyser(null);
    setSilenceProgress(0);
    cancelAnimationFrame(silenceRafRef.current);
    setSarvamRawTranslation('');
    
    const { offlineMode } = useAppStore.getState();
    if (offlineMode) {
      setStatus('detecting', 'MESH: Processing frequency layers...');
    } else {
      setStatus('detecting', 'Analyzing captured frequencies...');
    }

    const blob = await stopRecordingRef.current?.();
    if (!blob || blob.size < 1000) {
      setStatus('idle', 'Frequencies below threshold. No speech recorded.');
      return;
    }
    await runPipelineRef.current?.(blob);
  }, [setIsRecording, setStatus]);

  const { startRecording, stopRecording, analyserNode, silenceCountdownRef } =
    useMicrophone(handleAutoStop);

  const { runPipeline } = useTranslationPipeline();

  // Keep refs in sync
  useEffect(() => { stopRecordingRef.current = stopRecording; }, [stopRecording]);
  useEffect(() => { runPipelineRef.current = runPipeline; }, [runPipeline]);

  // ── Health check ───────────────────────────────────────────────────────────
  useEffect(() => {
    checkHealth()
      .then((data) => {
        setApiKeyOk(data.sarvamKeyConfigured);
        setGroqReady(data.groqKeyConfigured ?? false);
      })
      .catch(() => setApiKeyOk(false));
  }, [setApiKeyOk]);

  // Track Sarvam raw translation before Groq refines
  useEffect(() => {
    if (currentTranslation && !smartResult) {
      setSarvamRawTranslation(currentTranslation);
    }
  }, [currentTranslation, smartResult]);

  // ── Silence progress animation loop ───────────────────────────────────────
  useEffect(() => {
    if (!isRecording) { setSilenceProgress(0); return; }

    function poll() {
      setSilenceProgress(silenceCountdownRef.current);
      silenceRafRef.current = requestAnimationFrame(poll);
    }
    silenceRafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(silenceRafRef.current);
  }, [isRecording, silenceCountdownRef]);

  const isProcessing = status === 'detecting' || status === 'translating' || status === 'speaking';
  const micState: MicState = isRecording ? 'recording' : isProcessing ? 'processing' : 'idle';

  // ── Mic button click ───────────────────────────────────────────────────────
  const handleMicClick = useCallback(async () => {
    if (isProcessing) return;

    if (isRecording) {
      // Manual stop
      setIsRecording(false);
      setLiveAnalyser(null);
      setSilenceProgress(0);
      cancelAnimationFrame(silenceRafRef.current);
      setSarvamRawTranslation('');
      setStatus('detecting', 'Analyzing captured frequencies...');

      const blob = await stopRecording();
      if (!blob || blob.size < 1000) {
        setStatus('idle', 'Frequencies below threshold. No speech recorded.');
        return;
      }
      await runPipeline(blob);
    } else {
      setStatus('recording', 'Microphone active — capturing continuous audio');
      try {
        await startRecording(selectedInputId);
        setIsRecording(true);
        setTimeout(() => setLiveAnalyser(analyserNode.current), 50);
      } catch {
        // error shown inside useMicrophone
      }
    }
  }, [isRecording, isProcessing, selectedInputId, startRecording, stopRecording,
      runPipeline, setIsRecording, setStatus, analyserNode]);

  const vadLabel = isRecording
    ? silenceProgress > 0.5
      ? `AUTO-STOP TRIGGER: ${Math.ceil((1 - silenceProgress) * 2.2)}s DELAY`
      : 'VAD LISTENING: SILENCE DETECTOR ACTIVE'
    : isProcessing
    ? offlineMode
      ? 'MESH ROUTING: RELAYING PACKET OVER BLUETOOTH'
      : smartMode ? 'PIPELINE ACTIVE: DEEPSEEK REFINEMENT IN PROGRESS' : 'PIPELINE ACTIVE: TRANSLATING SPEECH'
    : 'DIAL STANDBY: TAP BUTTON OR SPEAK TO TRIGGER';

  // Smooth scroll handler
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ── Run Landing Page Interactive Simulation ──
  const runDemoSimulation = async (langCode: string) => {
    if (demoStatus === 'recording' || demoStatus === 'processing') return;

    setDemoStatus('recording');
    setDemoTranscript('Connecting virtual earbuds microchip...');
    setDemoTranslation('');
    setDemoEmotion('');
    
    await new Promise(r => setTimeout(r, 1000));
    setDemoTranscript('Capturing voice waves: "..."');
    
    await new Promise(r => setTimeout(r, 1200));
    setDemoStatus('processing');
    
    let textIn = '';
    let textOut = '';
    let emotionDetected = 'Calm 😌';
    
    if (langCode === 'hi-IN') {
      textIn = 'नमस्ते, क्या आप मेरी मदद कर सकते हैं?';
      textOut = 'Hello, can you please help me?';
      emotionDetected = 'Concerned 😰';
    } else if (langCode === 'ta-IN') {
      textIn = 'எனக்கு தண்ணீர் வேண்டும், தாகமாக இருக்கிறது.';
      textOut = 'I need water, I am feeling thirsty.';
      emotionDetected = 'Tired 😢';
    } else if (langCode === 'bn-IN') {
      textIn = 'ডাক্তার কোথায় পাবো?';
      textOut = 'Where can I find a doctor?';
      emotionDetected = 'Anxious 😨';
    } else {
      textIn = 'Hello, thank you for translating.';
      textOut = 'नमस्ते, अनुवाद करने के लिए धन्यवाद।';
      emotionDetected = 'Happy 😊';
    }
    
    setDemoTranscript(textIn);
    await new Promise(r => setTimeout(r, 1200));
    setDemoTranslation(textOut);
    setDemoEmotion(emotionDetected);
    setDemoStatus('done');

    // Speech synthesize the output dynamically to wow the user!
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textOut);
      utterance.lang = langCode === 'en-IN' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // ── Run Real Voice Mic Translation on Landing Page ──
  const startRealMicDemoTranslation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition API is not supported in this browser. Try Google Chrome.");
      return;
    }

    setDemoStatus('recording');
    setDemoTranscript('Listening to your microphone... Speak now!');
    setDemoTranslation('');
    setDemoEmotion('');

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = demoLang;

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        if (!text) {
          setDemoStatus('idle');
          setDemoTranscript('No speech detected. Please try again.');
          return;
        }

        setDemoTranscript(text);
        setDemoStatus('processing');

        const targetDemoLang = demoLang === 'en-IN' ? 'hi-IN' : 'en-IN';

        try {
          const result = await translateText(text, demoLang, targetDemoLang);
          setDemoTranslation(result.translation);

          // Classify mood based on words
          const lowerText = text.toLowerCase();
          let mood = 'Neutral 😐';
          if (lowerText.includes('help') || lowerText.includes('मदद') || lowerText.includes('காப்பாத்து')) {
            mood = 'Concerned 😰';
          } else if (lowerText.includes('water') || lowerText.includes('தண்ணீர்') || lowerText.includes('पानी')) {
            mood = 'Tired 😢';
          } else if (lowerText.includes('thank') || lowerText.includes('धन्यवाद') || lowerText.includes('நன்றி')) {
            mood = 'Happy 😊';
          } else if (lowerText.includes('danger') || lowerText.includes('ஆபத்து') || lowerText.includes('खतरा')) {
            mood = 'Anxious 😨';
          }
          setDemoEmotion(mood);

          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(result.translation);
            utterance.lang = targetDemoLang;
            window.speechSynthesis.speak(utterance);
          }
        } catch (err) {
          const matched = matchOfflinePhrase(text, demoLang, targetDemoLang);
          const fallbackText = matched ? matched.targetText : `[Translated] ${text}`;
          setDemoTranslation(fallbackText);
          setDemoEmotion(matched ? `${matched.mood.toUpperCase()} 🎙️` : 'Neutral 😐');

          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(fallbackText);
            utterance.lang = targetDemoLang;
            window.speechSynthesis.speak(utterance);
          }
        }
        setDemoStatus('done');
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error in simulator:', event.error);
        setDemoStatus('idle');
        setDemoTranscript(`ASR Error: ${event.error}. Try again.`);
      };

      rec.onend = () => {
        setIsDemoMicActive(false);
      };

      rec.start();
      demoRecRef.current = rec;
      setIsDemoMicActive(true);

    } catch (e) {
      console.error(e);
      setDemoStatus('idle');
    }
  };

  const stopRealMicDemoTranslation = () => {
    if (demoRecRef.current) {
      demoRecRef.current.stop();
      demoRecRef.current = null;
      setIsDemoMicActive(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg text-text flex flex-col z-10 select-none overflow-x-hidden bg-grid-pattern">
      {/* Interactive Floating Constellation particles behind all content */}
      <InteractiveBackground />

      {/* ── Navigation Header ── */}
      <header className="fixed top-0 left-0 w-full z-50 border-b border-white/[0.04] bg-bg/85 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-zinc-950 font-bold shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Headphones className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-sm font-display uppercase tracking-widest text-text font-bold leading-none">EarTranslate</h1>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-none mt-1">Live Translation Hub</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-wider text-sub">
          <button onClick={() => scrollToSection('hardware-blueprint')} className="hover:text-accent transition-colors">Schematics</button>
          <button onClick={() => scrollToSection('features')} className="hover:text-accent transition-colors">Features</button>
          <button onClick={() => scrollToSection('how-it-works')} className="hover:text-accent transition-colors">How It Works</button>
          <button onClick={() => scrollToSection('sandbox')} className="hover:text-accent transition-colors">Sandbox Cockpit</button>
        </nav>

        <div className="flex items-center gap-3 font-mono">
          <div className="hidden sm:flex items-center gap-2 text-[9px] uppercase tracking-wider text-zinc-500 mr-2">
            <span className={`w-1.5 h-1.5 rounded-full ${
              offlineMode 
                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse' 
                : apiKeyOk 
                ? 'bg-accent shadow-[0_0_8px_rgba(0,255,200,0.6)] animate-pulse' 
                : 'bg-rose-500 animate-pulse'
            }`} />
            <span>SYS_STATUS: {offlineMode ? 'OFFLINE_MESH' : apiKeyOk ? 'ONLINE' : 'CONFIG_REQ'}</span>
          </div>
          <button 
            onClick={() => scrollToSection('sandbox')}
            className="px-4 py-2 rounded-lg bg-primary text-text text-xs uppercase tracking-wider font-semibold border border-primary/20 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Launch Sandbox
          </button>
        </div>
      </header>

      {/* ── Main Landing Page Canvas ── */}
      <div className="flex-1 flex flex-col pt-20">
        
        {/* Hero Section */}
        <section className="relative min-h-[92vh] flex items-center px-6 md:px-12 py-16 max-w-6xl mx-auto w-full z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
            {/* Hero details */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              <ScrollReveal direction="up" delay={100} duration={800}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-mono uppercase tracking-wider font-medium">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-accent" />
                  Self-Healing Bluetooth Mesh + Keras Voice Emotion Detection
                </div>
              </ScrollReveal>
              
              <ScrollReveal direction="up" delay={200} duration={800}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-tight">
                  Turn Any Earbuds Into <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">
                    A Live Translator.
                  </span>
                </h1>
              </ScrollReveal>
              
              <ScrollReveal direction="up" delay={300} duration={800}>
                <p className="text-sm md:text-base text-sub leading-relaxed max-w-xl font-sans font-light">
                  Speak into your standard Bluetooth earbuds microphone. Our engine captures your voice, auto-detects the spoken Indian tongue, transcribes, translates, and plays it back inside your ears in real-time. Works fully offline via a decentralized peer-to-peer Bluetooth mesh network in zero-connectivity environments!
                </p>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={400} duration={800}>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <button 
                    onClick={() => scrollToSection('sandbox')}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-text text-xs uppercase tracking-wider font-semibold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    Launch Sandbox Console
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => scrollToSection('hardware-blueprint')}
                    className="px-6 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:border-primary/40 text-text text-xs uppercase tracking-wider font-semibold transition-all duration-300 hover:bg-white/[0.06]"
                  >
                    Explore Blueprint
                  </button>
                </div>
              </ScrollReveal>
            </div>

            {/* Interactive Landing Page Simulator */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <ScrollReveal direction="left" delay={300} duration={1000} className="w-full">
                <div className="glass-card rounded-2xl border border-white/[0.08] p-6 shadow-[0_0_40px_rgba(0,255,200,0.06)] relative overflow-hidden flex flex-col gap-4">
                  <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-accent/30 via-primary/30 to-accent/30" />
                  
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-accent animate-pulse" />
                      <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Interactive Voice Simulator</span>
                    </div>
                    <span className="text-[8px] font-mono bg-accent/10 border border-accent/30 text-accent px-1.5 py-0.5 rounded uppercase font-bold">Live Test</span>
                  </div>

                  {/* Mode switcher tabs */}
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-lg border border-white/[0.04]">
                    <button
                      onClick={() => { setDemoMode('preset'); setDemoStatus('idle'); setDemoTranscript(''); setDemoTranslation(''); setDemoEmotion(''); }}
                      className={`py-1.5 rounded text-[9px] font-mono uppercase tracking-wider transition-all duration-200 ${
                        demoMode === 'preset' ? 'bg-primary/20 text-primary font-bold border border-primary/20' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Preset Demo
                    </button>
                    <button
                      onClick={() => { setDemoMode('real-mic'); setDemoStatus('idle'); setDemoTranscript(''); setDemoTranslation(''); setDemoEmotion(''); }}
                      className={`py-1.5 rounded text-[9px] font-mono uppercase tracking-wider transition-all duration-200 ${
                        demoMode === 'real-mic' ? 'bg-accent/20 text-accent font-bold border border-accent/20' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Use Real Mic 🎙️
                    </button>
                  </div>

                  {demoMode === 'real-mic' ? (
                    <p className="text-[11px] text-sub leading-normal font-sans font-light">
                      Click the button to start recording. Say an emergency phrase (e.g. Hindi: <code className="text-accent font-mono">मदद करो</code> or English: <code className="text-accent font-mono">need water</code>) and hear the audio response:
                    </p>
                  ) : (
                    <p className="text-[11px] text-sub leading-normal font-sans font-light">
                      Select a spoken tongue below, then trigger the simulated voice loop to see the full audio analysis, VAD frequency waveform, and translation:
                    </p>
                  )}

                  {/* Language selectors */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { code: 'hi-IN', label: 'HINDI', flag: '🇮🇳' },
                      { code: 'ta-IN', label: 'TAMIL', flag: '🇮🇳' },
                      { code: 'bn-IN', label: 'BENGALI', flag: '🇮🇳' },
                      { code: 'en-IN', label: 'ENGLISH', flag: '🇬🇧' },
                    ].map((l) => (
                      <button
                        key={l.code}
                        onClick={() => setDemoLang(l.code)}
                        className={`py-1.5 rounded-lg border text-[9px] font-mono flex flex-col items-center justify-center gap-0.5 transition-all duration-300 ${
                          demoLang === l.code
                            ? 'border-accent/40 bg-accent/10 text-accent font-semibold shadow-[0_0_8px_rgba(0,255,200,0.1)]'
                            : 'border-white/[0.04] bg-white/[0.02] text-zinc-400 hover:border-white/[0.1] hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="text-xs">{l.flag}</span>
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Trigger Simulator */}
                  {demoMode === 'real-mic' ? (
                    <button
                      onClick={isDemoMicActive ? stopRealMicDemoTranslation : startRealMicDemoTranslation}
                      className={`w-full py-2.5 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                        isDemoMicActive
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse'
                          : 'bg-accent/20 border-accent/30 hover:border-accent/50 text-accent hover:bg-accent/30 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      {isDemoMicActive ? 'TAP TO STOP RECORDING' : 'START REAL-TIME TRANSLATOR'}
                    </button>
                  ) : (
                    <button
                      onClick={() => runDemoSimulation(demoLang)}
                      disabled={demoStatus === 'recording' || demoStatus === 'processing'}
                      className={`w-full py-2.5 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                        demoStatus === 'recording'
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse'
                          : demoStatus === 'processing'
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                          : 'bg-primary/20 border-primary/30 hover:border-primary/50 text-primary hover:bg-primary/30 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      {demoStatus === 'recording'
                        ? 'Simulating Earbuds Mic Capture...'
                        : demoStatus === 'processing'
                        ? 'Auto Detecting & Translating...'
                        : 'Simulate Voice Speech'}
                    </button>
                  )}

                  {/* Output Simulation Panel */}
                  <div className="rounded-xl border border-white/[0.04] bg-zinc-950/80 p-3.5 flex flex-col gap-2.5 min-h-[110px] relative font-mono text-[10px] text-zinc-400">
                    {/* Live waveform animation during recording */}
                    {(demoStatus === 'recording' || isDemoMicActive) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 rounded-xl gap-1 z-15">
                        <span className="w-1 h-6 bg-rose-500 rounded animate-pulse" />
                        <span className="w-1 h-8 bg-rose-500 rounded animate-pulse delay-75" />
                        <span className="w-1 h-10 bg-rose-500 rounded animate-pulse delay-150" />
                        <span className="w-1 h-5 bg-rose-500 rounded animate-pulse delay-300" />
                        <span className="text-[9px] text-rose-300 font-mono tracking-widest uppercase ml-2">Active Capture</span>
                      </div>
                    )}

                    {/* Content Display */}
                    {!demoTranscript && !demoTranslation && (
                      <div className="flex-1 flex items-center justify-center text-zinc-600 italic text-center text-[9px]">
                        Pipeline standby. Select language and tap trigger.
                      </div>
                    )}

                    {demoTranscript && (
                      <div className="flex flex-col gap-1">
                        <span className="text-primary text-[8px] tracking-wider uppercase font-bold">Input Speech Captured</span>
                        <p className="text-zinc-300 font-sans text-xs italic">"{demoTranscript}"</p>
                      </div>
                    )}

                    {demoTranslation && (
                      <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-2 animate-fade-in">
                        <span className="text-accent text-[8px] tracking-wider uppercase font-bold">Translated Output Audio</span>
                        <p className="text-text font-sans text-xs font-bold">"{demoTranslation}"</p>
                      </div>
                    )}

                    {demoEmotion && (
                      <div className="flex items-center gap-1.5 self-end mt-1 animate-fade-in">
                        <span className="text-purple-400 text-[8px] uppercase tracking-wider font-bold">Emotion detected:</span>
                        <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] px-2 py-0.5 rounded font-bold">
                          {demoEmotion}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ── Advanced Hardware Blueprint Explorer Section ── */}
        <section id="hardware-blueprint" className="border-t border-white/[0.04] bg-zinc-950/20 py-24 px-6 md:px-12 w-full relative z-10">
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-10">
            <div className="text-center flex flex-col items-center gap-2 select-none">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">System Deconstruction</h3>
              <h2 className="text-2xl md:text-3xl font-display font-extrabold uppercase tracking-wide">Hardware Blueprint</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent mt-3 rounded-full" />
            </div>

            <EarbudExplorer />

            {/* Live Science Stats Dashboard Ticker */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
              <div className="glass-card rounded-xl border border-white/[0.06] p-5 flex flex-col gap-1.5 font-mono text-[10px] text-zinc-500 text-left relative overflow-hidden">
                <span className="w-1.5 h-1.5 rounded-full bg-accent absolute top-3 right-3 animate-pulse" />
                <span className="uppercase tracking-widest">Decentralized Nodes Online</span>
                <span className="text-2xl font-bold text-text font-mono mt-1 tracking-tight">{nodesCount.toLocaleString()}</span>
                <span className="text-[8px] text-zinc-600 mt-1">P2P Bluetooth LE coverage range</span>
              </div>
              <div className="glass-card rounded-xl border border-white/[0.06] p-5 flex flex-col gap-1.5 font-mono text-[10px] text-zinc-500 text-left relative overflow-hidden">
                <span className="w-1.5 h-1.5 rounded-full bg-primary absolute top-3 right-3 animate-pulse" />
                <span className="uppercase tracking-widest">Mesh Packets Relayed</span>
                <span className="text-2xl font-bold text-text font-mono mt-1 tracking-tight">{packetsRelayed.toLocaleString()}</span>
                <span className="text-[8px] text-zinc-600 mt-1">Real-time PCM chunks relayed</span>
              </div>
              <div className="glass-card rounded-xl border border-white/[0.06] p-5 flex flex-col gap-1.5 font-mono text-[10px] text-zinc-500 text-left relative overflow-hidden">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 absolute top-3 right-3 animate-pulse" />
                <span className="uppercase tracking-widest">Local Dictionary Hits</span>
                <span className="text-2xl font-bold text-text font-mono mt-1 tracking-tight">94.8%</span>
                <span className="text-[8px] text-zinc-600 mt-1">Instant offline lookup accuracy</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features grid section */}
        <section id="features" className="border-t border-white/[0.04] bg-white/[0.01] py-20 px-6 md:px-12 w-full">
          <div className="max-w-6xl mx-auto w-full flex flex-col gap-12">
            <div className="text-center flex flex-col items-center gap-2">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Linguistic Engineering</h3>
              <h2 className="text-2xl md:text-3xl font-display font-bold uppercase tracking-wide">Interface Capabilities</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent mt-2 rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Auto Language Detect',
                  desc: 'Never click input drop-downs. Sarvam Saaras v3 automatically detects which Indian language is spoken on the fly.',
                  icon: <Cpu className="w-5 h-5 text-accent" />
                },
                {
                  title: 'Voice Emotion Analyzer',
                  desc: 'Keras-trained voice classifier reads speech frequencies to identify speaker mood (anger, fear, sadness, happiness) in real-time.',
                  icon: <Activity className="w-5 h-5 text-purple-400" />
                },
                {
                  title: 'Offline Bluetooth Mesh',
                  desc: 'Decentralized networking. Share processing via nearby phones when there is no internet in disaster zones, subways, or rural areas.',
                  icon: <WifiOff className="w-5 h-5 text-amber-400" />
                },
                {
                  title: 'Deepseek-R1 Correct',
                  desc: 'Leverages Groq reasoning models to adjust context, detect tone registers, and translate with extreme cultural accuracy.',
                  icon: <Sparkles className="w-5 h-5 text-primary" />
                }
              ].map((item, index) => (
                <ScrollReveal key={item.title} direction="up" delay={150 * index} duration={700}>
                  <div className="glass-card glass-card-hover rounded-xl p-6 h-full flex flex-col gap-3 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-primary/30 to-accent/30 group-hover:from-primary group-hover:to-accent transition-all duration-300" />
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-white/[0.06] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <h4 className="text-sm font-display font-semibold text-text uppercase tracking-wide mt-1">{item.title}</h4>
                    <p className="text-xs text-sub leading-relaxed font-sans">{item.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works section with scroll reveal */}
        <section id="how-it-works" className="border-t border-white/[0.04] py-20 px-6 md:px-12 w-full relative z-10 bg-bg">
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-16">
            
            <div className="text-center flex flex-col items-center gap-2">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">Pipeline Operation</h3>
              <h2 className="text-2xl md:text-3xl font-display font-bold uppercase tracking-wide">Linguistic Cycle</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent mt-2 rounded-full" />
            </div>

            {/* Steps stream */}
            <div className="flex flex-col gap-16 md:gap-24">
              
              {/* Step 1 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-6 flex justify-center md:order-last">
                  <ScrollReveal direction="left" delay={150} duration={800} className="w-full max-w-[280px] rounded-xl overflow-hidden glass-card p-4 relative border border-white/[0.05]">
                    <img src="/step_connect.png" alt="Sync Bluetooth Earbuds" className="w-full h-auto object-contain rounded-lg" />
                  </ScrollReveal>
                </div>
                <div className="md:col-span-6 flex flex-col gap-4 text-left">
                  <ScrollReveal direction="right" delay={100} duration={800}>
                    <div className="text-xs font-mono text-primary font-bold uppercase tracking-wider">Step 01 // Input Sync</div>
                    <h3 className="text-xl md:text-2xl font-display font-bold uppercase tracking-wide text-text mt-1">Connect Your Earbuds</h3>
                    <p className="text-xs md:text-sm text-sub leading-relaxed font-sans mt-2">
                      Ensure your wireless earbuds are connected to your Windows computer or smartphone via standard Bluetooth settings. Click microphone authorization to let our engine discover the paired input microchip and speaker sink bus.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-sans text-accent mt-4">
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                      <span>Supports all Bluetooth v4.0+ hardware</span>
                    </div>
                  </ScrollReveal>
                </div>
              </div>

              {/* Step 2 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-6 flex justify-center">
                  <ScrollReveal direction="right" delay={150} duration={800} className="w-full max-w-[280px] rounded-xl overflow-hidden glass-card p-4 relative border border-white/[0.05]">
                    <img src="/step_speak.png" alt="Capture Spontaneous Speech" className="w-full h-auto object-contain rounded-lg" />
                  </ScrollReveal>
                </div>
                <div className="md:col-span-6 flex flex-col gap-4 text-left">
                  <ScrollReveal direction="left" delay={100} duration={800}>
                    <div className="text-xs font-mono text-secondary font-bold uppercase tracking-wider">Step 02 // Capture</div>
                    <h3 className="text-xl md:text-2xl font-display font-bold uppercase tracking-wide text-text mt-1">Speak Naturally In Any Tongue</h3>
                    <p className="text-xs md:text-sm text-sub leading-relaxed font-sans mt-2">
                      Hold the microphone dial or speak continuously. The local VAD (Voice Activity Detector) monitors audio frequencies. When you finish speaking and pause, the silence detector automatically halts capturing and forwards the sound waves.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-sans text-secondary mt-4">
                      <CheckCircle2 className="w-4 h-4 text-secondary" />
                      <span>Precision audio activity recognition</span>
                    </div>
                  </ScrollReveal>
                </div>
              </div>

              {/* Step 3 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-6 flex justify-center md:order-last">
                  <ScrollReveal direction="left" delay={150} duration={800} className="w-full max-w-[280px] rounded-xl overflow-hidden glass-card p-4 relative border border-white/[0.05]">
                    <img src="/step_translate.png" alt="Process and Route Speech" className="w-full h-auto object-contain rounded-lg" />
                  </ScrollReveal>
                </div>
                <div className="md:col-span-6 flex flex-col gap-4 text-left">
                  <ScrollReveal direction="right" delay={100} duration={800}>
                    <div className="text-xs font-mono text-accent font-bold uppercase tracking-wider">Step 03 // Route</div>
                    <h3 className="text-xl md:text-2xl font-display font-bold uppercase tracking-wide text-text mt-1">Hear Translation</h3>
                    <p className="text-xs md:text-sm text-sub leading-relaxed font-sans mt-2">
                      Sarvam's translation pipeline analyzes the voice. It auto-identifies the source Indian language (e.g. Hindi, Tamil, Telugu), translates it, refines the context with Deepseek-R1, and streams the translated voice back directly to your earbuds.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-sans text-primary mt-4">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>High fidelity Indian TTS voices</span>
                    </div>
                  </ScrollReveal>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Embedded Premium Sandbox Console ── */}
        <section id="sandbox" className="border-t border-white/[0.04] bg-zinc-950/60 py-24 px-6 md:px-12 w-full relative z-10">
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-10">
            
            <div className="text-center flex flex-col items-center gap-1.5 select-none mb-2">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">Interactive Sandbox</h3>
              <h2 className="text-2xl md:text-3xl font-display font-extrabold uppercase tracking-wide">Linguistic Cockpit</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent mt-3 rounded-full" />
            </div>

            {/* Sandbox single-card integrated dashboard container */}
            <div className="glass-card rounded-2xl border border-white/[0.08] shadow-[0_0_50px_rgba(99,102,241,0.06)] overflow-hidden relative hover:border-primary/20 transition-colors duration-500">
              
              {/* Premium Dashboard Header Bar */}
              <div className="bg-zinc-950/80 px-6 py-3.5 border-b border-white/[0.04] flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] text-zinc-500 select-none">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4.5 h-4.5 text-accent animate-pulse" />
                  <span className="text-text font-bold tracking-widest uppercase">SANDBOX ENGINE // TERMINAL</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      offlineMode 
                        ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse' 
                        : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                    }`} />
                    <span className="uppercase text-[9px] tracking-wider text-zinc-400">
                      {offlineMode ? 'DECENTRALIZED_MESH' : 'PIPELINE_OK'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="uppercase text-[9px] tracking-wider text-zinc-400">AUDIO_SYNC</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-text font-bold font-mono tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-white/[0.04]">{systemTime}</span>
                  </div>
                </div>
              </div>

              {/* Integrated Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.04] bg-white/[0.01]">
                
                {/* Left Column: Device & Engine Settings (Width: 5/12) */}
                <div className="lg:col-span-5 p-6 md:p-8 flex flex-col gap-6 bg-white/[0.01]">
                  
                  {offlineMode ? (
                    /* Mesh network layout when offline */
                    <div className="flex flex-col gap-6 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <span className="w-1.5 h-3 bg-amber-500 rounded animate-pulse" />
                          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-amber-400">Bluetooth Mesh RF Map</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[8px] uppercase tracking-widest font-bold animate-pulse">
                          Active Offline
                        </span>
                      </div>

                      <MeshVisualizer />

                      {/* Mesh logs */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Live Network Hops</span>
                        <div className="h-[100px] rounded-lg border border-white/[0.04] bg-zinc-950 p-3 font-mono text-[9px] text-zinc-400 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
                          {meshLogs.length === 0 ? (
                            <span className="text-zinc-600 italic">No packet routed yet. Record voice or select a template below.</span>
                          ) : (
                            meshLogs.map((log, idx) => (
                              <div key={idx} className="flex gap-1.5 items-start">
                                <span className="text-amber-500/80 font-bold">&gt;&gt;</span>
                                <span className="leading-normal">{log}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Quick triggers */}
                      <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-4">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Emergency Mesh Templates</span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: '🚨 Help Me', text: 'मदद करो' },
                            { label: '💧 Need Water', text: 'எனக்கு தண்ணீர் வேண்டும்' },
                            { label: '🩺 Call Doctor', text: 'डॉक्टर को बुलाओ' },
                            { label: '🧭 Way / Path', text: 'రాస్తా ఎక్కడ ఉంది' },
                          ].map((t) => (
                            <button
                              key={t.label}
                              disabled={isRecording || isProcessing}
                              onClick={() => {
                                useAppStore.setState({ currentTranscript: t.text });
                                runPipeline(new Blob([], { type: 'audio/webm' }));
                              }}
                              className="px-2.5 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/5 text-[9px] font-mono text-zinc-300 transition-all duration-200 uppercase tracking-wide hover:scale-105 active:scale-95 disabled:opacity-40"
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Standard Cloud controllers when online */
                    <div className="flex flex-col gap-6 animate-fade-in">
                      {/* Selector Block */}
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <span className="w-1 h-3 bg-primary rounded" />
                          <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Audio Bus Inputs</span>
                        </div>
                        <DeviceSelector
                          inputDevices={inputDevices}
                          outputDevices={outputDevices}
                          selectedInputId={selectedInputId}
                          selectedOutputId={selectedOutputId}
                          onInputChange={setSelectedInputId}
                          onOutputChange={setSelectedOutputId}
                          onRefresh={refreshDevices}
                          permissionGranted={permissionGranted}
                          onRequestPermission={requestPermission}
                          disabled={isRecording || isProcessing}
                        />
                      </div>
                    </div>
                  )}

                  {/* Engine Configuration (Common to both modes) */}
                  <div className="flex flex-col gap-4 pt-4 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-1 h-3 bg-secondary rounded" />
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Engine Configuration</span>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <LanguageSelector
                        value={targetLang}
                        onChange={setTargetLang}
                        disabled={isRecording || isProcessing}
                      />
                      
                      {!offlineMode && (
                        <SmartModeToggle
                          enabled={smartMode}
                          onToggle={setSmartMode}
                          groqReady={groqReady}
                          disabled={isRecording || isProcessing}
                        />
                      )}

                      {/* Offline Mode Switcher */}
                      <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                        offlineMode 
                          ? 'border-amber-500/30 bg-amber-500/[0.02] shadow-[0_0_15px_rgba(245,158,11,0.05)]' 
                          : 'border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08]'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                            offlineMode 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                              : 'bg-zinc-950 border-white/[0.06] text-zinc-400'
                          }`}>
                            <WifiOff className="w-4 h-4" />
                          </div>
                          <div className="text-left font-mono">
                            <p className="text-[10px] font-bold text-text uppercase tracking-widest leading-none">Offline Mesh</p>
                            <p className="text-[8px] text-zinc-500 tracking-wider mt-1.5 leading-none">Bluetooth Peer Relay</p>
                          </div>
                        </div>
                        
                        <button
                          id="offline-mesh-toggle"
                          disabled={isRecording || isProcessing}
                          onClick={() => setOfflineMode(!offlineMode)}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 border focus:outline-none flex items-center ${
                            offlineMode 
                              ? 'bg-amber-500/20 border-amber-500/40 justify-end text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                              : 'bg-zinc-950 border-white/[0.1] justify-start text-zinc-600'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full transition-all duration-300 ${
                            offlineMode ? 'bg-amber-400' : 'bg-zinc-600'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Record Dial & Live Workspace (Width: 7/12) */}
                <div className="lg:col-span-7 p-6 md:p-8 flex flex-col gap-6 bg-zinc-950/20">
                  
                  {/* Workspace cockpit */}
                  <div className={`flex flex-col items-center gap-6 p-4 rounded-xl border bg-zinc-950/40 relative transition-all duration-300 ${
                    offlineMode ? 'border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.02)]' : 'border-white/[0.03]'
                  }`}>
                    
                    {/* Dial button */}
                    <MicButton state={micState} onClick={handleMicClick} />

                    {/* VAD Label */}
                    <div className="text-center font-mono">
                      <p className={`text-[9px] uppercase tracking-widest font-bold transition-colors duration-300 ${
                        isRecording 
                          ? 'text-rose-400' 
                          : isProcessing 
                          ? offlineMode ? 'text-amber-400' : 'text-primary' 
                          : 'text-sub'
                      }`}>
                        {vadLabel}
                      </p>
                    </div>

                    {/* Oscilloscope visualizer */}
                    <div className="w-full h-14 rounded-lg border border-white/[0.05] bg-zinc-950 overflow-hidden relative p-1">
                      <WaveformVisualizer
                        analyserNode={liveAnalyser}
                        isActive={isRecording}
                        silenceProgress={silenceProgress}
                      />
                    </div>

                    {/* Confidence Chips */}
                    {detectedLanguage && !isRecording && (
                      <div className="flex justify-center w-full">
                        <DetectedLanguageBadge
                          languageName={detectedLanguageName}
                          languageCode={detectedLanguage}
                          confidence={detectedConfidence}
                        />
                      </div>
                    )}

                    {/* Status Logs */}
                    <StatusBar status={status} message={statusMessage} />
                  </div>

                  {/* Active Translation output results */}
                  {(currentTranscript || currentTranslation) && !isRecording && (
                    <div className="flex flex-col gap-4 w-full animate-fade-in">
                      <TranscriptPanel transcript={currentTranscript} languageName={detectedLanguageName} />
                      
                      {detectedEmotion && (
                        <div className="rounded-xl border border-purple-500/25 bg-purple-950/[0.02] p-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-purple-400 animate-fade-in shadow-[0_0_15px_rgba(168,85,247,0.04)]">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                            <span>Voice Mood Analysis</span>
                          </div>
                          <span className="font-bold">
                            {detectedEmotion.mood.toUpperCase()} (Class: {detectedEmotion.gender})
                          </span>
                        </div>
                      )}

                      {currentTranslation && (
                        <TranslationPanel
                          translation={currentTranslation}
                          targetLangName={getLanguageName(targetLang)}
                          targetLangCode={targetLang}
                        />
                      )}
                      
                      {smartResult && sarvamRawTranslation && (
                        <SmartInsightPanel result={smartResult} sarvamTranslation={sarvamRawTranslation} />
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Session Logger History (placed neatly below the cockpit deck) */}
            <ConversationHistory history={history} onClear={clearHistory} />

            {/* Credentials alert block */}
            {apiKeyOk === false && !offlineMode && (
              <div className="w-full rounded-xl p-5 border border-rose-500/20 bg-rose-500/5 text-rose-300 animate-fade-in flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-sans">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-300">Credentials Configuration Required</p>
                  <p className="text-[11px] leading-relaxed text-sub mt-1">
                    Add your credentials in <code className="bg-zinc-950 px-1.5 py-0.5 rounded border border-white/[0.04] text-zinc-400 font-semibold font-mono">server/.env</code> file. Get a free API credential at{' '}
                    <a href="https://dashboard.sarvam.ai" target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:text-accent transition-colors underline font-medium">dashboard.sarvam.ai</a>.
                  </p>
                </div>
              </div>
            )}

          </div>
        </section>

      </div>

      {/* ── Console Footer ── */}
      <footer className="relative z-10 text-center py-6 border-t border-white/[0.04] bg-zinc-950 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
        EarTranslate &middot; Systems Online &middot; Sarvam Audio &middot; Groq Deepseek-R1 &middot; 2026
      </footer>
    </div>
  );
}

export default App;
