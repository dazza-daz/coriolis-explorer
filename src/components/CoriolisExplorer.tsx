'use client';

import React, { useState, useEffect } from 'react';
import Scene from './Scene';
import UI from './UI';
import styles from './CoriolisExplorer.module.css';

export type ViewMode = 'INERTIAL' | 'EARTH_FIXED';

export interface SimulationState {
  isPlaying: boolean;
  time: number;
  timeMultiplier: number;
  viewMode: ViewMode;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  groundSpeed: number; // in relative units or km/h
}

const CoriolisExplorer: React.FC = () => {
  const [state, setState] = useState<SimulationState>({
    isPlaying: false,
    time: 0,
    timeMultiplier: 1,
    viewMode: 'INERTIAL',
    startLat: 90, // Starting at North Pole
    startLon: 0,
    endLat: 0, // Heading towards Equator
    endLon: 0,
    groundSpeed: 0.5, // Faster default speed
  });

  useEffect(() => {
    let frameId: number;
    const animate = () => {
      if (state.isPlaying) {
        setState((prev) => ({
          ...prev,
          time: prev.time + (0.01 * prev.timeMultiplier),
        }));
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [state.isPlaying, state.timeMultiplier]);

  const handleTogglePlay = () => setState(s => ({ ...s, isPlaying: !s.isPlaying }));
  const handleReset = () => setState(s => ({ ...s, time: 0, isPlaying: false }));
  const handleChangeView = (viewMode: ViewMode) => setState(s => ({ ...s, viewMode }));
  const handleUpdateParam = (key: keyof SimulationState, value: number | string | boolean) => setState(s => ({ ...s, [key]: value }));

  return (
    <div className={styles.container}>
      <Scene state={state} />
      <UI 
        state={state} 
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        onChangeView={handleChangeView}
        onUpdateParam={handleUpdateParam}
      />
    </div>
  );
};

export default CoriolisExplorer;
