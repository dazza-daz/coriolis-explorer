'use client';

import React, { useState, useEffect } from 'react';
import Scene from './Scene';
import UI from './UI';
import styles from './CoriolisExplorer.module.css';
import { latLonToVector3, calculateInertialTrajectory } from '../utils/math';

export type ViewMode = 'INERTIAL' | 'EARTH_FIXED';
export type TargetingMode = 'SAME_TIME' | 'SAME_SPEED';
export type TrajectoryType = 'ORBITAL' | 'BALLISTIC';

export interface SimulationState {
  isPlaying: boolean;
  time: number;
  timeMultiplier: number;
  viewMode: ViewMode;
  targetingMode: TargetingMode;
  trajectoryType: TrajectoryType;
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
  atmosphereOn: boolean;
  dragCoefficient: number;
  autoStop: boolean;
  maxAltitude: number;
}

const CoriolisExplorer: React.FC = () => {
  const [state, setState] = useState<SimulationState>({
    isPlaying: false,
    time: 0,
    timeMultiplier: 1,
    viewMode: 'INERTIAL',
    targetingMode: 'SAME_TIME',
    trajectoryType: 'ORBITAL',
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
    dragCoefficient: 0.5,
    autoStop: true,
    maxAltitude: 0.25, // Scale factor: 0.25 = 25% Earth Radius
  });

  useEffect(() => {
    let frameId: number;
    
    const startPos = latLonToVector3(state.startLat, state.startLon);
    const endPos = latLonToVector3(state.endLat, state.endLon);
    const { timeOfFlight: tA } = calculateInertialTrajectory(startPos, endPos, state.groundSpeed, state.targetingMode);
    const tB = startPos.angleTo(endPos) / state.groundSpeed;
    const maxTOF = Math.max(tA, tB);

    const animate = () => {
      if (state.isPlaying) {
        setState((prev) => {
          const nextTime = prev.time + (0.01 * prev.timeMultiplier);
          if (prev.autoStop && nextTime >= maxTOF) {
            return { ...prev, time: maxTOF, isPlaying: false };
          }
          return { ...prev, time: nextTime };
        });
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [state.isPlaying, state.timeMultiplier, state.startLat, state.startLon, state.endLat, state.endLon, state.groundSpeed, state.targetingMode, state.trajectoryType]);

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
