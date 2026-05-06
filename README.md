# 🌍 Coriolis Explorer

An interactive 3D visualization tool built to demonstrate the Coriolis effect and the physics of rotating reference frames. Compare the paths of a ballistic orbital object and a ground-following aircraft as they traverse a rotating Earth.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-r184-black?logo=three.js)

## 🚀 The Thought Experiment

Two aircraft leave the same location at the same time, heading for the same destination:

1.  **Aircraft A (Red - Orbital)**: Follows a true ballistic trajectory. It is launched into an inertial orbital plane that is mathematically calculated to intercept the destination exactly when the Earth's rotation brings that target into the plane.
2.  **Aircraft B (Cyan - Ground-Following)**: Follows a standard Great Circle path relative to the Earth's surface, as if guided by GPS or a pilot following the ground.

### Observation Modes

*   **Inertial View**: Observe from "fixed space." Watch the Earth rotate underneath Aircraft A's straight orbital plane, while Aircraft B appears to curve eastward with the planet.
*   **Earth-Fixed View**: Observe from the ground. Aircraft B follows a straight line, while Aircraft A appears to deflect sideways—the classic visualization of the **Coriolis Effect**.

---

## ✨ Key Features

*   **Targeted Intercept Math**: Aircraft A's initial launch speed and heading are dynamically calculated based on Aircraft B's ground speed to ensure they arrive at the destination simultaneously.
*   **Dual Reference Frames**: Seamlessly toggle between Inertial and Earth-fixed views without losing your point of observation.
*   **Real-Time Physics**: 
    *   3D Velocity Vectors ($V_G$) showing speed over ground.
    *   Transparent Geometric Planes (Square) representing the plane of motion.
    *   Spherical Latitude/Longitude grid for precise tracking.
*   **Modern Interactive UI**: 
    *   Glassmorphism-style control panel with collapsible sections.
    *   Simulation playback controls (Play/Pause/Reset/Speed).
    *   Earth and Plane opacity controls for focused analysis.
    *   Scenario presets (e.g., North Pole to Equator).

---

## 🛠 Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **3D Graphics**: [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) & [Three.js](https://threejs.org/)
*   **Components**: [@react-three/drei](https://github.com/pmndrs/drei)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: CSS Modules

---

## 🏃 Getting Started

### Prerequisites

*   Node.js 18.x or higher
*   npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd corilois-demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Usage Guide

1.  **Select a Preset**: Start with "North Pole to Equator" for the cleanest demonstration.
2.  **Adjust Speed**: Use the "Aircraft B Speed" slider to change how fast the flight takes. Notice how the required "Launch Speed for A" updates automatically.
3.  **Play**: Watch the markers move and the trails form.
4.  **Toggle Views**: Switch between "Inertial" and "Earth-Fixed" to see the same motion from different perspectives.
5.  **Focus**: Use the "Earth Opacity" and "Lat/Lon Grid" controls to see the internal geometric planes more clearly.

---

## ⚖️ License

This project is licensed under the MIT License - see the LICENSE file for details.
