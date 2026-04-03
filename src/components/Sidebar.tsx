import { useState } from 'react';
import type { CableDesign, CableLayer, Conductor, ConductorArrangement } from '../types/cable';
import {
  STANDARD_CONDUCTOR_SIZES,
  radiusToArea,
  totalConductorArea,
  fillFactor,
  CONDUCTOR_COLORS,
} from '../utils/cableCalculations';

interface SidebarProps {
  design: CableDesign;
  updateDesign: (updates: Partial<CableDesign>) => void;
  setConductorCount: (count: number) => void;
  setArrangement: (arrangement: ConductorArrangement) => void;
  setConductorSize: (areaMm2: number) => void;
  updateLayer: (id: string, updates: Partial<CableLayer>) => void;
  addLayer: (layer: Omit<CableLayer, 'id'>) => void;
  removeLayer: (id: string) => void;
  updateConductor: (id: string, updates: Partial<Conductor>) => void;
  setOuterRadius: (radius: number) => void;
  autoFit: () => void;
  resetDesign: () => void;
  loadDesign: (design: CableDesign) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  highlightedLayerId: string | null;
  setHighlightedLayerId: (id: string | null) => void;
  highlightedConductorId: string | null;
  setHighlightedConductorId: (id: string | null) => void;
  selectedConductorId: string | null;
}

type TabId = 'design' | 'layers' | 'conductors' | 'appearance' | 'info';

export function Sidebar(props: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('design');

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'design', label: 'Design', icon: '⚙' },
    { id: 'layers', label: 'Layers', icon: '◎' },
    { id: 'conductors', label: 'Wires', icon: '⚡' },
    { id: 'appearance', label: 'View', icon: '🎨' },
    { id: 'info', label: 'Info', icon: 'ℹ' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Cable Cross-Section Designer</h1>
        <div className="undo-redo">
          <button onClick={props.undo} disabled={!props.canUndo} title="Undo (Ctrl+Z)">↶</button>
          <button onClick={props.redo} disabled={!props.canRedo} title="Redo (Ctrl+Y)">↷</button>
        </div>
      </div>

      <div className="sidebar-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-content">
        {activeTab === 'design' && <DesignTab {...props} />}
        {activeTab === 'layers' && <LayersTab {...props} />}
        {activeTab === 'conductors' && <ConductorsTab {...props} />}
        {activeTab === 'appearance' && <AppearanceTab {...props} />}
        {activeTab === 'info' && <InfoTab {...props} />}
      </div>
    </div>
  );
}

function DesignTab(props: SidebarProps) {
  const { design } = props;
  const conductorArea = design.conductors.length > 0 ? radiusToArea(design.conductors[0].radius) : 2.5;

  return (
    <div className="tab-panel">
      <div className="panel-section">
        <h3>Cable Name</h3>
        <input
          type="text"
          value={design.name}
          onChange={e => props.updateDesign({ name: e.target.value })}
          className="full-width"
        />
      </div>

      <div className="panel-section">
        <h3>Cable Dimensions</h3>
        <label className="form-row">
          <span>Outer Diameter (mm)</span>
          <input
            type="number"
            value={Math.round(design.outerRadius * 2 * 10) / 10}
            onChange={e => props.setOuterRadius(parseFloat(e.target.value) / 2)}
            min={5}
            max={200}
            step={0.5}
          />
        </label>
      </div>

      <div className="panel-section">
        <h3>Conductor Layout</h3>
        <label className="form-row">
          <span>Number of Conductors</span>
          <input
            type="number"
            value={design.conductorCount}
            onChange={e => props.setConductorCount(parseInt(e.target.value) || 1)}
            min={1}
            max={61}
            step={1}
          />
        </label>

        <label className="form-row">
          <span>Arrangement</span>
          <select
            value={design.arrangement}
            onChange={e => props.setArrangement(e.target.value as ConductorArrangement)}
          >
            <option value="circular">Circular</option>
            <option value="sector">Sector</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label className="form-row">
          <span>Conductor Size (mm²)</span>
          <select
            value={STANDARD_CONDUCTOR_SIZES.reduce((prev, curr) =>
              Math.abs(curr - conductorArea) < Math.abs(prev - conductorArea) ? curr : prev
            )}
            onChange={e => props.setConductorSize(parseFloat(e.target.value))}
          >
            {STANDARD_CONDUCTOR_SIZES.map(size => (
              <option key={size} value={size}>{size} mm²</option>
            ))}
          </select>
        </label>
      </div>

      <div className="panel-section">
        <h3>Quick Presets</h3>
        <div className="preset-grid">
          <button onClick={() => applyPreset(props, '3-core-armored')} className="preset-btn">
            3-Core Armored
          </button>
          <button onClick={() => applyPreset(props, '4-core')} className="preset-btn">
            4-Core
          </button>
          <button onClick={() => applyPreset(props, '7-core')} className="preset-btn">
            7-Core
          </button>
          <button onClick={() => applyPreset(props, '12-core')} className="preset-btn">
            12-Core
          </button>
          <button onClick={() => applyPreset(props, '19-core')} className="preset-btn">
            19-Core
          </button>
          <button onClick={() => applyPreset(props, 'single-core')} className="preset-btn">
            Single Core
          </button>
        </div>
      </div>

      <div className="panel-section">
        <div className="button-row">
          <button onClick={props.autoFit} className="btn-secondary">Auto-Fit Size</button>
          <button onClick={props.resetDesign} className="btn-danger">Reset</button>
        </div>
      </div>
    </div>
  );
}

