import { useState, useEffect, useCallback } from 'react';
import { CableCanvas } from './components/CableCanvas';
import { Sidebar } from './components/Sidebar';
import { useCableDesign } from './hooks/useCableDesign';
import type { DimensionLine } from './types/cable';
import './App.css';

function App() {
  const cableDesign = useCableDesign();
  const [highlightedLayerId, setHighlightedLayerId] = useState<string | null>(null);
  const [highlightedConductorId, setHighlightedConductorId] = useState<string | null>(null);
  const [selectedConductorId, setSelectedConductorId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-generate dimension lines when showDimensions is on
  const dimensionLines: DimensionLine[] = [];
  if (cableDesign.design.showDimensions) {
    dimensionLines.push({
      id: 'outer-diameter',
      from: { x: -cableDesign.design.outerRadius, y: 0 },
      to: { x: cableDesign.design.outerRadius, y: 0 },
      label: `\u00D8${(cableDesign.design.outerRadius * 2).toFixed(1)} mm`,
      color: '#E64A19',
    });

    if (cableDesign.design.conductors.length > 0) {
      const c = cableDesign.design.conductors[0];
      dimensionLines.push({
        id: 'conductor-diameter',
        from: { x: c.position.x - c.radius, y: c.position.y },
        to: { x: c.position.x + c.radius, y: c.position.y },
        label: `\u00D8${(c.radius * 2).toFixed(1)} mm`,
        color: '#1565C0',
      });
    }
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        cableDesign.undo();
      } else if (e.key === 'y') {
        e.preventDefault();
        cableDesign.redo();
      }
    }
    if (e.key === 'Escape') {
      setSelectedConductorId(null);
    }
  }, [cableDesign]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app">
      <div className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? '\u25B6' : '\u25C0'}
        </button>
        {!sidebarCollapsed && (
          <Sidebar
            design={cableDesign.design}
            updateDesign={cableDesign.updateDesign}
            setConductorCount={cableDesign.setConductorCount}
            setArrangement={cableDesign.setArrangement}
            setConductorSize={cableDesign.setConductorSize}
            updateLayer={cableDesign.updateLayer}
            addLayer={cableDesign.addLayer}
            removeLayer={cableDesign.removeLayer}
            updateConductor={cableDesign.updateConductor}
            setOuterRadius={cableDesign.setOuterRadius}
            autoFit={cableDesign.autoFit}
            resetDesign={cableDesign.resetDesign}
            loadDesign={cableDesign.loadDesign}
            undo={cableDesign.undo}
            redo={cableDesign.redo}
            canUndo={cableDesign.canUndo}
            canRedo={cableDesign.canRedo}
            highlightedLayerId={highlightedLayerId}
            setHighlightedLayerId={setHighlightedLayerId}
            highlightedConductorId={highlightedConductorId}
            setHighlightedConductorId={setHighlightedConductorId}
            selectedConductorId={selectedConductorId}
          />
        )}
      </div>
      <div className="app-canvas">
        <CableCanvas
          design={cableDesign.design}
          highlightedLayerId={highlightedLayerId}
          highlightedConductorId={highlightedConductorId}
          selectedConductorId={selectedConductorId}
          onSelectConductor={setSelectedConductorId}
          dimensionLines={dimensionLines}
        />
      </div>
    </div>
  );
}

export default App;
