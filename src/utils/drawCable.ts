import type { CableDesign, CableLayer, Conductor, DimensionLine } from '../types/cable';

interface DrawContext {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  scale: number; // pixels per mm
}

/**
 * Draw the complete cable cross-section onto a canvas
 */
export function drawCableCrossSection(
  canvas: HTMLCanvasElement,
  design: CableDesign,
  options: {
    zoom: number;
    panX: number;
    panY: number;
    highlightedLayerId?: string | null;
    highlightedConductorId?: string | null;
    selectedConductorId?: string | null;
    dimensionLines?: DimensionLine[];
  }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { zoom, panX, panY } = options;

  // Clear canvas
  ctx.fillStyle = design.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate scale: fit cable in canvas with padding
  const padding = 60;
  const availableSize = Math.min(canvas.width, canvas.height) - padding * 2;
  const baseScale = availableSize / (design.outerRadius * 2);
  const scale = baseScale * zoom;

  const centerX = canvas.width / 2 + panX;
  const centerY = canvas.height / 2 + panY;

  const drawCtx: DrawContext = { ctx, centerX, centerY, scale };

  // Draw layers from outermost to innermost
  const sortedLayers = [...design.layers].sort((a, b) => b.radius - a.radius);

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;
    drawLayer(drawCtx, layer, options.highlightedLayerId === layer.id);
  }

  // Draw conductors
  for (const conductor of design.conductors) {
    const isHighlighted = options.highlightedConductorId === conductor.id;
    const isSelected = options.selectedConductorId === conductor.id;
    drawConductor(drawCtx, conductor, isHighlighted, isSelected);
  }

  // Draw dimension lines
  if (design.showDimensions && options.dimensionLines) {
    for (const dim of options.dimensionLines) {
      drawDimensionLine(drawCtx, dim);
    }
  }

  // Draw geometry overlay
  if (design.showGeometry) {
    drawGeometryOverlay(drawCtx, design);
  }

  // Draw labels
  if (design.showLabels) {
    drawLabels(drawCtx, design);
  }
}

function drawLayer(drawCtx: DrawContext, layer: CableLayer, highlighted: boolean): void {
  const { ctx, centerX, centerY, scale } = drawCtx;
  const pixelRadius = layer.radius * scale;

  ctx.beginPath();
  ctx.arc(centerX, centerY, pixelRadius, 0, Math.PI * 2);

  ctx.fillStyle = applyOpacity(layer.color, highlighted ? Math.min(layer.opacity + 0.2, 1) : layer.opacity);
  ctx.fill();

  ctx.strokeStyle = highlighted ? '#FF6600' : darken(layer.color, 0.3);
  ctx.lineWidth = highlighted ? 2.5 : 1.5;
  ctx.stroke();
}

