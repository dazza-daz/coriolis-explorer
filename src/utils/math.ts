import * as THREE from 'three';

export const EARTH_RADIUS = 5;
export const EARTH_ROTATION_SPEED = 0.5; // Radians per "simulation unit time"
export const SPEED_TO_KMH = 668.0; // Factor to make 2.5 unit speed ~ 1670 km/h (Equatorial Speed)

/**
 * Converts Lat/Lon to a 3D Vector3 on a sphere of radius R.
 * Lat: -90 to 90
 * Lon: -180 to 180
 */
export function latLonToVector3(lat: number, lon: number, radius: number = EARTH_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Gets the position of Aircraft B (Ground-following) at time t.
 * Aircraft B follows a Great Circle in the Earth Frame.
 */
export function getGroundPathPosition(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  t: number,
  speed: number
): THREE.Vector3 {
  // Distance on sphere
  const angle = startPos.angleTo(endPos);
  if (angle === 0) return startPos.clone();
  const duration = angle / speed;
  const alpha = Math.min(t / duration, 1);
  
  const slerped = new THREE.Vector3().copy(startPos);
  const quaternion = new THREE.Quaternion();
  const axis = new THREE.Vector3().crossVectors(startPos, endPos).normalize();
  // Handle antipodal points
  if (axis.length() < 0.001) axis.set(0, 1, 0); 
  quaternion.setFromAxisAngle(axis, angle * alpha);
  slerped.applyQuaternion(quaternion);
  
  return slerped;
}

/**
 * Calculates the exact inertial orbital parameters for Aircraft A to hit the destination.
 * 
 * Mode 'SAME_TIME': A arrives at the same time as B (A's speed is calculated).
 * Mode 'SAME_SPEED': A's initial ground speed magnitude matches B's (arrival time is calculated).
 */
export function calculateInertialTrajectory(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  groundSpeedB: number,
  mode: 'SAME_TIME' | 'SAME_SPEED' = 'SAME_TIME'
) {
  const angleB = startPos.angleTo(endPos);
  if (angleB === 0) {
    return { orbitalAxis: new THREE.Vector3(0,1,0), angularSpeed: 0, requiredInitialGroundSpeed: 0, timeOfFlight: 0 };
  }
  
  const timeOfFlightB = angleB / groundSpeedB;

  if (mode === 'SAME_TIME') {
    const timeOfFlightA = timeOfFlightB;
    const targetInertialPos = endPos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), timeOfFlightA * EARTH_ROTATION_SPEED);
    const inertialAngle = startPos.angleTo(targetInertialPos);
    const angularSpeed = inertialAngle / timeOfFlightA;
    let orbitalAxis = new THREE.Vector3().crossVectors(startPos, targetInertialPos).normalize();
    if (orbitalAxis.length() < 0.001) orbitalAxis = new THREE.Vector3(0, 1, 0).cross(startPos).normalize();

    const v_dir = new THREE.Vector3().crossVectors(orbitalAxis, startPos).normalize();
    const v_inertial = v_dir.clone().multiplyScalar(angularSpeed * EARTH_RADIUS);
    const v_rot = new THREE.Vector3().crossVectors(new THREE.Vector3(0, EARTH_ROTATION_SPEED, 0), startPos);
    const v_gs_initial = new THREE.Vector3().subVectors(v_inertial, v_rot);

    return {
      orbitalAxis,
      angularSpeed,
      requiredInitialGroundSpeed: v_gs_initial.length() / EARTH_RADIUS,
      timeOfFlight: timeOfFlightA
    };
  } else {
    // SAME_SPEED Mode: Find T such that launch_speed(T) == groundSpeedB
    let t = timeOfFlightB;
    let bestT = t;
    let minDiff = Infinity;

    // Use a simple root-finding loop
    for (let i = 0; i < 30; i++) {
      const targetPosAtT = endPos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), t * EARTH_ROTATION_SPEED);
      const inertialAngle = startPos.angleTo(targetPosAtT);
      const angSpeed = inertialAngle / t;
      const axis = new THREE.Vector3().crossVectors(startPos, targetPosAtT).normalize();
      if (axis.length() < 0.001) axis.set(0,1,0);
      
      const v_dir = new THREE.Vector3().crossVectors(axis, startPos).normalize();
      const v_inertial = v_dir.clone().multiplyScalar(angSpeed * EARTH_RADIUS);
      const v_rot = new THREE.Vector3().crossVectors(new THREE.Vector3(0, EARTH_ROTATION_SPEED, 0), startPos);
      const v_gs = new THREE.Vector3().subVectors(v_inertial, v_rot);
      const currentLaunchSpeed = v_gs.length() / EARTH_RADIUS;

      const diff = currentLaunchSpeed - groundSpeedB;
      if (Math.abs(diff) < minDiff) {
        minDiff = Math.abs(diff);
        bestT = t;
      }
      
      // Heuristic adjustment: speed decreases as time increases
      t = t + diff * 5.0; 
      if (t <= 0) t = 0.01;
    }

    const finalTargetInertialPos = endPos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), bestT * EARTH_ROTATION_SPEED);
    const finalInertialAngle = startPos.angleTo(finalTargetInertialPos);
    const finalAngularSpeed = finalInertialAngle / bestT;
    let finalOrbitalAxis = new THREE.Vector3().crossVectors(startPos, finalTargetInertialPos).normalize();
    if (finalOrbitalAxis.length() < 0.001) finalOrbitalAxis = new THREE.Vector3(0, 1, 0).cross(startPos).normalize();

    return {
      orbitalAxis: finalOrbitalAxis,
      angularSpeed: finalAngularSpeed,
      requiredInitialGroundSpeed: groundSpeedB,
      timeOfFlight: bestT
    };
  }
}

