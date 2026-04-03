import type { Conductor, CableDesign } from '../types/cable';

/**
 * Calculate positions for conductors arranged in a circle inside the cable.
 * Uses the geometric relationship: r / sin(π/n) = (R - r) where
 * R = inner radius available, r = conductor outer radius (with insulation), n = number of conductors
 */
export function calculateCircularPositions(
  conductorCount: number,
  conductorRadius: number,
  insulationThickness: number,
  availableRadius: number,
  startAngle: number = -Math.PI / 2 // start from top
): { x: number; y: number; angle: number }[] {
  if (conductorCount <= 0) return [];

  const outerConductorRadius = conductorRadius + insulationThickness;

  if (conductorCount === 1) {
    return [{ x: 0, y: 0, angle: 0 }];
  }

  // Distance from center to conductor center
  // Using: sin(π/n) = r / (R_center) where R_center = distance from cable center to conductor center
  // And R_center + r <= availableRadius, so R_center = availableRadius - r
  const pitchRadius = availableRadius - outerConductorRadius;
  const angleStep = (2 * Math.PI) / conductorCount;

  const positions = [];
  for (let i = 0; i < conductorCount; i++) {
    const angle = startAngle + i * angleStep;
    positions.push({
      x: pitchRadius * Math.cos(angle),
      y: pitchRadius * Math.sin(angle),
      angle,
    });
  }
  return positions;
}

/**
 * Calculate the minimum outer radius needed to fit n conductors of given radius
 * arranged in a circle.
 */
export function calculateMinimumOuterRadius(
  conductorCount: number,
  conductorRadius: number,
  insulationThickness: number,
  sheathThickness: number = 2
): number {
  const outerConductorRadius = conductorRadius + insulationThickness;

  if (conductorCount === 1) {
    return outerConductorRadius + sheathThickness;
  }

  // R_pitch = r / sin(π/n), and outerRadius = R_pitch + r + sheath
  const pitchRadius = outerConductorRadius / Math.sin(Math.PI / conductorCount);
  return pitchRadius + outerConductorRadius + sheathThickness;
}

/**
 * Calculate area of a conductor
 */
export function conductorArea(radius: number): number {
  return Math.PI * radius * radius;
}

/**
 * Calculate total copper area
 */
export function totalConductorArea(conductors: Conductor[]): number {
  return conductors.reduce((sum, c) => sum + conductorArea(c.radius), 0);
}

/**
 * Calculate insulation area for a conductor
 */
export function insulationArea(conductorRadius: number, insulationThickness: number): number {
  const outerR = conductorRadius + insulationThickness;
  return Math.PI * (outerR * outerR - conductorRadius * conductorRadius);
}

/**
 * Calculate fill factor: ratio of conductor area to total cable area
 */
export function fillFactor(design: CableDesign): number {
  const totalCopper = totalConductorArea(design.conductors);
  const totalCable = Math.PI * design.outerRadius * design.outerRadius;
  return totalCopper / totalCable;
}

/**
 * Standard conductor sizes (cross-sectional area in mm²) per IEC 60228
 */
export const STANDARD_CONDUCTOR_SIZES = [
  0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185,
  240, 300, 400, 500, 630, 800, 1000,
];

/**
 * Convert cross-sectional area (mm²) to radius (mm)
 */
export function areaToRadius(areaMm2: number): number {
  return Math.sqrt(areaMm2 / Math.PI);
}

/**
 * Convert radius (mm) to cross-sectional area (mm²)
 */
export function radiusToArea(radiusMm: number): number {
  return Math.PI * radiusMm * radiusMm;
}

/**
 * Standard insulation colors per IEC 60446
 */
export const CONDUCTOR_COLORS: Record<string, string> = {
  'Brown (L1)': '#8B4513',
  'Black (L2)': '#1a1a1a',
  'Grey (L3)': '#808080',
  'Blue (N)': '#0066CC',
  'Green-Yellow (PE)': '#00AA00',
  'Red': '#CC0000',
  'White': '#F5F5F5',
  'Orange': '#FF8C00',
  'Yellow': '#FFD700',
  'Violet': '#8B008B',
};

/**
 * Standard layer colors
 */
export const LAYER_COLORS: Record<string, string> = {
  conductor: '#B87333',     // copper
  insulation: '#2196F3',    // blue PVC
  screen: '#C0C0C0',        // metallic silver
  sheath: '#333333',        // dark grey
  armor: '#A9A9A9',         // steel grey
  filler: '#E8D5B7',        // beige
  bedding: '#666666',       // grey
  jacket: '#1a1a1a',        // black
};
