import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CableDesign, CableLayer, Conductor, ConductorArrangement } from '../types/cable';
import {
  calculateCircularPositions,
  calculateMinimumOuterRadius,
  areaToRadius,
  LAYER_COLORS,
  CONDUCTOR_COLORS,
} from '../utils/cableCalculations';

const DEFAULT_CONDUCTOR_COLORS = Object.values(CONDUCTOR_COLORS);
const DEFAULT_INSULATION_COLORS = [
  '#8B4513', '#1a1a1a', '#808080', '#0066CC', '#00AA00',
  '#CC0000', '#F5F5F5', '#FF8C00', '#FFD700', '#8B008B',
];

function createDefaultDesign(): CableDesign {
  return {
    id: uuidv4(),
    name: 'New Cable Design',
    description: '',
    outerRadius: 30,
    layers: [
      {
        id: uuidv4(),
        name: 'Outer Sheath',
        type: 'sheath',
        radius: 30,
        color: LAYER_COLORS.sheath,
        opacity: 0.9,
        visible: true,
      },
      {
        id: uuidv4(),
        name: 'Armor',
        type: 'armor',
        radius: 27,
        color: LAYER_COLORS.armor,
        opacity: 0.7,
        visible: true,
      },
      {
        id: uuidv4(),
        name: 'Inner Sheath',
        type: 'bedding',
        radius: 24,
        color: LAYER_COLORS.bedding,
        opacity: 0.5,
        visible: true,
      },
      {
        id: uuidv4(),
        name: 'Filler',
        type: 'filler',
        radius: 21,
        color: LAYER_COLORS.filler,
        opacity: 0.4,
        visible: true,
      },
    ],
    conductors: [],
    arrangement: 'circular',
    conductorCount: 7,
    showDimensions: false,
    showLabels: true,
    showGeometry: false,
    backgroundColor: '#FFFFFF',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  };
}

