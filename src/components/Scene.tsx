'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Line, PerspectiveCamera, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationState } from './CoriolisExplorer';
import { EARTH_RADIUS, EARTH_ROTATION_SPEED, latLonToVector3, getGroundPathPosition, calculateInertialTrajectory, getInertialPathPositionFromTrajectory } from '../utils/math';

interface SceneProps {
  state: SimulationState;
}

const SphericalGrid = ({ opacity }: { opacity: number }) => {
  const lines = useMemo(() => {
    const pts = [];
    // Latitudes
    for (let lat = -75; lat <= 75; lat += 15) {
      const phi = (90 - lat) * (Math.PI / 180);
      const r = EARTH_RADIUS * 1.001 * Math.sin(phi);
      const y = EARTH_RADIUS * 1.001 * Math.cos(phi);
      const circlePts = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        circlePts.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
      }
      pts.push(circlePts);
    }
    // Longitudes
    for (let lon = 0; lon < 180; lon += 15) {
      const circlePts = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        const p = new THREE.Vector3(EARTH_RADIUS * 1.001 * Math.cos(angle), EARTH_RADIUS * 1.001 * Math.sin(angle), 0);
        p.applyAxisAngle(new THREE.Vector3(0, 1, 0), lon * (Math.PI / 180));
        circlePts.push(p);
      }
      pts.push(circlePts);
    }
    return pts;
  }, []);

  return (
    <group>
      {lines.map((linePts, i) => (
        <Line key={i} points={linePts} color="white" lineWidth={1} transparent opacity={opacity} depthWrite={false} />
      ))}
    </group>
  );
};

const Earth = ({ opacity, showGrid }: { opacity: number; showGrid: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial 
          map={texture} 
          transparent 
          opacity={opacity} 
          depthWrite={opacity > 0.5} 
        />
      </mesh>
      {showGrid && <SphericalGrid opacity={0.3} />}
    </group>
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
  const { startLat, startLon, endLat, endLon, groundSpeed, time, viewMode, planeOpacity, earthOpacity, showGrid } = state;

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
  
  const earthFrameRotationAdjustment = -time * EARTH_ROTATION_SPEED;
  
  const currentPosA_Ground = currentPosA_Inertial.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), earthFrameRotationAdjustment);
  const velA_Ground_EarthFrame = velA_Ground_InertialFrame.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), earthFrameRotationAdjustment);

  return (
    <>
      {/* Earth-Fixed Frame Group (Rotates in Inertial View) */}
      <group rotation={[0, earthRotation, 0]}>
        <Earth opacity={earthOpacity} showGrid={showGrid} />

        {/* Great Circle Plane for B (Cyan) - Square, Parallel to path */}
        <mesh rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisB))}>
          <planeGeometry args={[EARTH_RADIUS * 4.2, EARTH_RADIUS * 4.2]} />
          <meshBasicMaterial 
            color="cyan" 
            transparent 
            opacity={planeOpacity} 
            side={THREE.DoubleSide} 
            depthWrite={false}
          />
        </mesh>
        
        {/* Aircraft B Trail & Marker */}
        <Line points={pointsB_Ground} color="cyan" lineWidth={2} />
        <mesh position={currentPosB_Ground}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="cyan" emissive="cyan" emissiveIntensity={2} />
        </mesh>
        <VelocityArrow position={currentPosB_Ground} velocity={velB_Ground} color="cyan" label="V_G (B)" />

        {/* Aircraft A Ground Track & Marker - Dashed to differentiate from B */}
        <Line 
          points={pointsA_Ground} 
          color="red" 
          lineWidth={2} 
          opacity={0.6} 
          transparent 
          dashed
          dashScale={20}
          dashSize={0.5}
          gapSize={0.5}
        />
        <mesh position={currentPosA_Ground}>
           <sphereGeometry args={[0.08, 16, 16]} />
           <meshStandardMaterial color="red" transparent opacity={0.8} />
        </mesh>
        <VelocityArrow position={currentPosA_Ground} velocity={velA_Ground_EarthFrame} color="red" label="V_G (A)" />
      </group>

      {/* Inertial Frame Group (Rotates in Earth-Fixed View) */}
      <group rotation={[0, spaceRotation, 0]}>
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Visual guide for the inertial plane of Aircraft A (Red) - Square, Parallel to path */}
        <mesh rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), orbitalAxis))}>
          <planeGeometry args={[EARTH_RADIUS * 4.2, EARTH_RADIUS * 4.2]} />
          <meshBasicMaterial 
            color="red" 
            transparent 
            opacity={planeOpacity} 
            side={THREE.DoubleSide} 
            depthWrite={false}
          />
        </mesh>

        {/* Aircraft A True Inertial Path & Marker */}
        <Line points={pointsA_Space} color="red" lineWidth={2} />
        <mesh position={currentPosA_Inertial}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} />
        </mesh>
      </group>
    </>
  );
};

const CameraController = ({ state }: { state: SimulationState }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const [prevViewMode, setPrevViewMode] = useState(state.viewMode);

  // Handle seamless transition between frames
  useEffect(() => {
    if (prevViewMode !== state.viewMode) {
      const angle = state.time * EARTH_ROTATION_SPEED;
      // Calculate rotation to keep Africa at the same relative PoV on screen
      const rotationAngle = state.viewMode === 'EARTH_FIXED' ? -angle : angle;
      
      camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      setPrevViewMode(state.viewMode);
    }
  }, [state.viewMode, state.time, camera, prevViewMode]);

  // Handle explicit recentering
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [state.recenterToggle]);

  return <OrbitControls ref={controlsRef} enableDamping />;
};

const Scene: React.FC<SceneProps> = ({ state }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[12, 8, 12]} />
        <CameraController state={state} />
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
