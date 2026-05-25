import { useState, useEffect, useCallback, useRef } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
  isBluetooth: boolean;
  isDefault: boolean;
}

interface UseAudioDevicesReturn {
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  selectedInputId: string;
  selectedOutputId: string;
  setSelectedInputId: (id: string) => void;
  setSelectedOutputId: (id: string) => void;
  refreshDevices: () => Promise<void>;
  permissionGranted: boolean;
  requestPermission: () => Promise<void>;
}

function isBluetoothDevice(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes('bluetooth') ||
    lower.includes('wireless') ||
    lower.includes('airpods') ||
    lower.includes('earbuds') ||
    lower.includes('headset') ||
    lower.includes('buds') ||
    lower.includes('tws') ||
    lower.includes('headphone') ||
    lower.includes('earphone')
  );
}

function mapDevice(d: MediaDeviceInfo, defaultId: string): AudioDevice {
  return {
    deviceId: d.deviceId,
    label: d.label || `${d.kind === 'audioinput' ? 'Microphone' : 'Speaker'} (${d.deviceId.slice(0, 8)})`,
    isBluetooth: isBluetoothDevice(d.label),
    isDefault: d.deviceId === 'default' || d.deviceId === defaultId,
  };
}

export function useAudioDevices(): UseAudioDevicesReturn {
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string>('default');
  const [selectedOutputId, setSelectedOutputId] = useState<string>('default');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => mapDevice(d, 'default'));

      const outputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => mapDevice(d, 'default'));

      setInputDevices(inputs);
      setOutputDevices(outputs);

      // Auto-select Bluetooth devices if found
      const btInput = inputs.find((d) => d.isBluetooth);
      const btOutput = outputs.find((d) => d.isBluetooth);

      if (btInput) setSelectedInputId((prev) => prev === 'default' ? btInput.deviceId : prev);
      if (btOutput) setSelectedOutputId((prev) => prev === 'default' ? btOutput.deviceId : prev);

    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      // Must request permission before labels are available
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionGranted(true);
      // Stop the permission-probe stream immediately
      stream.getTracks().forEach((t) => t.stop());
      await enumerateDevices();
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setPermissionGranted(false);
    }
  }, [enumerateDevices]);

  const refreshDevices = useCallback(async () => {
    await enumerateDevices();
  }, [enumerateDevices]);

  // Listen for device changes (e.g. user connects/disconnects earbuds)
  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    // Try enumerating without permission first (labels may be empty)
    enumerateDevices();
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  return {
    inputDevices,
    outputDevices,
    selectedInputId,
    selectedOutputId,
    setSelectedInputId,
    setSelectedOutputId,
    refreshDevices,
    permissionGranted,
    requestPermission,
  };
}
