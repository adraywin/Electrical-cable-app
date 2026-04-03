export interface CableLayer {
  id: string;
  name: string;
  type: 'conductor' | 'insulation' | 'screen' | 'sheath' | 'armor' | 'filler' | 'bedding' | 'jacket';
  radius: number; // outer radius in mm
  color: string;
  opacity: number;
  visible: boolean;
}

export interface Conductor {
  id: string;
  name: string;
  radius: number; // conductor radius in mm
  insulationThickness: number; // insulation thickness in mm
  color: string; // conductor color
  insulationColor: string;
  position: { x: number; y: number }; // position relative to cable center
  angle: number; // angle in radians for arranged conductors
  stranded: boolean;
  strandCount?: number;
}

export interface CableDesign {
  id: string;
  name: string;
  description: string;
  outerRadius: number; // overall cable outer radius in mm
  layers: CableLayer[];
  conductors: Conductor[];
  arrangement: ConductorArrangement;
  conductorCount: number;
  showDimensions: boolean;
  showLabels: boolean;
  showGeometry: boolean;
  backgroundColor: string;
  created: string;
  modified: string;
}

export type ConductorArrangement =
  | 'circular'    // conductors arranged in a circle
  | 'sector'      // sector-shaped conductors
  | 'custom';     // free placement

export interface DimensionLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
  color: string;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf';
  width: number;
  height: number;
  dpi: number;
  includeLabels: boolean;
  includeDimensions: boolean;
  backgroundColor: string;
}

export type ToolMode = 'select' | 'pan' | 'dimension' | 'label';
