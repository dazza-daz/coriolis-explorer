'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Line, PerspectiveCamera, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationState, ViewMode } from './CoriolisExplorer';
import { EARTH_RADIUS, EARTH_ROTATION_SPEED, latLonToVector3, getGroundPathPosition, calculateInertialTrajectory, getInertialPathPositionFromTrajectory } from '../utils/math';

interface SceneProps {
  state: SimulationState;
}

const Earth = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshStandardMaterial map={texture} transparent opacity={0.9} />
      <gridHelper 
        args={[EARTH_RADIUS * 2.1, 24, 0x444444, 0x222222]} 
        rotation={[Math.PI / 2, 0, 0]} 
      />
    </mesh>
  );
};

const Trajectories = ({ state }: { state: SimulationState }) => {
  const { startLat, startLon, endLat, endLon, groundSpeed, time, viewMode } = state;

  const startPos = useMemo(() => latLonToVector3(startLat, startLon), [startLat, startLon]);
  const endPos = useMemo(() => latLonToVector3(endLat, endLon), [endLat, endLon]);

  // Derived orbital parameters for Aircraft A
  const trajectoryA = useMemo(() => 
    calculateInertialTrajectory(startPos, endPos, groundSpeed),
  [startPos, endPos, groundSpeed]);

  const { orbitalAxis, angularSpeed, timeOfFlight } = trajectoryA;

  // Path A Ground Track (Coriolis curve in Earth frame)
  const pointsA_Ground = useMemo(() => {
    const pts = [];
    const step = 0.05;
    const maxT = Math.min(time, timeOfFlight);
    for (let t = 0; t <= maxT; t += step) {
      const pos = getInertialPathPositionFromTrajectory(startPos, t, orbitalAxis, angularSpeed, timeOfFlight);
      pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -t * EARTH_ROTATION_SPEED);
      pts.push(pos);
    }
    const current = getInertialPathPositionFromTrajectory(startPos, maxT, orbitalAxis, angularSpeed, timeOfFlight);
    current.applyAxisAngle(new THREE.Vector3(0, 1, 0), -maxT * EARTH_ROTATION_SPEED);
    pts.push(current);
    return pts;
  }, [startPos, orbitalAxis, angularSpeed, timeOfFlight, time]);

  // Path A Inertial Path (Straight Great Circle in space)
  const pointsA_Space = useMemo(() => {
    const pts = [];
    const step = 0.05;
    const maxT = Math.min(time, timeOfFlight);
    for (let t = 0; t <= maxT; t += step) {
      pts.push(getInertialPathPositionFromTrajectory(startPos, t, orbitalAxis, angularSpeed, timeOfFlight));
    }
    pts.push(getInertialPathPositionFromTrajectory(startPos, maxT, orbitalAxis, angularSpeed, timeOfFlight));
    return pts;
  }, [startPos, orbitalAxis, angularSpeed, timeOfFlight, time]);

  // Path B Ground Track (Straight Great Circle on Earth)
  const pointsB_Ground = useMemo(() => {
    const pts = [];
    const step = 0.05;
    const maxT = Math.min(time, timeOfFlight);
    for (let t = 0; t <= maxT; t += step) {
      pts.push(getGroundPathPosition(startPos, endPos, t, groundSpeed));
    }
    pts.push(getGroundPathPosition(startPos, endPos, maxT, groundSpeed));
    return pts;
  }, [startPos, endPos, time, groundSpeed, timeOfFlight]);

  const earthRotation = viewMode === 'INERTIAL' ? time * EARTH_ROTATION_SPEED : 0;
  const spaceRotation = viewMode === 'EARTH_FIXED' ? -time * EARTH_ROTATION_SPEED : 0;

  return (
    <>
      {/* Earth-Fixed Frame Group */}
      <group rotation={[0, earthRotation, 0]}>
        <Earth />
        
        {/* Aircraft B Trail (Cyan) */}
        <Line points={pointsB_Ground} color="cyan" lineWidth={2} />
        <mesh position={pointsB_Ground[pointsB_Ground.length - 1]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="cyan" emissive="cyan" emissiveIntensity={2} />
        </mesh>

        {/* Aircraft A Ground Track (Faded Red) */}
        <Line points={pointsA_Ground} color="red" lineWidth={1} opacity={0.4} transparent />
      </group>

      {/* Inertial Frame Group */}
      <group rotation={[0, spaceRotation, 0]}>
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Visual guide for the inertial plane of Aircraft A */}
        <mesh rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), orbitalAxis))}>
          <ringGeometry args={[EARTH_RADIUS * 0.99, EARTH_RADIUS * 1.01, 64]} />
          <meshBasicMaterial color="red" transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>

        {/* Aircraft A True Inertial Path (Red) */}
        <Line points={pointsA_Space} color="red" lineWidth={2} />
        <mesh position={pointsA_Space[pointsA_Space.length - 1]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} />
        </mesh>
      </group>
    </>
  );
};

const Scene: React.FC<SceneProps> = ({ state }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[12, 8, 12]} />
        <OrbitControls enableDamping />
        <ambientLight intensity={0.6} />
        <pointLight position={[20, 20, 20]} intensity={2} />
        
        <React.Suspense fallback={null}>
          <Trajectories state={state} />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default Scene;