function drawConductor(
  drawCtx: DrawContext,
  conductor: Conductor,
  highlighted: boolean,
  selected: boolean
): void {
  const { ctx, centerX, centerY, scale } = drawCtx;

  const cx = centerX + conductor.position.x * scale;
  const cy = centerY + conductor.position.y * scale;
  const conductorPixelRadius = conductor.radius * scale;
  const insulationPixelRadius = (conductor.radius + conductor.insulationThickness) * scale;

  // Draw insulation
  ctx.beginPath();
  ctx.arc(cx, cy, insulationPixelRadius, 0, Math.PI * 2);
  ctx.fillStyle = applyOpacity(conductor.insulationColor, 0.7);
  ctx.fill();
  ctx.strokeStyle = darken(conductor.insulationColor, 0.3);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw conductor
  ctx.beginPath();
  ctx.arc(cx, cy, conductorPixelRadius, 0, Math.PI * 2);

  if (conductor.stranded && conductor.strandCount && conductorPixelRadius > 8) {
    drawStrandedConductor(ctx, cx, cy, conductorPixelRadius, conductor.color, conductor.strandCount);
  } else {
    ctx.fillStyle = conductor.color;
    ctx.fill();
  }

  // Conductor outline
  ctx.beginPath();
  ctx.arc(cx, cy, conductorPixelRadius, 0, Math.PI * 2);
  ctx.strokeStyle = selected ? '#FF0000' : highlighted ? '#FF6600' : darken(conductor.color, 0.4);
  ctx.lineWidth = selected ? 3 : highlighted ? 2 : 1;
  ctx.stroke();

  // Selection ring
  if (selected) {
    ctx.beginPath();
    ctx.arc(cx, cy, insulationPixelRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawStrandedConductor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  strandCount: number
): void {
  // Draw base conductor circle
  ctx.fillStyle = darken(color, 0.1);
  ctx.fill();

  // Draw strand pattern
  const layers = Math.ceil(Math.sqrt(strandCount / 3));
  ctx.fillStyle = color;

  for (let layer = 0; layer <= layers; layer++) {
    const layerRadius = (radius * layer) / (layers + 1);
    const strandsInLayer = layer === 0 ? 1 : Math.max(6, layer * 6);

    for (let i = 0; i < strandsInLayer; i++) {
      const angle = (2 * Math.PI * i) / strandsInLayer;
      const sx = cx + layerRadius * Math.cos(angle);
      const sy = cy + layerRadius * Math.sin(angle);
      const strandRadius = radius / (layers + 2);

      ctx.beginPath();
      ctx.arc(sx, sy, strandRadius, 0, Math.PI * 2);
      ctx.fillStyle = lighten(color, 0.15);
      ctx.fill();
      ctx.strokeStyle = darken(color, 0.2);
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

function drawDimensionLine(drawCtx: DrawContext, dim: DimensionLine): void {
  const { ctx, centerX, centerY, scale } = drawCtx;

  const x1 = centerX + dim.from.x * scale;
  const y1 = centerY + dim.from.y * scale;
  const x2 = centerX + dim.to.x * scale;
  const y2 = centerY + dim.to.y * scale;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = dim.color || '#FF6600';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrow heads
  const angle = Math.atan2(y2 - y1, x2 - x1);
  drawArrowHead(ctx, x1, y1, angle, dim.color);
  drawArrowHead(ctx, x2, y2, angle + Math.PI, dim.color);

  // Label
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const labelAngle = angle + (Math.abs(angle) > Math.PI / 2 ? Math.PI : 0);

  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(labelAngle);
  ctx.fillStyle = dim.color || '#FF6600';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(dim.label, 0, -8);
  ctx.restore();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string
): void {
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - 0.4), y - size * Math.sin(angle - 0.4));
  ctx.lineTo(x - size * Math.cos(angle + 0.4), y - size * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fillStyle = color || '#FF6600';
  ctx.fill();
}

function drawGeometryOverlay(drawCtx: DrawContext, design: CableDesign): void {
  const { ctx, centerX, centerY, scale } = drawCtx;

  if (design.conductors.length < 2) return;

  // Draw lines from center to each conductor
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255, 102, 0, 0.6)';
  ctx.lineWidth = 1;

  for (const conductor of design.conductors) {
    const cx = centerX + conductor.position.x * scale;
    const cy = centerY + conductor.position.y * scale;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }

  // Draw pitch circle
  if (design.conductors.length > 1) {
    const firstConductor = design.conductors[0];
    const pitchRadius = Math.sqrt(
      firstConductor.position.x ** 2 + firstConductor.position.y ** 2
    );

    ctx.beginPath();
    ctx.arc(centerX, centerY, pitchRadius * scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 102, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Draw center point
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FF6600';
  ctx.fill();

  // Label 'O'
  ctx.fillStyle = '#FF6600';
  ctx.font = 'bold 14px serif';
  ctx.fillText('O', centerX + 8, centerY + 5);
}

function drawLabels(drawCtx: DrawContext, design: CableDesign): void {
  const { ctx, centerX, centerY, scale } = drawCtx;

  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';

  for (let i = 0; i < design.conductors.length; i++) {
    const conductor = design.conductors[i];
    const cx = centerX + conductor.position.x * scale;
    const cy = centerY + conductor.position.y * scale;
    const labelRadius = (conductor.radius + conductor.insulationThickness) * scale + 16;

    // Position label outside the insulation
    const angle = Math.atan2(conductor.position.y, conductor.position.x);
    const lx = cx + (labelRadius > 20 ? 0 : labelRadius * Math.cos(angle));
    const ly = cy - (conductor.radius + conductor.insulationThickness) * scale - 12;

    // Background
    const text = conductor.name || `C${i + 1}`;
    const metrics = ctx.measureText(text);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(lx - metrics.width / 2 - 3, ly - 11, metrics.width + 6, 16);

    ctx.fillStyle = '#333';
    ctx.fillText(text, lx, ly);
  }
}

// Color utility functions
function applyOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function darken(hex: string, amount: number): string {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) + (255 - parseInt(hex.slice(1, 3), 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) + (255 - parseInt(hex.slice(3, 5), 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) + (255 - parseInt(hex.slice(5, 7), 16)) * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Export the canvas as an image
 */
export function exportCanvasAsImage(
  canvas: HTMLCanvasElement,
  format: 'png' | 'svg' = 'png',
  filename: string = 'cable-cross-section'
): void {
  const dataUrl = canvas.toDataURL(`image/${format === 'svg' ? 'png' : format}`);
  const link = document.createElement('a');
  link.download = `${filename}.${format === 'svg' ? 'png' : format}`;
  link.href = dataUrl;
  link.click();
}
