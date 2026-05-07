'use client';

import React, { useState } from 'react';
import { SimulationState, ViewMode } from './CoriolisExplorer';
import { EARTH_RADIUS, latLonToVector3, calculateInertialTrajectory, getCurrentGroundSpeedA, SPEED_TO_KMH } from '../utils/math';
import styles from './UI.module.css';

interface UIProps {
  state: SimulationState;
  onTogglePlay: () => void;
  onReset: () => void;
  onRecenterView: () => void;
  onChangeView: (view: ViewMode) => void;
  onUpdateParam: (key: keyof SimulationState, value: number | string | boolean) => void;
}

const Section = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2>{title}</h2>
        <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>▼</span>
      </div>
      <div className={`${styles.sectionContent} ${isOpen ? '' : styles.hidden}`}>
        {children}
      </div>
    </div>
  );
};

const UI: React.FC<UIProps> = ({ state, onTogglePlay, onReset, onRecenterView, onChangeView, onUpdateParam }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const startPos = latLonToVector3(state.startLat, state.startLon);
  const endPos = latLonToVector3(state.endLat, state.endLon);
  const trajectoryA = calculateInertialTrajectory(startPos, endPos, state.groundSpeed, state.targetingMode);
  const { requiredInitialGroundSpeed, orbitalAxis, angularSpeed, timeOfFlight: tA } = trajectoryA;
  const tB = startPos.angleTo(endPos) / state.groundSpeed;

  const currentSpeedA = getCurrentGroundSpeedA(startPos, state.time, orbitalAxis, angularSpeed, tA);

  const formatSpeed = (s: number) => {
    // Input 's' is linear speed (magnitude)
    if (state.useRealUnits) {
      return `${(s * SPEED_TO_KMH).toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h`;
    }
    return s.toFixed(3);
  };

  // Calculate current altitude for display
  let currentAlt = 0;
  if (state.trajectoryType === 'BALLISTIC') {
    const progress = Math.min(state.time / tA, 1);
    currentAlt = 4 * (EARTH_RADIUS * state.maxAltitude) * progress * (1 - progress);
  }

  return (
    <>
      <div className={`${styles.persistentBar} ${isMenuOpen ? styles.shifted : ''}`}>
        <button 
          className={styles.iconBtn}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title={isMenuOpen ? 'Close Menu' : 'Open Menu'}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
        
        <button 
          className={`${styles.iconBtn} ${state.isPlaying ? styles.active : ''}`}
          onClick={onTogglePlay}
          title={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isPlaying ? '⏸' : '▶'}
        </button>

        <button 
          className={styles.iconBtn}
          onClick={onReset}
          title="Reset Simulation"
        >
          ↺
        </button>
      </div>

      <div className={`${styles.overlay} ${isMenuOpen ? '' : styles.closed}`}>
        <header className={styles.header}>
          <h1>Coriolis Explorer</h1>
        </header>

        <Section title="Simulation Controls">
          <div className={styles.controlGroup}>
             <label className={styles.controlLabel}>Targeting Mode</label>
             <div className={styles.toggleGroup}>
                <button 
                  className={`${styles.btn} ${state.targetingMode === 'SAME_TIME' ? styles.active : ''}`}
                  onClick={() => onUpdateParam('targetingMode', 'SAME_TIME')}
                >
                  Same Time
                </button>
                <button 
                  className={`${styles.btn} ${state.targetingMode === 'SAME_SPEED' ? styles.active : ''}`}
                  onClick={() => onUpdateParam('targetingMode', 'SAME_SPEED')}
                >
                  Same Speed
                </button>
             </div>
          </div>

          <div className={styles.controlGroup}>
             <label className={styles.controlLabel}>Trajectory Type (A)</label>
             <div className={styles.toggleGroup}>
                <button 
                  className={`${styles.btn} ${state.trajectoryType === 'ORBITAL' ? styles.active : ''}`}
                  onClick={() => onUpdateParam('trajectoryType', 'ORBITAL')}
                >
                  Orbital
                </button>
                <button 
                  className={`${styles.btn} ${state.trajectoryType === 'BALLISTIC' ? styles.active : ''}`}
                  onClick={() => onUpdateParam('trajectoryType', 'BALLISTIC')}
                >
                  Ballistic
                </button>
             </div>
          </div>

          {state.trajectoryType === 'BALLISTIC' && (
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Peak Altitude: {(state.maxAltitude * 6371).toFixed(0)} km</label>
              <input 
                type="range" 
                min="0.1" 
                max="3" 
                step="0.1" 
                className={styles.rangeInput}
                value={state.maxAltitude}
                onChange={(e) => onUpdateParam('maxAltitude', parseFloat(e.target.value))}
              />
            </div>
          )}

          <div className={styles.controlGroup}>
             <button 
                className={`${styles.btn} ${state.autoStop ? styles.active : ''}`}
                onClick={() => onUpdateParam('autoStop', !state.autoStop)}
              >
                {state.autoStop ? 'Auto-Stop: ON' : 'Auto-Stop: OFF (Continuous)'}
              </button>
          </div>

          <div className={styles.controlGroup}>
             <button 
                className={`${styles.btn} ${state.useRealUnits ? styles.active : ''}`}
                onClick={() => onUpdateParam('useRealUnits', !state.useRealUnits)}
              >
                {state.useRealUnits ? 'Show Scaled Units' : 'Show km/h'}
              </button>
          </div>

          <div className={styles.controlGroup}>
            <button onClick={onRecenterView} className={styles.btn}>Recenter Camera</button>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>View Mode</label>
            <div className={styles.toggleGroup}>
              <button 
                className={`${styles.btn} ${state.viewMode === 'INERTIAL' ? styles.active : ''}`}
                onClick={() => onChangeView('INERTIAL')}
              >
                Inertial
              </button>
              <button 
                className={`${styles.btn} ${state.viewMode === 'EARTH_FIXED' ? styles.active : ''}`}
                onClick={() => onChangeView('EARTH_FIXED')}
              >
                Earth-Fixed
              </button>
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Time Speed: {state.timeMultiplier}x</label>
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.1" 
              className={styles.rangeInput}
              value={state.timeMultiplier}
              onChange={(e) => onUpdateParam('timeMultiplier', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>
              Aircraft B Speed: {formatSpeed(state.groundSpeed * EARTH_RADIUS)}
            </label>
            <input 
              type="range" 
              min="0.05" 
              max="0.6" 
              step="0.01" 
              className={styles.rangeInput}
              value={state.groundSpeed}
              onChange={(e) => onUpdateParam('groundSpeed', parseFloat(e.target.value))}
            />
          </div>
        </Section>

        <Section title="Environment" defaultOpen={false}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Atmospheric Drag: {state.dragCoefficient.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              className={styles.rangeInput}
              value={state.dragCoefficient}
              onChange={(e) => onUpdateParam('dragCoefficient', parseFloat(e.target.value))}
            />
            <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '4px' }}>
              0 = Vacuum, 1 = Full Atmospheric Coupling
            </p>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Plane Opacity: {state.planeOpacity.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="0.5" 
              step="0.01" 
              className={styles.rangeInput}
              value={state.planeOpacity}
              onChange={(e) => onUpdateParam('planeOpacity', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Earth Opacity: {state.earthOpacity.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              className={styles.rangeInput}
              value={state.earthOpacity}
              onChange={(e) => onUpdateParam('earthOpacity', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.controlGroup}>
            <button 
              className={`${styles.btn} ${state.showGrid ? styles.active : ''}`}
              onClick={() => onUpdateParam('showGrid', !state.showGrid)}
            >
              {state.showGrid ? 'Hide Lat/Lon Grid' : 'Show Lat/Lon Grid'}
            </button>
          </div>
        </Section>

        <Section title="Presets" defaultOpen={false}>
          <div className={styles.presets}>
            <button className={`${styles.btn} ${styles.presetBtn}`} onClick={() => {
              onUpdateParam('startLat', 0);
              onUpdateParam('startLon', 0);
              onUpdateParam('endLat', 90);
              onUpdateParam('endLon', 0);
              onUpdateParam('groundSpeed', 0.27); // ~900 km/h
              onReset();
            }}>Equator to North Pole</button>
            <button className={`${styles.btn} ${styles.presetBtn}`} onClick={() => {
              onUpdateParam('startLat', 90);
              onUpdateParam('startLon', 0);
              onUpdateParam('endLat', 0);
              onUpdateParam('endLon', 0);
              onUpdateParam('groundSpeed', 0.27); // ~900 km/h
              onReset();
            }}>North Pole to Equator</button>
            <button className={`${styles.btn} ${styles.presetBtn}`} onClick={() => {
              onUpdateParam('startLat', 45);
              onUpdateParam('startLon', 0);
              onUpdateParam('endLat', -45);
              onUpdateParam('endLon', 0);
              onUpdateParam('groundSpeed', 0.3); // ~1000 km/h
              onReset();
            }}>Cross-Equator (45°N to 45°S)</button>
            <button className={`${styles.btn} ${styles.presetBtn}`} onClick={() => {
              onUpdateParam('startLat', 0);
              onUpdateParam('startLon', 0);
              onUpdateParam('endLat', 0);
              onUpdateParam('endLon', -90);
              onUpdateParam('groundSpeed', 0.5); // Fixed space hover
              onReset();
            }}>Inertial Hover (Equator West)</button>
            <button className={`${styles.btn} ${styles.presetBtn}`} onClick={() => {
              onUpdateParam('startLat', 89);
              onUpdateParam('startLon', 0);
              onUpdateParam('endLat', -89);
              onUpdateParam('endLon', 0);
              onUpdateParam('groundSpeed', 0.3); // ~1000 km/h
              onReset();
            }}>The Long Haul (Pole to Pole)</button>
            <button className={`${styles.btn} ${styles.presetBtn}`} onClick={() => {
              onUpdateParam('startLat', 45);
              onUpdateParam('startLon', 0);
              onUpdateParam('endLat', 45);
              onUpdateParam('endLon', 40);
              onUpdateParam('groundSpeed', 0.27); // ~900 km/h
              onReset();
            }}>West to East (45°N)</button>
          </div>
        </Section>

        <Section title="Information" defaultOpen={false}>
          <div className={styles.info}>
             <div className={styles.velocityIndicator}>
               <span className={styles.colorBox} style={{ backgroundColor: 'cyan' }}></span>
               <label className={styles.controlLabel}>V_Ground (B): {formatSpeed(state.groundSpeed * EARTH_RADIUS)}</label>
             </div>
             <div className={styles.velocityIndicator}>
               <span className={styles.colorBox} style={{ backgroundColor: 'red' }}></span>
               <label className={styles.controlLabel}>V_Ground (A): {formatSpeed(requiredInitialGroundSpeed * EARTH_RADIUS)}</label>
             </div>
             <p style={{ fontSize: '0.7rem', marginTop: '8px', opacity: 0.6 }}>
               {state.targetingMode === 'SAME_TIME' 
                 ? '(Launch speed for A is auto-calculated to hit the target at the same time as B)'
                 : '(Launch speed for A is forced to match B; arrival time is calculated)'}
             </p>
          </div>

          <div className={styles.info} style={{ marginTop: '12px' }}>
            <label className={styles.controlLabel}>Flight Duration</label>
            <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
              Aircraft A: {(tA * 100).toFixed(1)} mins (relative)
            </p>
            <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              Aircraft B: {(tB * 100).toFixed(1)} mins (relative)
            </p>
            {state.trajectoryType === 'BALLISTIC' && (
              <p style={{ fontSize: '0.75rem', opacity: 1.0, color: '#ffaaaa', marginTop: '4px' }}>
                Current Altitude: {(currentAlt * 6371 / EARTH_RADIUS).toFixed(0)} km
              </p>
            )}
          </div>

          <div className={styles.info} style={{ marginTop: '12px' }}>
            <h3>Quick Facts</h3>
            <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              <strong>Inertial Frame:</strong> Aircraft A follows a planar orbital path while Earth rotates.
            </p>
            <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
              <strong>Earth-Fixed Frame:</strong> Aircraft A deflects (Coriolis) while B follows the Great Circle.
            </p>
            <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <strong>Atmospheric Coupling:</strong> A rotating atmosphere "drags" objects into its frame. High drag makes Aircraft A (Orbital) gradually sync with the Earth's rotation. For Aircraft B, the drag provides "Air Coupling" force, reducing the "Active Steering" required by the pilot to stay on the ground track.
            </p>
          </div>
        </Section>

        <footer className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.colorBox} style={{ backgroundColor: 'red' }}></span>
            <div className={styles.legendText}>
              <span>Aircraft A ({state.trajectoryType})</span>
              <span className={styles.speedBadge}>V_G: {formatSpeed(currentSpeedA * EARTH_RADIUS)}</span>
            </div>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.colorBox} style={{ backgroundColor: 'cyan' }}></span>
            <div className={styles.legendText}>
              <span>Aircraft B (Ground-Following)</span>
              <span className={styles.speedBadge}>V_G: {formatSpeed(state.groundSpeed * EARTH_RADIUS)}</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default UI;
