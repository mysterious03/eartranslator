import React from 'react';
import { Mic, Volume2, Bluetooth, RefreshCw, AlertCircle } from 'lucide-react';
import type { AudioDevice } from '../hooks/useAudioDevices';

interface DeviceSelectorProps {
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  selectedInputId: string;
  selectedOutputId: string;
  onInputChange: (id: string) => void;
  onOutputChange: (id: string) => void;
  onRefresh: () => void;
  permissionGranted: boolean;
  onRequestPermission: () => void;
  disabled?: boolean;
}

function DeviceOption({ device }: { device: AudioDevice }) {
  return (
    <option value={device.deviceId} className="bg-surface text-text">
      {device.isBluetooth ? '🔵 ' : '  '}
      {device.label}
      {device.isDefault ? ' (default)' : ''}
    </option>
  );
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  inputDevices,
  outputDevices,
  selectedInputId,
  selectedOutputId,
  onInputChange,
  onOutputChange,
  onRefresh,
  permissionGranted,
  onRequestPermission,
  disabled,
}) => {
  const hasBluetoothInput = inputDevices.some((d) => d.isBluetooth);
  const hasBluetoothOutput = outputDevices.some((d) => d.isBluetooth);
  const selectedInput = inputDevices.find((d) => d.deviceId === selectedInputId);
  const selectedOutput = outputDevices.find((d) => d.deviceId === selectedOutputId);
  const inputIsBT = selectedInput?.isBluetooth ?? false;
  const outputIsBT = selectedOutput?.isBluetooth ?? false;

  if (!permissionGranted) {
    return (
      <div className="glass-card rounded-xl p-5 flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Bluetooth className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-display font-semibold text-text uppercase tracking-wide">
            Audio Configuration Required
          </span>
        </div>
        <p className="text-xs text-sub leading-relaxed font-sans">
          EarTranslate needs microphone and audio output channel sync to route real-time speech translations directly into your Bluetooth earbuds.
        </p>
        <button
          id="grant-mic-permission-button"
          onClick={onRequestPermission}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-300 font-semibold font-display text-xs uppercase tracking-wider active:scale-[0.98]"
        >
          <Mic className="w-3.5 h-3.5 animate-pulse" />
          Authorize System Microphones
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5 flex flex-col gap-4">
      {/* Selector Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bluetooth
            className="w-4 h-4"
            style={{ color: (hasBluetoothInput || hasBluetoothOutput) ? '#00FFC8' : '#6e7391' }}
          />
          <span className="text-xs font-display font-semibold text-text uppercase tracking-wider">
            Audio System Bus
          </span>
          {(hasBluetoothInput || hasBluetoothOutput) && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-medium uppercase tracking-wider animate-pulse">
              Bluetooth active
            </span>
          )}
        </div>

        <button
          id="refresh-devices-button"
          onClick={onRefresh}
          title="Refresh audio lists"
          className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]"
          disabled={disabled}
        >
          <RefreshCw className="w-3.5 h-3.5 text-sub hover:text-accent transition-colors" />
        </button>
      </div>

      {/* Warnings */}
      {inputDevices.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          No input devices detected. Ensure your earbuds are paired and click refresh.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Mic Select */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mic-device-select" className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-sub">
            <Mic className="w-3 h-3" />
            Mic Input Channel
            {inputIsBT && <span className="text-[10px] text-accent font-semibold">🔵 BT</span>}
          </label>
          <div className="relative">
            <select
              id="mic-device-select"
              value={selectedInputId}
              onChange={(e) => onInputChange(e.target.value)}
              disabled={disabled || inputDevices.length === 0}
              className={`
                appearance-none w-full pl-3.5 pr-8 py-2.5 rounded-lg text-xs font-sans text-text cursor-pointer 
                transition-all focus:outline-none focus:border-primary disabled:opacity-40 bg-zinc-950/80
                ${inputIsBT ? 'border-accent/40 text-accent' : 'border-white/[0.08]'} border
              `}
            >
              <option value="default" className="bg-surface text-text">Default Microphone</option>
              {inputDevices.map((d) => <DeviceOption key={d.deviceId} device={d} />)}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sub text-[10px]">▼</div>
          </div>
        </div>

        {/* Output Select */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="speaker-device-select" className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-sub">
            <Volume2 className="w-3 h-3" />
            Earbuds Out channel
            {outputIsBT && <span className="text-[10px] text-accent font-semibold">🔵 BT</span>}
          </label>
          <div className="relative">
            <select
              id="speaker-device-select"
              value={selectedOutputId}
              onChange={(e) => onOutputChange(e.target.value)}
              disabled={disabled || outputDevices.length === 0}
              className={`
                appearance-none w-full pl-3.5 pr-8 py-2.5 rounded-lg text-xs font-sans text-text cursor-pointer 
                transition-all focus:outline-none focus:border-primary disabled:opacity-40 bg-zinc-950/80
                ${outputIsBT ? 'border-accent/40 text-accent' : 'border-white/[0.08]'} border
              `}
            >
              <option value="default" className="bg-surface text-text">Default Speaker Output</option>
              {outputDevices.map((d) => <DeviceOption key={d.deviceId} device={d} />)}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sub text-[10px]">▼</div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DeviceSelector;
