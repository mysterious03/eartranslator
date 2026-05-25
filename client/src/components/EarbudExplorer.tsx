import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Mic, Volume2, Heart, ArrowRight, RotateCw } from 'lucide-react';

interface Hotspot {
  id: string;
  name: string;
  stageNumber: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  metrics: {
    label1: string;
    val1: string;
    label2: string;
    val2: string;
    label3: string;
    val3: string;
  };
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  type?: 'shell' | 'circuit' | 'nozzle' | 'eartip' | 'stem';
}

interface Face {
  indices: number[];
  type: 'shell' | 'nozzle' | 'eartip' | 'stem';
}

interface Edge {
  a: number;
  b: number;
}

interface FlowParticle {
  pathIndex: number;
  progress: number;
  speed: number;
}

interface SpaceDust {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
}

export const EarbudExplorer: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('hotspot-mic');
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Orbit control & simulation refs
  const anglesRef = useRef({ yaw: 0.5, pitch: 0.15 });
  const activeIdRef = useRef('hotspot-mic');
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<FlowParticle[]>([]);
  const containerSizeRef = useRef({ width: 500, height: 380 });
  const dustRef = useRef<SpaceDust[]>([]);

  const hotspots: Hotspot[] = [
    {
      id: 'hotspot-mic',
      name: 'VAD Mic Array',
      stageNumber: '01',
      icon: <Mic className="w-4 h-4" />,
      title: 'VAD Microphone Array (Capture)',
      desc: 'Dual high-sensitivity microphone array continuously sampling ambient sound. An embedded Voice Activity Detector (VAD) monitors RMS amplitude. Once silence is detected for 2200ms, it triggers package division.',
      metrics: {
        label1: 'SENSITIVITY',
        val1: '-38 dBV/Pa',
        label2: 'SAMPLE RATE',
        val2: '16.0 kHz',
        label3: 'BIT DEPTH',
        val3: '16-bit PCM',
      },
    },
    {
      id: 'hotspot-emotion',
      name: 'Keras Processor',
      stageNumber: '02',
      icon: <Heart className="w-4 h-4" />,
      title: 'Speech Emotion Classifier (Analysis)',
      desc: 'Processes raw audio wave metrics by extracting 216 Mel-frequency cepstral coefficients (MFCCs). Feeds this time-series vector into a programmatic CNN model to classify speaker emotion registers.',
      metrics: {
        label1: 'INFERENCE',
        val1: '45 ms',
        label2: 'MFCC METRICS',
        val2: '216 Coeffs',
        label3: 'ACCURACY',
        val3: '91.2% (Val)',
      },
    },
    {
      id: 'hotspot-mesh',
      name: 'Mesh Transceiver',
      stageNumber: '03',
      icon: <Cpu className="w-4 h-4" />,
      title: 'BLE Mesh Chipset (Routing)',
      desc: 'Encapsulates speech text + emotion metrics into light data packets. Relays them dynamically through nearby Bluetooth mesh nodes within 15 meters to reach the translation gateway.',
      metrics: {
        label1: 'RELAY DELAY',
        val1: '12 ms/hop',
        label2: 'MESH PROTOCOL',
        val2: 'P2P BLE mesh',
        label3: 'RF STRENGTH',
        val3: '-68 dBm avg',
      },
    },
    {
      id: 'hotspot-driver',
      name: 'Acoustic Driver',
      stageNumber: '04',
      icon: <Volume2 className="w-4 h-4" />,
      title: 'Sound Speaker Driver (Playback)',
      desc: 'Decodes the returned translation audio payload and pipes it through the 12mm speaker coil directly into the listener ear. Recreate speech tone and speed matching the detected emotion.',
      metrics: {
        label1: 'DIAMETER',
        val1: '12.0 mm',
        label2: 'FREQ. RANGE',
        val2: '20Hz - 20kHz',
        label3: 'OUTPUT GAIN',
        val3: '+1.5dB boost',
      },
    },
  ];

  const getStageIndex = (id: string): number => {
    if (id === 'hotspot-mic') return 0;
    if (id === 'hotspot-emotion') return 1;
    if (id === 'hotspot-mesh') return 2;
    return 3;
  };

  const activeIndex = getStageIndex(activeId);
  const activeHotspot = hotspots[activeIndex];

  // Sync activeId
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Generate Space Dust once
  useEffect(() => {
    const dust: SpaceDust[] = [];
    for (let i = 0; i < 30; i++) {
      dust.push({
        x: (Math.random() - 0.5) * 110,
        y: (Math.random() - 0.5) * 110,
        z: (Math.random() - 0.5) * 110,
        size: 0.5 + Math.random() * 1.5,
        brightness: 0.4 + Math.random() * 0.6
      });
    }
    dustRef.current = dust;
  }, []);

  // Programmatic 3D Geometry Generation (Asymmetric Ergonomic Earbud)
  const vertices: Point3D[] = [];
  const edges: Edge[] = [];
  const faces: Face[] = [];

  const addCircle = (x: number, yOffset: number, zOffset: number, r: number, pointsCount = 8, type: any = 'shell') => {
    const startIndex = vertices.length;
    for (let i = 0; i < pointsCount; i++) {
      const theta = (i / pointsCount) * Math.PI * 2;
      vertices.push({
        x,
        y: yOffset + r * Math.cos(theta),
        z: zOffset + r * Math.sin(theta),
        type
      });
    }
    for (let i = 0; i < pointsCount; i++) {
      edges.push({
        a: startIndex + i,
        b: startIndex + ((i + 1) % pointsCount)
      });
    }
    return startIndex;
  };

  const addQuadStrip = (sliceAStart: number, sliceBStart: number, count = 8, type: any = 'shell') => {
    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      faces.push({
        indices: [sliceAStart + i, sliceAStart + next, sliceBStart + next, sliceBStart + i],
        type
      });
    }
  };

  const addCapTriangles = (sliceStart: number, capIndex: number, count = 8, type: any = 'shell') => {
    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      faces.push({
        indices: [sliceStart + i, sliceStart + next, capIndex, sliceStart + i],
        type
      });
    }
  };

  // Upright Ergonomic Geometry: Bulb at the top (+Y offset), nozzle and stem pointing downwards (-Y offset)
  const c1 = addCircle(-25, 4, -3, 4.5, 8, 'eartip');
  const c2 = addCircle(-18, 5, -2, 7.5, 8, 'eartip');
  const c3 = addCircle(-12, 6, -1, 8.5, 8, 'eartip');
  const c4 = addCircle(-12, 6, -1, 3.8, 8, 'nozzle');
  const c5 = addCircle(-4, 8, 0, 3.8, 8, 'nozzle');
  const c6 = addCircle(-4, 8, 0, 10.5, 8, 'shell');
  const c7 = addCircle(2, 7, 0.5, 12.5, 8, 'shell');
  const c8 = addCircle(8, 6, 1.0, 11.5, 8, 'shell');
  const c9 = addCircle(14, 6, 0.5, 8.0, 8, 'shell');
  const c10 = addCircle(19, 5, 0, 4.5, 8, 'shell');
  
  vertices.push({ x: 21, y: 4, z: 0, type: 'shell' }); // Cap point
  const capIdx = vertices.length - 1;

  // Build faces / polygon skin
  addQuadStrip(c1, c2, 8, 'eartip');
  addQuadStrip(c2, c3, 8, 'eartip');
  addQuadStrip(c4, c5, 8, 'nozzle');
  addQuadStrip(c4, c3, 8, 'eartip'); 
  addQuadStrip(c5, c6, 8, 'shell');  
  addQuadStrip(c6, c7, 8, 'shell');
  addQuadStrip(c7, c8, 8, 'shell');
  addQuadStrip(c8, c9, 8, 'shell');
  addQuadStrip(c9, c10, 8, 'shell');
  addCapTriangles(c10, capIdx, 8, 'shell');

  // AirPods-style stem tail hanging straight DOWN (large negative Y offsets)
  const cStem1 = addCircle(8, -2, 2, 3.2, 6, 'stem');
  const cStem2 = addCircle(9, -10, 2.5, 2.9, 6, 'stem');
  const cStem3 = addCircle(10, -18, 3, 2.5, 6, 'stem');

  addQuadStrip(cStem1, cStem2, 6, 'stem');
  addQuadStrip(cStem2, cStem3, 6, 'stem');

  // Connect shell slices
  for (let i = 0; i < 8; i++) {
    edges.push({ a: c1 + i, b: c2 + i });
    edges.push({ a: c2 + i, b: c3 + i });
    edges.push({ a: c4 + i, b: c5 + i });
    edges.push({ a: c6 + i, b: c7 + i });
    edges.push({ a: c7 + i, b: c8 + i });
    edges.push({ a: c8 + i, b: c9 + i });
    edges.push({ a: c9 + i, b: c10 + i });
    edges.push({ a: c10 + i, b: capIdx });
  }
  for (let i = 0; i < 6; i++) {
    edges.push({ a: cStem1 + i, b: cStem2 + i });
    edges.push({ a: cStem2 + i, b: cStem3 + i });
    edges.push({ a: cStem1 + i, b: c8 + Math.floor(i * 8 / 6) });
  }

  // Spiral speaker coil inside housing (curved along Y center)
  const coilStart = vertices.length;
  for (let i = 0; i < 16; i++) {
    const theta = i * Math.PI * 0.8;
    const progress = i / 16;
    const radius = 2 + progress * 4;
    const cy_interpolated = 8 - progress * 2;
    const cz_interpolated = progress * 1;
    vertices.push({
      x: -3 + progress * 10,
      y: cy_interpolated + radius * Math.cos(theta),
      z: cz_interpolated + radius * Math.sin(theta),
      type: 'circuit'
    });
  }
  for (let i = 0; i < 15; i++) {
    edges.push({ a: coilStart + i, b: coilStart + i + 1 });
  }

  // Node placements in 3D
  const nodes3D = [
    { id: 'hotspot-mic', name: 'VAD Mic Array', x: -50, y: 35, z: 20 },
    { id: 'hotspot-emotion', name: 'Keras Processor', x: 50, y: 35, z: -20 },
    { id: 'hotspot-mesh', name: 'Mesh Transceiver', x: -50, y: -35, z: -20 },
    { id: 'hotspot-driver', name: 'Acoustic Driver', x: 50, y: -35, z: 20 },
  ];

  // Particle flow triggers
  const triggerParticles = () => {
    const maxActivePath = getStageIndex(activeIdRef.current);
    for (let pathIdx = 0; pathIdx < maxActivePath; pathIdx++) {
      if (Math.random() > 0.92) {
        particlesRef.current.push({
          pathIndex: pathIdx,
          progress: 0,
          speed: 0.008 + Math.random() * 0.005
        });
      }
    }
    particlesRef.current = particlesRef.current.filter(p => p.progress < 1);
  };

  // Drag orbit handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    anglesRef.current.yaw += dx * 0.007;
    anglesRef.current.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, anglesRef.current.pitch - dy * 0.007));
    
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !e.touches[0]) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    
    anglesRef.current.yaw += dx * 0.007;
    anglesRef.current.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, anglesRef.current.pitch - dy * 0.007));
    
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const dpr = window.devicePixelRatio || 1;
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        containerSizeRef.current = { width, height };
      }
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, []);

  // 3D RENDER LOOP
  useEffect(() => {
    let animationId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const { width, height } = containerSizeRef.current;
      const dpr = window.devicePixelRatio || 1;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const cx = width / 2;
      const cy = height / 2;
      const focalLength = 160;
      const cameraDistance = 150;
      const modelScale = Math.min(width, height) * 0.36;

      const angles = anglesRef.current;
      const cosYaw = Math.cos(angles.yaw);
      const sinYaw = Math.sin(angles.yaw);
      const cosPitch = Math.cos(angles.pitch);
      const sinPitch = Math.sin(angles.pitch);

      // 3D Projection Matrix (Corrected Y-axis alignment: positive Y is UP, negative Y is DOWN)
      const project = (x: number, y: number, z: number) => {
        const y1 = y * cosPitch - z * sinPitch;
        const z1 = y * sinPitch + z * cosPitch;

        const x2 = x * cosYaw + z1 * sinYaw;
        const z2 = -x * sinYaw + z1 * cosYaw;

        const scale = focalLength / (z2 + cameraDistance);
        const sx = cx + x2 * scale;
        const sy = cy - y1 * scale; // Inverted Y-axis projection to correct orientation
        
        return {
          sx,
          sy,
          xRot: x2,
          yRot: y1,
          zDepth: z2,
          scale,
          visible: (z2 + cameraDistance) > 10
        };
      };

      // ── Draw 3D space dust floating in scene volume ──
      dustRef.current.forEach(d => {
        const proj = project(d.x, d.y, d.z);
        if (proj.visible) {
          const depthAlpha = Math.max(0.1, Math.min(0.9, 1 - (proj.zDepth + 50) / 100));
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, d.size * proj.scale * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 255, 200, ${d.brightness * depthAlpha * 0.85})`;
          ctx.fill();
        }
      });

      // ── Draw Holographic circular projector platform at the base ──
      const platformY = -38; // Lower Y is down
      const segments = 32;
      const r = 38;
      
      // Platform circular ring
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2 - Date.now() * 0.0004;
        const px = r * Math.cos(theta);
        const pz = r * Math.sin(theta);
        const proj = project(px, platformY, pz);
        if (proj.visible) {
          if (i === 0) ctx.moveTo(proj.sx, proj.sy);
          else ctx.lineTo(proj.sx, proj.sy);
        }
      }
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.08)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Projector beam upward projections (beams go UP towards y=10)
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.02)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 8; i++) {
        const theta = (i / 8) * Math.PI * 2 + Date.now() * 0.0002;
        const px = r * 0.75 * Math.cos(theta);
        const pz = r * 0.75 * Math.sin(theta);
        const projStart = project(px, platformY, pz);
        const projEnd = project(px * 0.25, 10, pz * 0.25);
        if (projStart.visible && projEnd.visible) {
          ctx.beginPath();
          ctx.moveTo(projStart.sx, projStart.sy);
          ctx.lineTo(projEnd.sx, projEnd.sy);
          ctx.stroke();
        }
      }

      // ── Project vertices of solid earbud model ──
      const projectedPoints = vertices.map(v => 
        project(v.x * (modelScale / 40), v.y * (modelScale / 40), v.z * (modelScale / 40))
      );

      // Define 3D Light source vector (glistening angle)
      const lightVec = { x: 0.3, y: 0.85, z: -0.45 };
      const lightLen = Math.sqrt(lightVec.x * lightVec.x + lightVec.y * lightVec.y + lightVec.z * lightVec.z);
      lightVec.x /= lightLen;
      lightVec.y /= lightLen;
      lightVec.z /= lightLen;

      // ── 3D Solid Polygon Faces Rendering (Painter's Depth Sorting) ──
      const sortedFaces = faces.map((face, index) => {
        let sumDepth = 0;
        face.indices.forEach(idx => {
          sumDepth += projectedPoints[idx].zDepth;
        });
        const avgDepth = sumDepth / face.indices.length;

        return {
          face,
          avgDepth,
          index
        };
      }).sort((a, b) => b.avgDepth - a.avgDepth);

      sortedFaces.forEach(sf => {
        const f = sf.face;
        const pts = f.indices.map(idx => vertices[idx]);
        
        if (pts.length >= 3) {
          const v1 = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y, z: pts[1].z - pts[0].z };
          const v2 = { x: pts[2].x - pts[0].x, y: pts[2].y - pts[0].y, z: pts[2].z - pts[0].z };
          const norm = {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
          };
          const normLen = Math.sqrt(norm.x * norm.x + norm.y * norm.y + norm.z * norm.z);
          
          if (normLen > 0.001) {
            norm.x /= normLen;
            norm.y /= normLen;
            norm.z /= normLen;
          }

          // Shading intensity
          const dot = norm.x * lightVec.x + norm.y * lightVec.y + norm.z * lightVec.z;
          const shadingVal = Math.max(0.1, Math.abs(dot)); 
          const depthAlpha = Math.max(0.1, Math.min(0.9, 1 - (sf.avgDepth + 30) / 75));

          // Draw filled face
          ctx.beginPath();
          f.indices.forEach((idx, fIdx) => {
            const p = projectedPoints[idx];
            if (fIdx === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          });
          ctx.closePath();

          if (f.type === 'eartip') {
            ctx.fillStyle = `rgba(113, 113, 122, ${0.05 * shadingVal * depthAlpha})`;
            ctx.strokeStyle = `rgba(113, 113, 122, ${0.12 * shadingVal * depthAlpha})`;
          } else if (f.type === 'nozzle') {
            ctx.fillStyle = `rgba(99, 102, 241, ${0.08 * shadingVal * depthAlpha})`;
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.25 * shadingVal * depthAlpha})`;
          } else if (f.type === 'stem') {
            ctx.fillStyle = `rgba(0, 240, 200, ${0.06 * shadingVal * depthAlpha})`;
            ctx.strokeStyle = `rgba(0, 255, 200, ${0.2 * shadingVal * depthAlpha})`;
          } else {
            ctx.fillStyle = `rgba(0, 240, 200, ${0.06 * shadingVal * depthAlpha})`;
            ctx.strokeStyle = `rgba(0, 255, 200, ${0.3 * shadingVal * depthAlpha})`;
          }
          
          ctx.lineWidth = 0.4;
          ctx.fill();
          ctx.stroke();
        }
      });

      // ── Draw Acoustical Grill Mesh inside eartip nozzle opening ──
      for (let i = 0; i < 4; i++) {
        const pA = projectedPoints[c1 + i];
        const pB = projectedPoints[c1 + ((i + 4) % 8)];
        if (pA.visible && pB.visible) {
          const depthAlpha = Math.max(0.15, Math.min(0.9, 1 - (pA.zDepth + 30) / 75));
          ctx.strokeStyle = `rgba(113, 113, 122, ${0.45 * depthAlpha})`;
          ctx.lineWidth = 0.35;
          ctx.beginPath();
          ctx.moveTo(pA.sx, pA.sy);
          ctx.lineTo(pB.sx, pB.sy);
          ctx.stroke();
        }
      }

      // ── Draw Internal Circuit Wireframes ──
      edges.forEach(edge => {
        const pA = projectedPoints[edge.a];
        const pB = projectedPoints[edge.b];
        const type = vertices[edge.a].type;

        if (type === 'circuit' && pA.visible && pB.visible) {
          const avgDepth = (pA.zDepth + pB.zDepth) / 2;
          const depthAlpha = Math.max(0.12, Math.min(0.9, 1 - (avgDepth + 30) / 75));
          
          ctx.strokeStyle = activeIdRef.current === 'hotspot-driver' ? 'rgba(0, 255, 200, 0.7)' : 'rgba(99, 102, 241, 0.3)';
          ctx.lineWidth = activeIdRef.current === 'hotspot-driver' ? 0.8 : 0.45;
          ctx.globalAlpha = depthAlpha;
          
          ctx.beginPath();
          ctx.moveTo(pA.sx, pA.sy);
          ctx.lineTo(pB.sx, pB.sy);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1.0;

      // ── Draw Stem Details (Gold Charging Contacts + LED Indicator) ──
      
      // Charging Contact 1
      const projC1 = project(10 * (modelScale / 40), -17.8 * (modelScale / 40), 1.5 * (modelScale / 40));
      if (projC1.visible) {
        const depthAlpha = Math.max(0.15, Math.min(0.9, 1 - (projC1.zDepth + 30) / 75));
        ctx.beginPath();
        ctx.arc(projC1.sx, projC1.sy, 0.85 * projC1.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 179, 8, ${0.75 * depthAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(202, 138, 4, ${0.85 * depthAlpha})`;
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }

      // Charging Contact 2
      const projC2 = project(11.5 * (modelScale / 40), -17.8 * (modelScale / 40), 3.2 * (modelScale / 40));
      if (projC2.visible) {
        const depthAlpha = Math.max(0.15, Math.min(0.9, 1 - (projC2.zDepth + 30) / 75));
        ctx.beginPath();
        ctx.arc(projC2.sx, projC2.sy, 0.85 * projC2.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 179, 8, ${0.75 * depthAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(202, 138, 4, ${0.85 * depthAlpha})`;
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }

      // Glowing LED Indicator on Stem
      const projLed = project(9.5 * (modelScale / 40), -8.5 * (modelScale / 40), 3.4 * (modelScale / 40));
      if (projLed.visible) {
        const depthAlpha = Math.max(0.2, Math.min(1.0, 1 - (projLed.zDepth + 30) / 75));
        ctx.beginPath();
        ctx.arc(projLed.sx, projLed.sy, 0.9 * projLed.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 200, ${depthAlpha})`;
        ctx.shadowColor = '#00ffc8';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // ── Project and position 3D mind map node cards ──
      const projectedNodes = nodes3D.map(node => {
        const proj = project(node.x * (modelScale / 42), node.y * (modelScale / 42), node.z * (modelScale / 42));
        return {
          ...node,
          ...proj,
          isFront: proj.zDepth < 0
        };
      });

      // Position DOM overlay cards
      projectedNodes.forEach(node => {
        const el = document.getElementById(`node-card-${node.id}`);
        if (el) {
          const depthAlpha = Math.max(0.15, Math.min(1.0, 1 - (node.zDepth + 35) / 80));
          const scale = Math.max(0.65, Math.min(1.15, 1 - node.zDepth / 160));
          
          el.style.left = `${node.sx}px`;
          el.style.top = `${node.sy}px`;
          el.style.transform = `translate(-50%, -50%) scale(${scale})`;
          el.style.opacity = `${activeIdRef.current === node.id ? 1.0 : depthAlpha}`;
          el.style.zIndex = node.isFront ? '30' : '10';
        }
      });

      // ── Draw 3D workflow connecting lines between nodes ──
      const stageIdx = getStageIndex(activeIdRef.current);
      
      const drawWorkflowPath = (nodeA: typeof projectedNodes[0], nodeB: typeof projectedNodes[0], isActive: boolean, strokeStyle: string) => {
        if (!nodeA.visible || !nodeB.visible) return;
        
        ctx.beginPath();
        ctx.moveTo(nodeA.sx, nodeA.sy);
        const midX = (nodeA.sx + nodeB.sx) / 2 + (nodeA.sy - nodeB.sy) * 0.1;
        const midY = (nodeA.sy + nodeB.sy) / 2 + (nodeB.sx - nodeA.sx) * 0.1;
        ctx.quadraticCurveTo(midX, midY, nodeB.sx, nodeB.sy);

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = isActive ? 1.15 : 0.45;
        if (isActive) {
          ctx.setLineDash([3, 3]);
        } else {
          ctx.setLineDash([1, 4]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // Path 1: Mic -> Emotion
      drawWorkflowPath(
        projectedNodes[0], 
        projectedNodes[1], 
        stageIdx >= 1, 
        stageIdx >= 1 ? 'rgba(0, 255, 200, 0.7)' : 'rgba(63, 63, 70, 0.4)'
      );

      // Path 2: Emotion -> Mesh
      drawWorkflowPath(
        projectedNodes[1], 
        projectedNodes[2], 
        stageIdx >= 2, 
        stageIdx >= 2 ? 'rgba(0, 255, 200, 0.7)' : 'rgba(63, 63, 70, 0.4)'
      );

      // Path 3: Mesh -> Driver
      drawWorkflowPath(
        projectedNodes[2], 
        projectedNodes[3], 
        stageIdx >= 3, 
        stageIdx >= 3 ? 'rgba(0, 255, 200, 0.7)' : 'rgba(63, 63, 70, 0.4)'
      );

      // ── Animate flowing particles along active paths ──
      particlesRef.current.forEach(p => {
        let nodeSrc = projectedNodes[p.pathIndex];
        let nodeTgt = projectedNodes[p.pathIndex + 1];
        if (!nodeSrc || !nodeTgt) return;

        const midX = (nodeSrc.sx + nodeTgt.sx) / 2 + (nodeSrc.sy - nodeTgt.sy) * 0.1;
        const midY = (nodeSrc.sy + nodeTgt.sy) / 2 + (nodeTgt.sx - nodeSrc.sx) * 0.1;

        const x1 = nodeSrc.sx + (midX - nodeSrc.sx) * p.progress;
        const y1 = nodeSrc.sy + (midY - nodeSrc.sy) * p.progress;
        const x2 = midX + (nodeTgt.sx - midX) * p.progress;
        const y2 = midY + (nodeTgt.sy - midY) * p.progress;

        const px = x1 + (x2 - x1) * p.progress;
        const py = y1 + (y2 - y1) * p.progress;

        ctx.beginPath();
        ctx.arc(px, py, 2.0, 0, Math.PI * 2);
        ctx.fillStyle = '#00ffc8';
        ctx.shadowColor = '#00ffc8';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ── Active target halo indicator ──
      const activeProjNode = projectedNodes[stageIdx];
      if (activeProjNode && activeProjNode.visible) {
        ctx.beginPath();
        ctx.arc(activeProjNode.sx, activeProjNode.sy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = activeIdRef.current === 'hotspot-mic' ? 'rgba(239, 68, 68, 0.45)' :
                          activeIdRef.current === 'hotspot-emotion' ? 'rgba(168, 85, 247, 0.45)' :
                          activeIdRef.current === 'hotspot-mesh' ? 'rgba(99, 102, 241, 0.45)' :
                          'rgba(0, 255, 200, 0.45)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      ctx.restore();

      // Trigger & update particles
      triggerParticles();
      particlesRef.current.forEach(p => {
        p.progress += p.speed;
      });

      // Auto rotation velocity decay
      if (!isDraggingRef.current) {
        anglesRef.current.yaw += 0.0028; 
        anglesRef.current.pitch = anglesRef.current.pitch * 0.985 + 0.16 * 0.015;
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="glass-card rounded-2xl border border-white/[0.08] p-6 shadow-[0_0_40px_rgba(99,102,241,0.04)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-primary/30 to-accent/30" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: 3D Holographic Mind Map Canvas (Width: 7/12) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative bg-zinc-950/70 rounded-xl border border-white/[0.04] h-[380px] overflow-hidden select-none bg-grid-pattern">
          
          {/* Sci-fi Blueprint Border Grid Marks */}
          <div className="absolute inset-2 border border-white/[0.02] pointer-events-none" />
          <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-zinc-700 pointer-events-none" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-zinc-700 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-zinc-700 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-zinc-700 pointer-events-none" />

          {/* Hologram details */}
          <div className="absolute top-3 left-4 font-mono text-[8px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(0,255,200,0.6)]" />
            <span>Interactive 3D Ergonomic Hologram</span>
          </div>

          <div className="absolute top-3 right-4 font-mono text-[8px] text-zinc-500 uppercase tracking-widest flex items-center gap-1 z-10">
            <RotateCw className="w-2.5 h-2.5 text-zinc-650 animate-spin-slow" />
            <span>3D ORIENTATION CORRECT</span>
          </div>

          {/* 3D Orbit Control Canvas */}
          <canvas 
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
          />

          {/* Floating HTML overlay cards placed dynamically at projected 3D coordinates */}
          {hotspots.map((node) => {
            const isActive = activeId === node.id;
            
            return (
              <div
                key={node.id}
                id={`node-card-${node.id}`}
                onClick={() => setActiveId(node.id)}
                className={`absolute w-34 py-2 px-2.5 rounded-lg border backdrop-blur-md cursor-pointer transition-all duration-200 select-none flex flex-col gap-1 z-10 ${
                  isActive
                    ? node.id === 'hotspot-mic'
                      ? 'border-rose-500/80 bg-rose-950/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                      node.id === 'hotspot-emotion'
                      ? 'border-purple-500/80 bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]' :
                      node.id === 'hotspot-mesh'
                      ? 'border-primary/80 bg-primary/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]' :
                      'border-accent/80 bg-accent/20 shadow-[0_0_15px_rgba(0,255,200,0.2)]'
                    : 'border-white/[0.04] bg-zinc-950/75 hover:border-zinc-700/60 hover:bg-zinc-900/90'
                }`}
                style={{
                  pointerEvents: 'auto',
                  transformOrigin: 'center center',
                  transition: 'opacity 0.1s ease, border-color 0.2s ease'
                }}
              >
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-1">
                  <span className={`font-mono text-[7px] font-bold ${
                    isActive
                      ? node.id === 'hotspot-mic' ? 'text-rose-400' :
                        node.id === 'hotspot-emotion' ? 'text-purple-400' :
                        node.id === 'hotspot-mesh' ? 'text-primary' :
                        'text-accent'
                      : 'text-zinc-500'
                  }`}>
                    {node.stageNumber} // STAGE
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isActive 
                      ? node.id === 'hotspot-mic' ? 'bg-rose-400 animate-pulse' :
                        node.id === 'hotspot-emotion' ? 'bg-purple-400 animate-pulse' :
                        node.id === 'hotspot-mesh' ? 'bg-primary animate-pulse' :
                        'bg-accent animate-pulse'
                      : 'bg-zinc-800'
                  }`} />
                </div>
                
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`p-1 rounded text-zinc-300 ${
                    isActive 
                      ? node.id === 'hotspot-mic' ? 'text-rose-300 bg-rose-950/45' :
                        node.id === 'hotspot-emotion' ? 'text-purple-300 bg-purple-950/45' :
                        node.id === 'hotspot-mesh' ? 'text-primary/80 bg-primary/20' :
                        'text-accent/80 bg-accent/20'
                      : 'bg-zinc-900 text-zinc-550'
                  }`}>
                    {node.icon}
                  </div>
                  <span className={`font-mono text-[8px] font-bold uppercase tracking-wider ${isActive ? 'text-text' : 'text-zinc-400'}`}>
                    {node.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Spec Card (Width: 5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-4 text-left animate-fade-in">
          
          {/* Stage Progression Banner */}
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-xs font-bold ${
                activeId === 'hotspot-mic' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' :
                activeId === 'hotspot-emotion' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                activeId === 'hotspot-mesh' ? 'bg-primary/20 text-primary border border-primary/20' :
                'bg-accent/20 text-accent border border-accent/20'
              }`}>
                {activeHotspot.stageNumber}
              </span>
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Data Flow Stage</span>
            </div>
            
            <div className="flex items-center gap-1 text-[8px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-white/[0.04]">
              <span>ACTIVE STAGE</span>
              <ArrowRight className="w-2.5 h-2.5 text-accent" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              activeId === 'hotspot-mic' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
              activeId === 'hotspot-emotion' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
              activeId === 'hotspot-mesh' ? 'bg-primary/10 border-primary/30 text-primary' :
              'bg-accent/10 border-accent/30 text-accent'
            }`}>
              {activeHotspot.icon}
            </div>
            <div>
              <h4 className="font-mono text-[8px] uppercase tracking-widest text-zinc-500 leading-none">Stage Title</h4>
              <h3 className="text-sm font-display font-bold uppercase tracking-wide text-text mt-1.5">{activeHotspot.title}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
            <p className="text-xs text-sub leading-relaxed font-sans font-light">
              {activeHotspot.desc}
            </p>
          </div>

          {/* Micro spec metrics */}
          <div className="grid grid-cols-3 gap-3 font-mono text-[9px]">
            <div className="p-2.5 rounded border border-white/[0.03] bg-zinc-950/20 text-center">
              <span className="text-zinc-500 block tracking-wider uppercase">{activeHotspot.metrics.label1}</span>
              <span className={`font-bold mt-1.5 block ${
                activeId === 'hotspot-mic' ? 'text-rose-400' :
                activeId === 'hotspot-emotion' ? 'text-purple-400' :
                activeId === 'hotspot-mesh' ? 'text-primary' :
                'text-accent'
              }`}>
                {activeHotspot.metrics.val1}
              </span>
            </div>
            <div className="p-2.5 rounded border border-white/[0.03] bg-zinc-950/20 text-center">
              <span className="text-zinc-500 block tracking-wider uppercase">{activeHotspot.metrics.label2}</span>
              <span className="text-text font-bold mt-1.5 block">
                {activeHotspot.metrics.val2}
              </span>
            </div>
            <div className="p-2.5 rounded border border-white/[0.03] bg-zinc-950/20 text-center">
              <span className="text-zinc-500 block tracking-wider uppercase">{activeHotspot.metrics.label3}</span>
              <span className="text-emerald-400 font-bold mt-1.5 block uppercase">
                {activeHotspot.metrics.val3}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarbudExplorer;