export function useCableDesign() {
  const [design, setDesign] = useState<CableDesign>(() => {
    const d = createDefaultDesign();
    return recalculateConductorPositions(d);
  });

  const [history, setHistory] = useState<CableDesign[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = useCallback((newDesign: CableDesign) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newDesign);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const updateDesign = useCallback((updates: Partial<CableDesign>) => {
    setDesign(prev => {
      const updated = { ...prev, ...updates, modified: new Date().toISOString() };
      pushHistory(prev);
      return updated;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      setDesign(history[historyIndex]);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setDesign(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const setConductorCount = useCallback((count: number) => {
    setDesign(prev => {
      const updated = { ...prev, conductorCount: count, modified: new Date().toISOString() };
      pushHistory(prev);
      return recalculateConductorPositions(updated);
    });
  }, [pushHistory]);

  const setArrangement = useCallback((arrangement: ConductorArrangement) => {
    setDesign(prev => {
      const updated = { ...prev, arrangement, modified: new Date().toISOString() };
      pushHistory(prev);
      return recalculateConductorPositions(updated);
    });
  }, [pushHistory]);

  const setConductorSize = useCallback((areaMm2: number) => {
    setDesign(prev => {
      const radius = areaToRadius(areaMm2);
      const updated = {
        ...prev,
        conductors: prev.conductors.map(c => ({ ...c, radius })),
        modified: new Date().toISOString(),
      };
      pushHistory(prev);
      return recalculateConductorPositions(updated);
    });
  }, [pushHistory]);

  const updateLayer = useCallback((layerId: string, updates: Partial<CableLayer>) => {
    setDesign(prev => {
      pushHistory(prev);
      return {
        ...prev,
        layers: prev.layers.map(l => l.id === layerId ? { ...l, ...updates } : l),
        modified: new Date().toISOString(),
      };
    });
  }, [pushHistory]);

  const addLayer = useCallback((layer: Omit<CableLayer, 'id'>) => {
    setDesign(prev => {
      pushHistory(prev);
      return {
        ...prev,
        layers: [...prev.layers, { ...layer, id: uuidv4() }],
        modified: new Date().toISOString(),
      };
    });
  }, [pushHistory]);

  const removeLayer = useCallback((layerId: string) => {
    setDesign(prev => {
      pushHistory(prev);
      return {
        ...prev,
        layers: prev.layers.filter(l => l.id !== layerId),
        modified: new Date().toISOString(),
      };
    });
  }, [pushHistory]);

  const updateConductor = useCallback((conductorId: string, updates: Partial<Conductor>) => {
    setDesign(prev => {
      pushHistory(prev);
      return {
        ...prev,
        conductors: prev.conductors.map(c =>
          c.id === conductorId ? { ...c, ...updates } : c
        ),
        modified: new Date().toISOString(),
      };
    });
  }, [pushHistory]);

  const setOuterRadius = useCallback((radius: number) => {
    setDesign(prev => {
      const updated = { ...prev, outerRadius: radius, modified: new Date().toISOString() };
      // Update outermost layer to match
      if (updated.layers.length > 0) {
        const sorted = [...updated.layers].sort((a, b) => b.radius - a.radius);
        sorted[0].radius = radius;
      }
      pushHistory(prev);
      return recalculateConductorPositions(updated);
    });
  }, [pushHistory]);

  const autoFit = useCallback(() => {
    setDesign(prev => {
      if (prev.conductors.length === 0) return prev;
      const c = prev.conductors[0];
      const minRadius = calculateMinimumOuterRadius(
        prev.conductorCount,
        c.radius,
        c.insulationThickness,
        3 // sheath thickness
      );
      const updated = { ...prev, outerRadius: Math.ceil(minRadius * 1.15) };
      // Scale layers proportionally
      const scaleFactor = updated.outerRadius / prev.outerRadius;
      updated.layers = updated.layers.map(l => ({
        ...l,
        radius: Math.round(l.radius * scaleFactor * 10) / 10,
      }));
      pushHistory(prev);
      return recalculateConductorPositions(updated);
    });
  }, [pushHistory]);

  const resetDesign = useCallback(() => {
    setDesign(prev => {
      pushHistory(prev);
      const d = createDefaultDesign();
      return recalculateConductorPositions(d);
    });
  }, [pushHistory]);

  const loadDesign = useCallback((newDesign: CableDesign) => {
    setDesign(prev => {
      pushHistory(prev);
      return newDesign;
    });
  }, [pushHistory]);

  return {
    design,
    updateDesign,
    setConductorCount,
    setArrangement,
    setConductorSize,
    updateLayer,
    addLayer,
    removeLayer,
    updateConductor,
    setOuterRadius,
    autoFit,
    resetDesign,
    loadDesign,
    undo,
    redo,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
  };
}

function recalculateConductorPositions(design: CableDesign): CableDesign {
  const { conductorCount, arrangement } = design;
  const innerLayer = [...design.layers].sort((a, b) => a.radius - b.radius)[0];
  const availableRadius = innerLayer ? innerLayer.radius : design.outerRadius * 0.7;

  // Determine conductor radius from existing or default
  const existingRadius = design.conductors.length > 0 ? design.conductors[0].radius : areaToRadius(2.5);
  const existingInsulation = design.conductors.length > 0 ? design.conductors[0].insulationThickness : 1.5;
  const existingStranded = design.conductors.length > 0 ? design.conductors[0].stranded : false;
  const existingStrandCount = design.conductors.length > 0 ? design.conductors[0].strandCount : 7;

  let conductors: Conductor[] = [];

  if (arrangement === 'circular' || arrangement === 'sector') {
    const positions = calculateCircularPositions(
      conductorCount,
      existingRadius,
      existingInsulation,
      availableRadius
    );

    conductors = positions.map((pos, i) => ({
      id: design.conductors[i]?.id || uuidv4(),
      name: design.conductors[i]?.name || `C${i + 1}`,
      radius: existingRadius,
      insulationThickness: existingInsulation,
      color: design.conductors[i]?.color || DEFAULT_CONDUCTOR_COLORS[i % DEFAULT_CONDUCTOR_COLORS.length],
      insulationColor: design.conductors[i]?.insulationColor || DEFAULT_INSULATION_COLORS[i % DEFAULT_INSULATION_COLORS.length],
      position: { x: pos.x, y: pos.y },
      angle: pos.angle,
      stranded: existingStranded,
      strandCount: existingStrandCount,
    }));
  } else {
    // Custom - keep existing positions
    conductors = design.conductors;
  }

  return { ...design, conductors };
}
