'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Line, PerspectiveCamera, useTexture, Html } from '@react-three/drei';
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

const VelocityArrow = ({ position, velocity, color, label }: { position: THREE.Vector3; velocity: THREE.Vector3; color: string; label: string }) => {
  const length = velocity.length() * 2; // Scale for visibility
  if (length < 0.1) return null;
  const dir = velocity.clone().normalize();
  
  return (
    <group position={position}>
      <arrowHelper args={[dir, new THREE.Vector3(0,0,0), length, color, 0.2, 0.1]} />
      <Html distanceFactor={10} position={[dir.x * length * 0.5, dir.y * length * 0.5, dir.z * length * 0.5]}>
        <div style={{ 
          color, 
          background: 'rgba(0,0,0,0.8)', 
          padding: '2px 6px', 
          borderRadius: '4px', 
          fontSize: '11px', 
          fontWeight: 'bold',
          whiteSpace: 'nowrap', 
          border: `1px solid ${color}`,
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {label}: {velocity.length().toFixed(3)}
        </div>
      </Html>
    </group>
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

  const maxT = Math.min(time, timeOfFlight);

  // Path A Ground Track (Coriolis curve in Earth frame)
  const pointsA_Ground = useMemo(() => {
    const pts = [];
    const step = 0.05;
    for (let t = 0; t <= maxT; t += step) {
      const pos = getInertialPathPositionFromTrajectory(startPos, t, orbitalAxis, angularSpeed, timeOfFlight);
      pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -t * EARTH_ROTATION_SPEED);
      pts.push(pos);
    }
    const current = getInertialPathPositionFromTrajectory(startPos, maxT, orbitalAxis, angularSpeed, timeOfFlight);
    current.applyAxisAngle(new THREE.Vector3(0, 1, 0), -maxT * EARTH_ROTATION_SPEED);
    pts.push(current);
    return pts;
  }, [startPos, orbitalAxis, angularSpeed, timeOfFlight, maxT]);

  // Path A Inertial Path (Straight Great Circle in space)
  const pointsA_Space = useMemo(() => {
    const pts = [];
    const step = 0.05;
    for (let t = 0; t <= maxT; t += step) {
      pts.push(getInertialPathPositionFromTrajectory(startPos, t, orbitalAxis, angularSpeed, timeOfFlight));
    }
    pts.push(getInertialPathPositionFromTrajectory(startPos, maxT, orbitalAxis, angularSpeed, timeOfFlight));
    return pts;
  }, [startPos, orbitalAxis, angularSpeed, timeOfFlight, maxT]);

  // Path B Ground Track (Straight Great Circle on Earth)
  const pointsB_Ground = useMemo(() => {
    const pts = [];
    const step = 0.05;
    for (let t = 0; t <= maxT; t += step) {
      pts.push(getGroundPathPosition(startPos, endPos, t, groundSpeed));
    }
    pts.push(getGroundPathPosition(startPos, endPos, maxT, groundSpeed));
    return pts;
  }, [startPos, endPos, groundSpeed, timeOfFlight, maxT]);

  const earthRotation = viewMode === 'INERTIAL' ? time * EARTH_ROTATION_SPEED : 0;
  const spaceRotation = viewMode === 'EARTH_FIXED' ? -time * EARTH_ROTATION_SPEED : 0;

  // Calculate current positions and velocities
  const currentPosB_Ground = pointsB_Ground[pointsB_Ground.length - 1];
  const currentPosA_Inertial = pointsA_Space[pointsA_Space.length - 1];
  
  // Velocity B (Ground)
  const axisB = new THREE.Vector3().crossVectors(startPos, endPos).normalize();
  if (axisB.length() < 0.001) axisB.set(0, 1, 0);
  const velB_Ground = new THREE.Vector3().crossVectors(axisB, currentPosB_Ground).normalize().multiplyScalar(groundSpeed * EARTH_RADIUS);

  // Velocity A (Inertial)
  const velA_Inertial = new THREE.Vector3().crossVectors(orbitalAxis, currentPosA_Inertial).normalize().multiplyScalar(angularSpeed * EARTH_RADIUS);
  
  // v_ground = v_inertial - omega_e x r
  const omegaE = new THREE.Vector3(0, -EARTH_ROTATION_SPEED, 0); 
  const velA_Rot = new THREE.Vector3().crossVectors(omegaE, currentPosA_Inertial);
  const velA_Ground_InertialFrame = new THREE.Vector3().subVectors(velA_Inertial, velA_Rot);
  
  // Transform A's ground position and velocity for the Earth-Fixed group
  // The Earth-Fixed group has rotation [0, earthRotation, 0]
  // In INERTIAL view, earthRotation = time * EARTH_ROTATION_SPEED. 
  // To keep Aircraft A correctly positioned on the ground, we must undo this rotation
  const earthFrameRotationAdjustment = -time * EARTH_ROTATION_SPEED;
  
  const currentPosA_Ground = currentPosA_Inertial.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), earthFrameRotationAdjustment);
  const velA_Ground_EarthFrame = velA_Ground_InertialFrame.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), earthFrameRotationAdjustment);

  return (
    <>
      {/* Earth-Fixed Frame Group (Rotates in Inertial View) */}
      <group rotation={[0, earthRotation, 0]}>
        <Earth />
        
        {/* Aircraft B Trail & Marker */}
        <Line points={pointsB_Ground} color="cyan" lineWidth={2} />
        <mesh position={currentPosB_Ground}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="cyan" emissive="cyan" emissiveIntensity={2} />
        </mesh>
        <VelocityArrow position={currentPosB_Ground} velocity={velB_Ground} color="cyan" label="V_G (B)" />

        {/* Aircraft A Ground Track & Marker */}
        <Line points={pointsA_Ground} color="red" lineWidth={2} opacity={0.6} transparent />
        <mesh position={currentPosA_Ground}>
           <sphereGeometry args={[0.08, 16, 16]} />
           <meshStandardMaterial color="red" transparent opacity={0.8} />
        </mesh>
        {/* Only show ground velocity arrow in Earth-Fixed view or when relevant to ground track */}
        <VelocityArrow position={currentPosA_Ground} velocity={velA_Ground_EarthFrame} color="red" label="V_G (A)" />
      </group>

      {/* Inertial Frame Group (Rotates in Earth-Fixed View) */}
      <group rotation={[0, spaceRotation, 0]}>
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Visual guide for the inertial plane of Aircraft A */}
        <mesh rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), orbitalAxis))}>
          <ringGeometry args={[EARTH_RADIUS * 0.99, EARTH_RADIUS * 1.01, 64]} />
          <meshBasicMaterial color="red" transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>

        {/* Aircraft A True Inertial Path & Marker */}
        <Line points={pointsA_Space} color="red" lineWidth={2} />
        <mesh position={currentPosA_Inertial}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} />
        </mesh>
        {/* Show Inertial Velocity ONLY in Inertial View to avoid clutter */}
        {viewMode === 'INERTIAL' && (
          <VelocityArrow position={currentPosA_Inertial} velocity={velA_Inertial} color="#ff8888" label="V_I (A)" />
        )}
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
