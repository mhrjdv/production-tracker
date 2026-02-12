# ⚡ LASERMAN: Production Tracker Suite v2.0
> **The Definitive Creative Engine for Modern Animated Filmmaking.**

![Version](https://img.shields.io/badge/Version-2.0.0--Stable-e63946?style=for-the-badge)
![License](https://img.shields.io/badge/License-Proprietary-0a0b0e?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-Python_%7C_Vanilla_JS-34a853?style=for-the-badge)

---

## 📽️ The Vision
**Laserman** is not just a tracker; it is the central nervous system of your production. Designed for high-stakes animated feature development, this suite bridges the gap between raw creative vision and technical execution. 

Whether you are defining the "Identity" of your world or managing a 200+ shot action sequence, Laserman provides a high-fidelity, data-driven environment to ensure every frame aligns with the director's intent.

---

## 💎 Premium Features

### 🎨 The Creative Bible
Deep integration with `film_identity_context.json` ensures that the tone, lighting rules, and visual philosophy are always one click away.

### 🎬 Production & Shot Management
*   **Hierarchical Breakdown**: Navigate seamlessly from Acts to Macro-Scenes down to individual story beats.
*   **Asset Persistence**: Upload and crop keyframes directly in the browser.
*   **Global Filters**: Instantly isolate shots by character, location, or emotional tone.

### ⏳ Interactive Timeline
A professional-grade sequencer allowing you to drag, drop, and reorganize scenes to visualize the narrative flow in real-time.

### 👤 Character Identity Suite
Manage your cast with specialized "Design Philosophy" cards. Track visual cues, body language rules, and core identities for every character in the Laserman universe.

---

## 🚀 Quick Start Guide

You don't need to be a developer to run the Laserman Suite. Follow these simple steps to launch your production dashboard.

### 1. Prerequisites
Ensure you have **Python 3** installed on your machine.
> [Download Python](https://www.python.org/downloads/)

### 2. Generate the Tracker
Open your terminal (or Command Prompt) in the project folder and run the build engine:
```bash
python3 build_tracker.py
```
*This script compiles all your creative JSON data into a single, interactive application.*

### 3. Launch
Locate the newly generated file: `production_tracker.html`. 
**Double-click it** to open it in your favorite web browser (Chrome or Safari recommended).

---

## 🛠️ Under the Hood (For Technical Teams)

The system architecture is designed for **maximum portability and speed**, utilizing a "Zero-Database" local-first approach.

*   **Compiler**: `build_tracker.py` serializes multi-dimensional JSON structures into a hydrated HTML template.
*   **Persistence**: Leverages browser `localStorage` for client-side asset management, featuring built-in **Canvas-based image compression** to optimize storage quota.
*   **State Management**: Pure Vanilla JavaScript with high-performance DOM reconciliation for a lag-free experience across hundreds of shots.

---

## 📂 Project Architecture

```text
├── build_tracker.py           # The Compilation Engine
├── production_tracker.html    # The Interactive Dashboard (Generated)
├── film_identity_context.json # The Creative Bible
├── laserman_v2_characters.json # Character Metadata
├── laserman_v2_scenes_...     # Shot & Narrative Brekadowns
└── merge_scene_...            # Data Pre-processing Utilities
```

---

## 👋 Support & Contribution
This suite is built for visionaries. If you encounter issues or have feature requests for the v3.0 roadmap, please contact the lead developer.

**Stay Inspired. Built for Laserman.**

---
*© 2026 Laserman Production Team. All Rights Reserved.*
