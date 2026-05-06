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
 * Calculates the exact inertial orbital parameters for Aircraft A to hit the destination 
 * at the exact same time as Aircraft B.
 */
export function calculateInertialTrajectory(
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  groundSpeedB: number
) {
  const angleB = startPos.angleTo(endPos);
  if (angleB === 0) {
    return { orbitalAxis: new THREE.Vector3(0,1,0), angularSpeed: 0, requiredInitialGroundSpeed: 0, timeOfFlight: 0 };
  }
  
  const timeOfFlight = angleB / groundSpeedB;
  
  // Destination position in the inertial frame at time of arrival
  const targetInertialPos = endPos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), timeOfFlight * EARTH_ROTATION_SPEED);
  
  // Inertial distance and speed
  const inertialAngle = startPos.angleTo(targetInertialPos);
  const angularSpeed = inertialAngle / timeOfFlight;
  
  // Orbital plane
  let orbitalAxis = new THREE.Vector3().crossVectors(startPos, targetInertialPos).normalize();
  if (orbitalAxis.length() < 0.001) {
    // If start and target are collinear, any axis perpendicular to startPos works
    orbitalAxis = new THREE.Vector3(0, 1, 0).cross(startPos).normalize();
  }

  // Calculate required initial ground velocity to display to user
  const v_dir = new THREE.Vector3().crossVectors(orbitalAxis, startPos).normalize();
  const v_inertial = v_dir.multiplyScalar(angularSpeed * EARTH_RADIUS);
  
  // v_rot = omega x startPos. 
  // In our scene, Earth rotates around Y by +angle, so omega = [0, EARTH_ROTATION_SPEED, 0]
  const omega = new THREE.Vector3(0, EARTH_ROTATION_SPEED, 0);
  const v_rot = new THREE.Vector3().crossVectors(omega, startPos);
  
  // v_gs = v_inertial - v_rot
  const v_gs_initial = new THREE.Vector3().subVectors(v_inertial, v_rot);
  // Return as angular speed to match Aircraft B's state unit
  const requiredInitialGroundSpeed = v_gs_initial.length() / EARTH_RADIUS;

  return {
    orbitalAxis,
    angularSpeed,
    requiredInitialGroundSpeed,
    timeOfFlight
  };
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
  const omegaE = new THREE.Vector3(0, -EARTH_ROTATION_SPEED, 0); 
  const velA_Rot = new THREE.Vector3().crossVectors(omegaE, posA);
  
  // v_g = v_i - v_rot
  const velA_Ground = new THREE.Vector3().subVectors(velA_Inertial, velA_Rot);
  return velA_Ground.length() / EARTH_RADIUS; // Normalized units
}
