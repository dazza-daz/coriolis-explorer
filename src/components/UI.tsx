'use client';

import React from 'react';
import { latLonToVector3, calculateInertialTrajectory } from '../utils/math';
import styles from './UI.module.css';

interface UIProps {
  state: SimulationState;
  onTogglePlay: () => void;
  onReset: () => void;
  onRecenterView: () => void;
  onChangeView: (view: ViewMode) => void;
  onUpdateParam: (key: keyof SimulationState, value: number | string | boolean) => void;
}

const UI: React.FC<UIProps> = ({ state, onTogglePlay, onReset, onRecenterView, onChangeView, onUpdateParam }) => {
  const startPos = latLonToVector3(state.startLat, state.startLon);
  const endPos = latLonToVector3(state.endLat, state.endLon);
  const { requiredInitialGroundSpeed } = calculateInertialTrajectory(startPos, endPos, state.groundSpeed);

  return (
    <div className={styles.overlay}>
      <header className={styles.header}>
        <h1>Coriolis Explorer</h1>
        <p>Comparing Orbital vs. Ground-Following Paths</p>
      </header>

      <section className={styles.controls}>
        <div className={styles.buttonGroup}>
          <button 
            onClick={onTogglePlay} 
            className={`${styles.btn} ${state.isPlaying ? styles.active : ''}`}
          >
            {state.isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={onReset} className={styles.btn}>Reset</button>
          <button onClick={onRecenterView} className={styles.btn} style={{ gridColumn: 'span 2' }}>Recenter Camera</button>
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
          <label className={styles.controlLabel}>Simulation Speed: {state.timeMultiplier}x</label>
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
            Aircraft B Speed: {state.groundSpeed.toFixed(2)}
          </label>
          <input 
            type="range" 
            min="0.01" 
            max="2" 
            step="0.01" 
            className={styles.rangeInput}
            value={state.groundSpeed}
            onChange={(e) => onUpdateParam('groundSpeed', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.info}>
           <div className={styles.velocityIndicator}>
             <span className={styles.colorBox} style={{ backgroundColor: 'cyan' }}></span>
             <label className={styles.controlLabel}>V_Ground (B): {state.groundSpeed.toFixed(3)}</label>
           </div>
           <div className={styles.velocityIndicator}>
             <span className={styles.colorBox} style={{ backgroundColor: 'red' }}></span>
             <label className={styles.controlLabel}>V_Ground (A): {requiredInitialGroundSpeed.toFixed(3)}</label>
           </div>
           <p style={{ fontSize: '0.7rem', marginTop: '8px', opacity: 0.6 }}>
             (V_Ground A is the required launch speed to hit the target at the same time as B)
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
          <label className={styles.controlLabel}>Scenario Presets</label>
          <div className={styles.presets}>
            <button className={`${styles.btn} ${styles.presetBtn}`} onClick={() => {
              onUpdateParam('startLat', 90);
              onUpdateParam('startLon', 0);
              onUpdateParam('endLat', 0);
              onUpdateParam('endLon', 0);
              onUpdateParam('groundSpeed', 0.5);
              onReset();
            }}>North Pole to Equator</button>
            <button className={`${styles.btn} ${styles.presetBtn}`} onClick={() => {
              onUpdateParam('startLat', 0);
              onUpdateParam('startLon', 0);
              onUpdateParam('endLat', 80);
              onUpdateParam('endLon', 0);
              onUpdateParam('groundSpeed', 0.6);
              onReset();
            }}>Equator to North Pole</button>
            <button className={`${styles.btn} ${styles.presetBtn}`} onClick={() => {
              onUpdateParam('startLat', 45);
              onUpdateParam('startLon', 0);
              onUpdateParam('endLat', 45);
              onUpdateParam('endLon', 40);
              onUpdateParam('groundSpeed', 0.7);
              onReset();
            }}>West to East (45°N)</button>
          </div>
        </div>
      </section>

      <section className={styles.info}>
        <h3>Quick Facts</h3>
        <p>In the <strong>Inertial Frame</strong>, Aircraft A follows a straight-looking orbital path while the Earth rotates underneath.</p>
        <p>In the <strong>Earth-Fixed Frame</strong>, Aircraft A appears to deflect (Coriolis effect) while Aircraft B follows the Great Circle.</p>
      </section>

      <footer className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.colorBox} style={{ backgroundColor: 'red' }}></span>
          <span>Aircraft A (Orbital/Ballistic)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.colorBox} style={{ backgroundColor: 'cyan' }}></span>
          <span>Aircraft B (Ground-Following)</span>
        </div>
      </footer>
    </div>
  );
};

export default UI;
