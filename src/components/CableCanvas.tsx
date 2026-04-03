import { useRef, useEffect, useState, useCallback } from 'react';
import type { CableDesign, DimensionLine } from '../types/cable';
import { drawCableCrossSection, exportCanvasAsImage } from '../utils/drawCable';

interface CableCanvasProps {
  design: CableDesign;
  highlightedLayerId: string | null;
  highlightedConductorId: string | null;
  selectedConductorId: string | null;
  onSelectConductor: (id: string | null) => void;
  dimensionLines: DimensionLine[];
}

export function CableCanvas({
  design,
  highlightedLayerId,
  highlightedConductorId,
  selectedConductorId,
  onSelectConductor,
  dimensionLines,
}: CableCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({
          width: Math.floor(width * window.devicePixelRatio),
          height: Math.floor(height * window.devicePixelRatio),
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Redraw on changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    drawCableCrossSection(canvas, design, {
      zoom,
      panX: pan.x,
      panY: pan.y,
      highlightedLayerId,
      highlightedConductorId,
      selectedConductorId,
      dimensionLines,
    });
  }, [design, zoom, pan, canvasSize, highlightedLayerId, highlightedConductorId, selectedConductorId, dimensionLines]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(10, prev * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0 && e.altKey) {
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    } else if (e.button === 0) {
      // Check if clicked on a conductor
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      const mouseX = (e.clientX - rect.left) * dpr;
      const mouseY = (e.clientY - rect.top) * dpr;

      const padding = 60;
      const availableSize = Math.min(canvas.width, canvas.height) - padding * 2;
      const baseScale = availableSize / (design.outerRadius * 2);
      const scale = baseScale * zoom;
      const centerX = canvas.width / 2 + pan.x;
      const centerY = canvas.height / 2 + pan.y;

      let found = false;
      for (const conductor of design.conductors) {
        const cx = centerX + conductor.position.x * scale;
        const cy = centerY + conductor.position.y * scale;
        const dist = Math.sqrt((mouseX - cx) ** 2 + (mouseY - cy) ** 2);
        const clickRadius = (conductor.radius + conductor.insulationThickness) * scale;

        if (dist <= clickRadius) {
          onSelectConductor(conductor.id);
          found = true;
          break;
        }
      }
      if (!found) {
        onSelectConductor(null);
      }
    }
  }, [design, zoom, pan, onSelectConductor]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = (e.clientX - lastMouse.x) * window.devicePixelRatio;
      const dy = (e.clientY - lastMouse.y) * window.devicePixelRatio;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastMouse]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleExport = useCallback((format: 'png' | 'svg') => {
    const canvas = canvasRef.current;
    if (canvas) {
      exportCanvasAsImage(canvas, format, design.name.replace(/\s+/g, '-'));
    }
  }, [design.name]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className="cable-canvas-container" ref={containerRef}>
      <div className="canvas-toolbar">
        <button onClick={() => setZoom(prev => Math.min(10, prev * 1.2))} title="Zoom In">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 5V9M5 7H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))} title="Zoom Out">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5 7H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button onClick={resetView} title="Reset View">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2H6V6H2z M10 2H14V6H10z M2 10H6V14H2z M10 10H14V14H10z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <div className="toolbar-spacer" />
        <button onClick={() => handleExport('png')} title="Export PNG">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          PNG
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: isPanning ? 'grabbing' : 'crosshair' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