function LayersTab(props: SidebarProps) {
  const sortedLayers = [...props.design.layers].sort((a, b) => b.radius - a.radius);

  return (
    <div className="tab-panel">
      <div className="panel-section">
        <h3>Cable Layers</h3>
        <p className="hint">Layers are drawn from outermost to innermost.</p>

        {sortedLayers.map(layer => (
          <div
            key={layer.id}
            className={`layer-item ${props.highlightedLayerId === layer.id ? 'highlighted' : ''}`}
            onMouseEnter={() => props.setHighlightedLayerId(layer.id)}
            onMouseLeave={() => props.setHighlightedLayerId(null)}
          >
            <div className="layer-header">
              <input
                type="color"
                value={layer.color}
                onChange={e => props.updateLayer(layer.id, { color: e.target.value })}
                className="color-swatch"
              />
              <input
                type="text"
                value={layer.name}
                onChange={e => props.updateLayer(layer.id, { name: e.target.value })}
                className="layer-name-input"
              />
              <label className="visibility-toggle" title={layer.visible ? 'Hide' : 'Show'}>
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={e => props.updateLayer(layer.id, { visible: e.target.checked })}
                />
                {layer.visible ? '👁' : '🚫'}
              </label>
              <button
                onClick={() => props.removeLayer(layer.id)}
                className="btn-icon btn-danger-icon"
                title="Remove layer"
              >
                ✕
              </button>
            </div>
            <div className="layer-controls">
              <label className="form-row compact">
                <span>Radius (mm)</span>
                <input
                  type="number"
                  value={Math.round(layer.radius * 10) / 10}
                  onChange={e => props.updateLayer(layer.id, { radius: parseFloat(e.target.value) })}
                  min={1}
                  max={200}
                  step={0.5}
                />
              </label>
              <label className="form-row compact">
                <span>Opacity</span>
                <input
                  type="range"
                  value={layer.opacity}
                  onChange={e => props.updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </label>
              <label className="form-row compact">
                <span>Type</span>
                <select
                  value={layer.type}
                  onChange={e => props.updateLayer(layer.id, { type: e.target.value as CableLayer['type'] })}
                >
                  <option value="sheath">Outer Sheath</option>
                  <option value="armor">Armor</option>
                  <option value="bedding">Bedding</option>
                  <option value="screen">Screen</option>
                  <option value="insulation">Insulation</option>
                  <option value="filler">Filler</option>
                  <option value="jacket">Jacket</option>
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <button
          onClick={() => props.addLayer({
            name: 'New Layer',
            type: 'insulation',
            radius: 15,
            color: '#4CAF50',
            opacity: 0.6,
            visible: true,
          })}
          className="btn-primary full-width"
        >
          + Add Layer
        </button>
      </div>
    </div>
  );
}

function ConductorsTab(props: SidebarProps) {
  const { design } = props;

  return (
    <div className="tab-panel">
      <div className="panel-section">
        <h3>Conductor Properties</h3>
        {design.conductors.length > 0 && (
          <div className="conductor-global-controls">
            <label className="form-row">
              <span>Insulation Thickness (mm)</span>
              <input
                type="number"
                value={design.conductors[0].insulationThickness}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  design.conductors.forEach(c => props.updateConductor(c.id, { insulationThickness: val }));
                }}
                min={0.1}
                max={10}
                step={0.1}
              />
            </label>
            <label className="form-row">
              <span>Stranded Conductors</span>
              <input
                type="checkbox"
                checked={design.conductors[0].stranded}
                onChange={e => {
                  design.conductors.forEach(c => props.updateConductor(c.id, { stranded: e.target.checked }));
                }}
              />
            </label>
            {design.conductors[0].stranded && (
              <label className="form-row">
                <span>Strand Count</span>
                <select
                  value={design.conductors[0].strandCount || 7}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    design.conductors.forEach(c => props.updateConductor(c.id, { strandCount: val }));
                  }}
                >
                  <option value={7}>7 strands</option>
                  <option value={19}>19 strands</option>
                  <option value={37}>37 strands</option>
                  <option value={61}>61 strands</option>
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      <div className="panel-section">
        <h3>Individual Conductors</h3>
        {design.conductors.map((conductor) => (
          <div
            key={conductor.id}
            className={`conductor-item ${props.selectedConductorId === conductor.id ? 'selected' : ''} ${props.highlightedConductorId === conductor.id ? 'highlighted' : ''}`}
            onMouseEnter={() => props.setHighlightedConductorId(conductor.id)}
            onMouseLeave={() => props.setHighlightedConductorId(null)}
          >
            <div className="conductor-header">
              <input
                type="color"
                value={conductor.color}
                onChange={e => props.updateConductor(conductor.id, { color: e.target.value })}
                className="color-swatch"
                title="Conductor color"
              />
              <input
                type="color"
                value={conductor.insulationColor}
                onChange={e => props.updateConductor(conductor.id, { insulationColor: e.target.value })}
                className="color-swatch"
                title="Insulation color"
              />
              <input
                type="text"
                value={conductor.name}
                onChange={e => props.updateConductor(conductor.id, { name: e.target.value })}
                className="conductor-name-input"
              />
            </div>
            <div className="conductor-color-presets">
              {Object.entries(CONDUCTOR_COLORS).slice(0, 5).map(([name, color]) => (
                <button
                  key={name}
                  className="color-preset-btn"
                  style={{ backgroundColor: color }}
                  title={name}
                  onClick={() => props.updateConductor(conductor.id, { insulationColor: color })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppearanceTab(props: SidebarProps) {
  const { design } = props;

  return (
    <div className="tab-panel">
      <div className="panel-section">
        <h3>Display Options</h3>
        <label className="form-row">
          <span>Show Labels</span>
          <input
            type="checkbox"
            checked={design.showLabels}
            onChange={e => props.updateDesign({ showLabels: e.target.checked })}
          />
        </label>
        <label className="form-row">
          <span>Show Dimensions</span>
          <input
            type="checkbox"
            checked={design.showDimensions}
            onChange={e => props.updateDesign({ showDimensions: e.target.checked })}
          />
        </label>
        <label className="form-row">
          <span>Show Geometry Lines</span>
          <input
            type="checkbox"
            checked={design.showGeometry}
            onChange={e => props.updateDesign({ showGeometry: e.target.checked })}
          />
        </label>
      </div>

      <div className="panel-section">
        <h3>Background</h3>
        <label className="form-row">
          <span>Color</span>
          <input
            type="color"
            value={design.backgroundColor}
            onChange={e => props.updateDesign({ backgroundColor: e.target.value })}
          />
        </label>
        <div className="bg-presets">
          <button onClick={() => props.updateDesign({ backgroundColor: '#FFFFFF' })} style={{ backgroundColor: '#FFFFFF' }} className="bg-preset-btn" title="White" />
          <button onClick={() => props.updateDesign({ backgroundColor: '#F5F5F5' })} style={{ backgroundColor: '#F5F5F5' }} className="bg-preset-btn" title="Light Grey" />
          <button onClick={() => props.updateDesign({ backgroundColor: '#1a1a2e' })} style={{ backgroundColor: '#1a1a2e' }} className="bg-preset-btn" title="Dark Blue" />
          <button onClick={() => props.updateDesign({ backgroundColor: '#2d2d2d' })} style={{ backgroundColor: '#2d2d2d' }} className="bg-preset-btn" title="Dark" />
          <button onClick={() => props.updateDesign({ backgroundColor: '#FFFEF0' })} style={{ backgroundColor: '#FFFEF0' }} className="bg-preset-btn" title="Cream" />
        </div>
      </div>

      <div className="panel-section">
        <h3>Save / Load</h3>
        <div className="button-row">
          <button onClick={() => saveDesign(design)} className="btn-primary">
            Save Design
          </button>
          <button onClick={() => loadDesignFromFile(props.loadDesign)} className="btn-secondary">
            Load Design
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoTab(props: SidebarProps) {
  const { design } = props;
  const totalCopper = totalConductorArea(design.conductors);
  const ff = fillFactor(design);

  return (
    <div className="tab-panel">
      <div className="panel-section">
        <h3>Cable Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Cable Name</span>
            <span className="info-value">{design.name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Outer Diameter</span>
            <span className="info-value">{(design.outerRadius * 2).toFixed(1)} mm</span>
          </div>
          <div className="info-item">
            <span className="info-label">Number of Conductors</span>
            <span className="info-value">{design.conductors.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Conductor Size</span>
            <span className="info-value">
              {design.conductors.length > 0
                ? `${radiusToArea(design.conductors[0].radius).toFixed(2)} mm²`
                : 'N/A'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Total Conductor Area</span>
            <span className="info-value">{totalCopper.toFixed(2)} mm²</span>
          </div>
          <div className="info-item">
            <span className="info-label">Total Cable Area</span>
            <span className="info-value">{(Math.PI * design.outerRadius ** 2).toFixed(2)} mm²</span>
          </div>
          <div className="info-item">
            <span className="info-label">Fill Factor</span>
            <span className="info-value">{(ff * 100).toFixed(1)}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">Arrangement</span>
            <span className="info-value">{design.arrangement}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Number of Layers</span>
            <span className="info-value">{design.layers.length}</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h3>Layer Areas</h3>
        <div className="info-grid">
          {[...design.layers]
            .sort((a, b) => b.radius - a.radius)
            .map((layer, i, arr) => {
              const innerRadius = i < arr.length - 1 ? arr[i + 1].radius : 0;
              const area = Math.PI * (layer.radius ** 2 - innerRadius ** 2);
              return (
                <div key={layer.id} className="info-item">
                  <span className="info-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="info-color-dot" style={{ backgroundColor: layer.color }} />
                    {layer.name}
                  </span>
                  <span className="info-value">{area.toFixed(1)} mm²</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// Presets
function applyPreset(props: SidebarProps, preset: string) {
  switch (preset) {
    case '3-core-armored':
      props.setConductorCount(3);
      props.setOuterRadius(25);
      props.setConductorSize(4);
      break;
    case '4-core':
      props.setConductorCount(4);
      props.setOuterRadius(28);
      props.setConductorSize(2.5);
      break;
    case '7-core':
      props.setConductorCount(7);
      props.setOuterRadius(30);
      props.setConductorSize(1.5);
      break;
    case '12-core':
      props.setConductorCount(12);
      props.setOuterRadius(35);
      props.setConductorSize(1);
      break;
    case '19-core':
      props.setConductorCount(19);
      props.setOuterRadius(40);
      props.setConductorSize(0.75);
      break;
    case 'single-core':
      props.setConductorCount(1);
      props.setOuterRadius(15);
      props.setConductorSize(10);
      break;
  }
}

function saveDesign(design: CableDesign) {
  const json = JSON.stringify(design, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${design.name.replace(/\s+/g, '-')}.cable.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadDesignFromFile(loadDesign: (design: CableDesign) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.cable.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const design = JSON.parse(ev.target?.result as string) as CableDesign;
        loadDesign(design);
      } catch {
        alert('Invalid cable design file.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