export function getInertialPathPositionFromTrajectory(
  startPos: THREE.Vector3,
  t: number,
  orbitalAxis: THREE.Vector3,
  angularSpeed: number,
  timeOfFlight: number
): THREE.Vector3 {
  const pos = new THREE.Vector3().copy(startPos);
  // Cap at destination time
  const effectiveTime = Math.min(t, timeOfFlight);
  const q = new THREE.Quaternion().setFromAxisAngle(orbitalAxis, angularSpeed * effectiveTime);
  pos.applyQuaternion(q);
  return pos;
}

export function getCurrentGroundSpeedA(
  startPos: THREE.Vector3,
  t: number,
  orbitalAxis: THREE.Vector3,
  angularSpeed: number,
  timeOfFlight: number
): number {
  const effectiveTime = Math.min(t, timeOfFlight);
  const posA = getInertialPathPositionFromTrajectory(startPos, effectiveTime, orbitalAxis, angularSpeed, timeOfFlight);
  
  // v_i = omega_orbit x r
  const velA_Inertial = new THREE.Vector3().crossVectors(orbitalAxis, posA).normalize().multiplyScalar(angularSpeed * EARTH_RADIUS);
  
  // v_rot = omega_e x r
  const omegaE = new THREE.Vector3(0, EARTH_ROTATION_SPEED, 0); 
  const velA_Rot = new THREE.Vector3().crossVectors(omegaE, posA);
  
  // v_g = v_i - v_rot
  const velA_Ground = new THREE.Vector3().subVectors(velA_Inertial, velA_Rot);
  return velA_Ground.length() / EARTH_RADIUS; // Normalized units
}

/**
 * Simulates a path in the inertial frame while being "dragged" by the rotating atmosphere.
 */
export function getDampedInertialPath(
  startPos: THREE.Vector3,
  orbitalAxis: THREE.Vector3,
  angularSpeed: number,
  drag: number,
  time: number,
  trajectoryType: 'ORBITAL' | 'BALLISTIC' = 'ORBITAL',
  timeOfFlight: number = 10,
  maxAltitude: number = 0.5
): THREE.Vector3[] {
  const pts = [];
  const dt = 0.05;
  const currentPos = startPos.clone();
  
  // Initial inertial velocity
  const v_dir = new THREE.Vector3().crossVectors(orbitalAxis, startPos).normalize();
  let velocity = v_dir.multiplyScalar(angularSpeed * EARTH_RADIUS);
  const omega = new THREE.Vector3(0, EARTH_ROTATION_SPEED, 0);

  pts.push(currentPos.clone());

  for (let t = dt; t <= time + 0.001; t += dt) {
    // 1. Calculate local air velocity (at current surface position)
    const groundLevelPos = currentPos.clone().normalize().multiplyScalar(EARTH_RADIUS);
    const v_air = new THREE.Vector3().crossVectors(omega, groundLevelPos);
    
    // 2. Drag acceleration
    const v_rel = new THREE.Vector3().subVectors(velocity, v_air);
    const a_drag = v_rel.multiplyScalar(-drag * 2.0);

    // 3. Integrate horizontal velocity
    velocity.add(a_drag.multiplyScalar(dt));
    
    // 4. Update horizontal position on sphere
    currentPos.add(velocity.clone().multiplyScalar(dt));
    currentPos.normalize().multiplyScalar(EARTH_RADIUS);
    
    // Ensure velocity stays tangential to surface (horizontal integration only)
    const radial = currentPos.clone().normalize();
    const v_radial_mag = velocity.dot(radial);
    velocity.sub(radial.multiplyScalar(v_radial_mag));

    // 5. Apply Vertical Profile for BALLISTIC mode
    let finalPos = currentPos.clone();
    if (trajectoryType === 'BALLISTIC') {
      const peakAltitude = EARTH_RADIUS * maxAltitude; 
      const progress = Math.min(t / timeOfFlight, 1);
      const altitude = 4 * peakAltitude * progress * (1 - progress);
      finalPos.multiplyScalar((EARTH_RADIUS + altitude) / EARTH_RADIUS);
    }

    pts.push(finalPos);
  }
  
  return pts;
}

/**
 * Calculates the required steering force (acceleration) for an aircraft to maintain
 * a Great Circle path on a rotating Earth.
 */
export function getRequiredSteeringForce(
  pos: THREE.Vector3,
  v_ground: THREE.Vector3
): THREE.Vector3 {
  // omega = [0, EARTH_ROTATION_SPEED, 0]
  const omega = new THREE.Vector3(0, EARTH_ROTATION_SPEED, 0);
  
  // 1. Coriolis Acceleration: a_c = 2 * (omega x v_ground)
  const a_coriolis = new THREE.Vector3().crossVectors(omega, v_ground).multiplyScalar(2);
  
  // 2. Centrifugal Acceleration: a_cf = omega x (omega x r)
  const a_centrifugal = new THREE.Vector3().crossVectors(omega, pos);
  a_centrifugal.crossVectors(omega, a_centrifugal);
  
  // 3. Total fictitious acceleration
  const a_total = new THREE.Vector3().addVectors(a_coriolis, a_centrifugal);

  // 4. Project onto Tangent Plane (Local Horizontal)
  // n is the surface normal at current position
  const n = pos.clone().normalize();
  const radialComponent = a_total.dot(n);
  const radialVector = n.multiplyScalar(radialComponent);
  
  // Horizontal force = Total - Radial
  // This represents the "sideways" force the aircraft must provide to stay on the ground track
  return new THREE.Vector3().subVectors(a_total, radialVector);
}
