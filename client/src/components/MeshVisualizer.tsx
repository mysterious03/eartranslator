import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Smartphone, Wifi, WifiOff, HelpCircle, Activity } from 'lucide-react';

interface NodeCoords {
  id: string;
  name: string;
  x: number;
  y: number;
  rssi: number;
  battery: number;
  role: string;
}

export const MeshVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { status, offlineMode, addMeshLog } = useAppStore();
  const [hoveredNode, setHoveredNode] = useState<NodeCoords | null>(null);

  // Track online status of nodes: Users can toggle them offline by clicking!
  const [nodeStatus, setNodeStatus] = useState<Record<string, boolean>>({
    'node-self': true,
    'node-pixel': true,
    'node-iphone': true,
    'node-galaxy': true,
  });

  const [activeStep, setActiveStep] = useState<number>(0);

  // Node attributes
  const nodes: NodeCoords[] = [
    { id: 'node-self', name: 'Your Phone', x: 70, y: 130, rssi: 0, battery: 94, role: 'Source (Your Node)' },
    { id: 'node-pixel', name: 'Pixel 8 Pro', x: 180, y: 60, rssi: -62, battery: 78, role: 'Primary Relay Node' },
    { id: 'node-iphone', name: 'iPhone 15 Pro', x: 180, y: 200, rssi: -71, battery: 85, role: 'Backup Relay Node' },
    { id: 'node-galaxy', name: 'Galaxy S24', x: 300, y: 130, rssi: -84, battery: 61, role: 'Gateway (Local ML Host)' },
  ];

  // Canvas click to toggle node online/offline
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of nodes) {
      if (node.id === 'node-self' || node.id === 'node-galaxy') continue; // Always online
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist < 22) {
        const isOnlineNow = !nodeStatus[node.id];
        setNodeStatus(prev => ({ ...prev, [node.id]: isOnlineNow }));
        addMeshLog(`[Mesh Router] ${node.name} is now ${isOnlineNow ? 'ONLINE (Pulsing)' : 'OFFLINE (Disconnected)'}`);
        break;
      }
    }
  };

  // Hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: NodeCoords | null = null;
    for (const node of nodes) {
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist < 22) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  };

  // Calculate dynamic routing path
  const getActivePath = (): string[] => {
    const path: string[] = ['node-self'];
    if (nodeStatus['node-pixel']) {
      path.push('node-pixel');
    } else if (nodeStatus['node-iphone']) {
      path.push('node-iphone');
    }
    path.push('node-galaxy');
    return path;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let frame = 0;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw mesh connection paths
      const path = getActivePath();
      const pixelOnline = nodeStatus['node-pixel'];
      const iphoneOnline = nodeStatus['node-iphone'];

      // Draw connections
      const drawLink = (n1: string, n2: string, isActive: boolean) => {
        const node1 = nodes.find(n => n.id === n1)!;
        const node2 = nodes.find(n => n.id === n2)!;
        ctx.beginPath();
        ctx.moveTo(node1.x, node1.y);
        ctx.lineTo(node2.x, node2.y);

        if (isActive) {
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)'; // Amber active link
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -frame * 0.5;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'; // Disabled line
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // Draw lines based on routing
      const hasRelay = pixelOnline || iphoneOnline;
      drawLink('node-self', 'node-pixel', pixelOnline && path.includes('node-pixel'));
      drawLink('node-self', 'node-iphone', !pixelOnline && iphoneOnline && path.includes('node-iphone'));
      drawLink('node-pixel', 'node-galaxy', pixelOnline && path.includes('node-pixel'));
      drawLink('node-iphone', 'node-galaxy', !pixelOnline && iphoneOnline && path.includes('node-iphone'));
      
      // If no relay is online, show network partition alert
      if (!hasRelay) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(nodes[3].x, nodes[3].y);
        ctx.stroke();
      }

      // ── Animate data packet along active path ──
      if (offlineMode && hasRelay && (status === 'detecting' || status === 'translating' || status === 'speaking')) {
        let pctProgress = (frame % 60) / 60; // 0 to 1 loop
        
        let startNodeId = 'node-self';
        let endNodeId = 'node-galaxy';
        let packetColor = '#f59e0b'; // Amber

        if (status === 'detecting') {
          // Hop 1: Self -> Relay Node
          startNodeId = 'node-self';
          endNodeId = path[1]; // Pixel or iPhone
          setActiveStep(1);
        } else if (status === 'translating') {
          // Hop 2: Relay Node -> Gateway
          startNodeId = path[1];
          endNodeId = 'node-galaxy';
          packetColor = '#a855f7'; // Purple processing
          setActiveStep(2);
        } else if (status === 'speaking') {
          // Hop 3: Gateway -> Self (return text)
          startNodeId = 'node-galaxy';
          endNodeId = 'node-self';
          packetColor = '#00ffc8'; // Cyan reply
          setActiveStep(3);
        }

        const startNode = nodes.find(n => n.id === startNodeId)!;
        const endNode = nodes.find(n => n.id === endNodeId)!;

        const px = startNode.x + (endNode.x - startNode.x) * pctProgress;
        const py = startNode.y + (endNode.y - startNode.y) * pctProgress;

        // Draw packet glow
        const gradient = ctx.createRadialGradient(px, py, 1, px, py, 10);
        gradient.addColorStop(0, packetColor);
        gradient.addColorStop(0.5, packetColor + '33');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (status === 'recording') {
        setActiveStep(0);
      } else if (status === 'done') {
        setActiveStep(4);
      }

      // Pulsing indicator rings
      nodes.forEach(node => {
        const online = nodeStatus[node.id];
        if (online) {
          const r = ((frame * 0.5) % 20) + 12;
          const op = 1 - (r - 12) / 20;
          ctx.strokeStyle = node.id === 'node-self' && status === 'recording'
            ? `rgba(239, 68, 68, ${op * 0.4})` // Red mic pulse
            : `rgba(245, 158, 11, ${op * 0.3})`; // Amber signal pulse
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Render Nodes
      nodes.forEach(node => {
        const online = nodeStatus[node.id];
        const isHovered = hoveredNode?.id === node.id;
        const canToggle = node.id !== 'node-self' && node.id !== 'node-galaxy';

        ctx.shadowBlur = isHovered ? 15 : 6;
        ctx.shadowColor = online
          ? node.id === 'node-self'
            ? 'rgba(99, 102, 241, 0.4)'
            : node.id === 'node-galaxy'
            ? 'rgba(168, 85, 247, 0.4)'
            : 'rgba(245, 158, 11, 0.4)'
          : 'rgba(239, 68, 68, 0.4)';

        // Node center
        ctx.fillStyle = online
          ? node.id === 'node-self'
            ? '#6366f1' // Indigo
            : node.id === 'node-galaxy'
            ? '#a855f7' // Purple
            : '#f59e0b' // Amber
          : '#ef4444'; // Red offline

        ctx.beginPath();
        ctx.arc(node.x, node.y, isHovered ? 14 : 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Border outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, isHovered ? 15 : 13, 0, Math.PI * 2);
        ctx.stroke();

        // Node label
        ctx.fillStyle = '#f4f4f5';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.x, node.y - 18);

        // Status indicator badge
        ctx.fillStyle = online ? '#a1a1aa' : '#f87171';
        ctx.font = '7px monospace';
        let subText = online ? `${node.rssi}dBm` : 'OFFLINE';
        if (node.id === 'node-self') subText = 'OWNER';
        ctx.fillText(subText, node.x, node.y + 20);

        // Click indicators for relays
        if (canToggle) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.font = '6px sans-serif';
          ctx.fillText('⚡ TOGGLE', node.x, node.y + 28);
        }
      });

      // No relay connection warning text
      if (!hasRelay) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ MESH PARTITIONED: RELAYS OFFLINE', canvas.width / 2, canvas.height - 15);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [nodeStatus, status, offlineMode, hoveredNode]);

  // Mesh explainer steps mapping
  const steps = [
    { title: '1. Broadcast', desc: 'No internet. Phone packatizes audio into a tiny 4.2KB chunk and broadcasts it via Bluetooth LE.' },
    { title: '2. Mesh Relay', desc: 'Nearby peer node (Pixel or iPhone) catches the signal and relays it to extend distance range.' },
    { title: '3. ML Gateway', desc: 'Galaxy S24 hosts localized dictionary & translation matrix, computing translation offline.' },
    { title: '4. Speak Out', desc: 'Translation routes back. Bluetooth earbuds trigger local text-to-speech synthesis (TTS).' }
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      
      {/* Dynamic Canvas Container */}
      <div className="relative w-full h-[220px] border border-white/[0.05] rounded-xl overflow-hidden bg-zinc-950/80 flex items-center justify-center">
        
        {/* Title */}
        <div className="absolute top-2.5 left-3 select-none font-mono text-[8px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Interactive Mesh (Click relays to disconnect them)</span>
        </div>

        <canvas
          ref={canvasRef}
          width={370}
          height={200}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
          className="w-full h-full cursor-pointer"
        />

        {/* Hover Popup Overlay */}
        {hoveredNode && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 rounded-lg border border-white/[0.08] bg-zinc-900/95 backdrop-blur-sm text-[9px] font-mono text-zinc-300 flex items-center justify-between animate-fade-in z-20">
            <div>
              <p className="text-text font-bold uppercase tracking-wider">{hoveredNode.name}</p>
              <p className="text-zinc-500 text-[8px] mt-0.5">{hoveredNode.role}</p>
            </div>
            <div className="text-right flex flex-col gap-0.5">
              <p><span className="text-zinc-500">RSSI:</span> <span className="text-amber-500 font-bold">{nodeStatus[hoveredNode.id] ? `${hoveredNode.rssi} dBm` : 'N/A'}</span></p>
              <p><span className="text-zinc-500">BATTERY:</span> <span className="text-emerald-400 font-bold">{hoveredNode.battery}%</span></p>
              <p><span className="text-zinc-500">STATUS:</span> <span className={nodeStatus[hoveredNode.id] ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold'}>{nodeStatus[hoveredNode.id] ? 'ONLINE' : 'DISCONNECTED'}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Explainer Step Cards */}
      <div className="grid grid-cols-2 gap-2">
        {steps.map((s, idx) => {
          const isCurrent = activeStep === idx + 1 || (activeStep === 0 && idx === 0) || (activeStep === 4 && idx === 3);
          return (
            <div
              key={s.title}
              className={`p-2.5 rounded-lg border text-left font-mono transition-all duration-300 ${
                isCurrent
                  ? 'border-amber-500/35 bg-amber-500/[0.04] shadow-[0_0_12px_rgba(245,158,11,0.03)]'
                  : 'border-white/[0.04] bg-white/[0.01] opacity-50 hover:opacity-75'
              }`}
            >
              <h5 className={`text-[9px] font-bold uppercase tracking-wider ${isCurrent ? 'text-amber-400' : 'text-zinc-400'}`}>{s.title}</h5>
              <p className="text-[8px] text-zinc-500 leading-normal mt-1 font-sans">{s.desc}</p>
            </div>
          );
        })}
      </div>

    </div>
  );
};
export default MeshVisualizer;
