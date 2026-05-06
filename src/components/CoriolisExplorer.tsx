'use client';

import React, { useState, useEffect } from 'react';
import Scene from './Scene';
import UI from './UI';
import styles from './CoriolisExplorer.module.css';
import { latLonToVector3, calculateInertialTrajectory } from '../utils/math';

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
  recenterToggle: boolean;
  planeOpacity: number;
  earthOpacity: number;
  showGrid: boolean;
  useRealUnits: boolean;
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
    groundSpeed: 0.27, // ~900 km/h
    recenterToggle: false,
    planeOpacity: 0.1,
    earthOpacity: 0.9,
    showGrid: true,
    useRealUnits: true, // Default to km/h for better realism
    atmosphereOn: true,
  });

  useEffect(() => {
    let frameId: number;
    
    // Calculate current timeOfFlight to know when to stop
    const startPos = latLonToVector3(state.startLat, state.startLon);
    const endPos = latLonToVector3(state.endLat, state.endLon);
    const { timeOfFlight } = calculateInertialTrajectory(startPos, endPos, state.groundSpeed);

    const animate = () => {
      if (state.isPlaying) {
        setState((prev) => {
          const nextTime = prev.time + (0.01 * prev.timeMultiplier);
          if (nextTime >= timeOfFlight) {
            return { ...prev, time: timeOfFlight, isPlaying: false };
          }
          return { ...prev, time: nextTime };
        });
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [state.isPlaying, state.timeMultiplier, state.startLat, state.startLon, state.endLat, state.endLon, state.groundSpeed]);

  const handleTogglePlay = () => setState(s => ({ ...s, isPlaying: !s.isPlaying }));
  const handleReset = () => setState(s => ({ ...s, time: 0, isPlaying: false }));
  const handleRecenterView = () => setState(s => ({ ...s, recenterToggle: !s.recenterToggle }));
  const handleChangeView = (viewMode: ViewMode) => setState(s => ({ ...s, viewMode }));
  const handleUpdateParam = (key: keyof SimulationState, value: number | string | boolean) => setState(s => ({ ...s, [key]: value }));

  return (
    <div className={styles.container}>
      <Scene state={state} />
      <UI 
        state={state} 
        onTogglePlay={handleTogglePlay}
        onReset={handleReset}
        onRecenterView={handleRecenterView}
        onChangeView={handleChangeView}
        onUpdateParam={handleUpdateParam}
      />
    </div>
  );
};

export default CoriolisExplorer;
