#!/usr/bin/env python3
"""Build Lazer production tracker HTML with embedded JSON data."""

import json
import os

DIR = os.path.dirname(os.path.abspath(__file__))

def load_json(name):
    with open(os.path.join(DIR, name), 'r', encoding='utf-8') as f:
        return json.load(f)

def main():
    film_identity = load_json('film_identity_context.json')
    characters = load_json('lazer_v2_characters.json')
    scenes_extracted = load_json('lazer_v2_scenes_extracted.json')
    scenes_description = load_json('lazer_v2_scenes_description.json')
    
    data = {
        'film_identity': film_identity,
        'characters': characters,
        'scenes_extracted': scenes_extracted,
        'scenes_description': scenes_description
    }
    
    # Escape for JavaScript
    json_str = json.dumps(data, ensure_ascii=False).replace('</script>', '<\\/script>')
    
    html_path = os.path.join(DIR, 'production_tracker.html')
    with open(html_path, 'w', encoding='utf-8') as out:
        out.write(HTML_TEMPLATE.replace('__EMBEDDED_DATA__', json_str))
    
    print(f"Built {html_path}")

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1280, initial-scale=1">
  <title>Lazer Film — Production Tracker</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0a0b0e;
      --bg-card: #12141a;
      --bg-elevated: #1a1d26;
      --accent: #e63946;
      --accent-muted: #c5303d;
      --text: #e8eaed;
      --text-muted: #9aa0a6;
      --border: #2d3239;
      --success: #34a853;
      --radius: 8px;
      --radius-lg: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background: var(--bg-dark);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }
    .app {
      max-width: 1600px;
      margin: 0 auto;
      padding: 1.5rem;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--accent);
    }
    .tabs {
      display: flex;
      gap: 0.5rem;
    }
    .tab {
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      border-radius: var(--radius);
      cursor: pointer;
      font-family: inherit;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .tab:hover { color: var(--text); border-color: var(--text-muted); }
    .tab.active {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }
    .panel { display: none; }
    .panel.active { display: block; }
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
      align-items: center;
    }
    .filter-bar input, .filter-bar select {
      padding: 0.5rem 0.75rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text);
      font-family: inherit;
      font-size: 0.9rem;
      min-width: 180px;
    }
    .filter-bar input::placeholder { color: var(--text-muted); }
    .filter-bar label { font-size: 0.85rem; color: var(--text-muted); }
    .filter-bar .filter-group { display: flex; align-items: center; gap: 0.5rem; }
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }
    .dashboard-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
      width: 100%;
    }
    .dashboard-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1rem 1.25rem;
    }
    .dashboard-card h3 {
      font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--text-muted); margin-bottom: 0.5rem;
    }
    .dashboard-card .progress-value {
      font-size: 1.75rem; font-weight: 600; color: var(--accent);
    }
    .dashboard-card .progress-label { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem; }
    .dashboard-card .progress-bar {
      height: 6px; background: var(--bg-elevated); border-radius: 3px; margin-top: 0.5rem; overflow: hidden;
    }
    .dashboard-card .progress-bar-fill {
      height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.2s;
    }
    .dashboard-card-wide { grid-column: span 1; }
    @media (min-width: 900px) { .dashboard-card-wide { grid-column: span 2; } }
    .act-progress-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.25rem; }
    .act-progress-item {
      display: grid; grid-template-columns: 60px 1fr 50px; gap: 0.5rem; align-items: center; font-size: 0.85rem;
    }
    .act-progress-item .progress-bar { flex: 1; margin: 0; }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      overflow: hidden;
    }
    .card h3 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }
    .card ul, .card p { font-size: 0.9rem; line-height: 1.6; color: var(--text-muted); }
    .card ul { list-style: none; }
    .card li { margin-bottom: 0.25rem; }
    .card li strong { color: var(--text); }
    .characters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .char-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .char-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: var(--bg-elevated);
      border: 2px dashed var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
      overflow: hidden;
      cursor: pointer;
      position: relative;
    }
    .char-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .char-avatar:hover { border-color: var(--accent); }
    .char-avatar input { display: none; }
    .char-avatar .placeholder { font-size: 2rem; color: var(--text-muted); }
    .char-avatar-wrap { position: relative; display: inline-block; margin-bottom: 0.75rem; }
    .char-avatar-actions {
      position: absolute; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; gap: 0.25rem;
      padding: 0.25rem; background: rgba(0,0,0,0.6); border-radius: 0 0 50% 50%;
      opacity: 0; transition: opacity 0.2s;
    }
    .char-avatar-wrap:hover .char-avatar-actions { opacity: 1; }
    .char-avatar-actions button {
      padding: 0.2rem 0.5rem; font-size: 0.7rem; background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: 4px; color: var(--text); cursor: pointer; font-family: inherit;
    }
    .char-avatar-actions button:hover { background: var(--accent); border-color: var(--accent); }
    .crop-modal {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000;
      align-items: center; justify-content: center; padding: 1rem;
    }
    .crop-modal.visible { display: flex; }
    .crop-modal-inner {
      background: var(--bg-card); border-radius: var(--radius-lg); padding: 1.25rem;
      max-width: 420px; width: 100%;
    }
    .crop-modal h3 { font-size: 1rem; margin-bottom: 1rem; color: var(--text); }
    .crop-preview {
      width: 320px; height: 320px; margin: 0 auto 1rem; overflow: hidden; position: relative;
      border: 2px solid var(--border); border-radius: 8px; touch-action: none; cursor: grab;
    }
    .crop-preview:active { cursor: grabbing; }
    .crop-preview img { display: block; user-select: none; pointer-events: none; }
    .crop-modal-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .crop-modal-buttons button {
      padding: 0.5rem 1rem; border-radius: var(--radius); font-family: inherit; font-size: 0.9rem;
      cursor: pointer; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text);
    }
    .crop-modal-buttons button.primary { background: var(--accent); border-color: var(--accent); }
    .char-card h4 { font-size: 1rem; margin-bottom: 0.25rem; }
    .char-card .role { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; }
    .char-card .traits { font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; }
    .hierarchy {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .act-block {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .act-header {
      padding: 0.75rem 1rem;
      background: var(--bg-elevated);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      font-size: 1rem;
    }
    .act-header:hover { background: #22262e; }
    .act-header .toggle { font-size: 0.8rem; color: var(--text-muted); }
    .act-content { padding: 0 1rem 1rem; }
    .macro-block {
      margin-top: 0.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .macro-header {
      padding: 0.6rem 0.75rem;
      background: var(--bg-elevated);
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .macro-header:hover { background: #22262e; }
    .macro-content { padding: 0 0.75rem 0.75rem; }
    .shot-item {
      background: var(--bg-dark);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      margin-top: 0.5rem;
      display: grid;
      grid-template-columns: 80px 1fr 140px;
      gap: 1rem;
      align-items: start;
    }
    .shot-id { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--accent); }
    .shot-details { font-size: 0.9rem; line-height: 1.5; }
    .shot-details .source { color: var(--text-muted); margin-bottom: 0.25rem; }
    .shot-details .desc { font-size: 0.85rem; color: var(--text); }
    .shot-keyframe {
      width: 120px;
      height: 70px;
      background: var(--bg-elevated);
      border: 2px dashed var(--border);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
    }
    .shot-keyframe:hover { border-color: var(--accent); }
    .shot-keyframe img { width: 100%; height: 100%; object-fit: cover; }
    .shot-keyframe input { display: none; }
    .shot-keyframe .placeholder { font-size: 0.7rem; color: var(--text-muted); text-align: center; }
    .shot-keyframe-wrap { position: relative; display: inline-block; }
    .shot-keyframe-actions {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 0.2rem;
      background: rgba(0,0,0,0.6); border-radius: 6px; opacity: 0; transition: opacity 0.2s;
    }
    .shot-keyframe-wrap:hover .shot-keyframe-actions { opacity: 1; }
    .shot-keyframe-actions button {
      padding: 0.15rem 0.35rem; font-size: 0.6rem; background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: 4px; color: var(--text); cursor: pointer; font-family: inherit;
    }
    .shot-keyframe-actions button:hover { background: var(--accent); border-color: var(--accent); }
    .shot-detail { display: none; margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-elevated); border-radius: 6px; font-size: 0.85rem; line-height: 1.5; }
    .shot-detail.visible { display: block; }
    .shot-detail .detail-section { margin-bottom: 0.5rem; }
    .shot-detail .detail-label { color: var(--accent); font-weight: 500; }
    .shot-detail-toggle { cursor: pointer; color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem; }
    .shot-detail-toggle:hover { color: var(--accent); }
    .collapsed .act-content, .collapsed .macro-content { display: none; }
    .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }
    .search-highlight { background: rgba(230, 57, 70, 0.3); }
    
    /* Timeline view */
    .timeline-view { display: flex; flex-direction: column; height: calc(100vh - 180px); min-height: 400px; }
    .timeline-toolbar {
      display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap;
    }
    .timeline-toolbar button {
      padding: 0.4rem 0.8rem; background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--text); cursor: pointer; font-family: inherit; font-size: 0.85rem;
    }
    .timeline-toolbar button:hover { border-color: var(--accent); color: var(--accent); }
    .timeline-zoom-radios {
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    }
    .zoom-radios-label { font-size: 0.85rem; color: var(--text-muted); }
    .zoom-radio {
      display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; color: var(--text-muted);
      cursor: pointer; padding: 0.25rem 0;
    }
    .zoom-radio:hover { color: var(--text); }
    .zoom-radio input { accent-color: var(--accent); cursor: pointer; }
    .zoom-radio:has(input:checked) { color: var(--accent); font-weight: 500; }
    .timeline-toolbar .filter-group { display: flex; align-items: center; gap: 0.5rem; }
    .timeline-toolbar .filter-group label { font-size: 0.85rem; color: var(--text-muted); }
    .timeline-toolbar .filter-group select {
      padding: 0.4rem 0.6rem; background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--text); font-family: inherit; font-size: 0.85rem;
      min-width: 160px;
    }
    .timeline-scroll {
      flex: 1; overflow-x: auto; overflow-y: hidden; padding: 0.5rem 0;
      background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border);
    }
    .timeline-track {
      display: flex; align-items: flex-end; gap: 2px; min-height: 180px; padding: 2rem 0.5rem 0.5rem;
    }
    .timeline-card {
      flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
      cursor: grab; border: 2px solid var(--border); border-radius: 6px; overflow: hidden;
      background: var(--bg-elevated); transition: border-color 0.15s, box-shadow 0.15s;
    }
    .timeline-card:hover { border-color: var(--accent); }
    .timeline-card.dragging { opacity: 0.5; cursor: grabbing; }
    .timeline-card.drag-over { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
    .timeline-card .kf-img {
      display: block; object-fit: cover; background: var(--bg-dark);
    }
    .timeline-card .kf-placeholder {
      display: flex; align-items: center; justify-content: center; background: var(--bg-dark);
      color: var(--text-muted); font-size: 0.7rem; font-family: 'JetBrains Mono', monospace;
    }
    .timeline-card .kf-label {
      padding: 0.2rem 0.4rem; font-size: 0.7rem; font-family: 'JetBrains Mono', monospace;
      color: var(--accent); background: var(--bg-card); width: 100%; text-align: center;
    }
    .timeline-script-tooltip {
      position: fixed; z-index: 9999; display: none; max-width: 360px; padding: 0.6rem 0.8rem;
      background: var(--bg-elevated); border: 1px solid var(--accent); border-radius: var(--radius);
      font-size: 0.8rem; line-height: 1.4; color: var(--text); box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      pointer-events: none;
    }
    .timeline-script-tooltip.visible { display: block; }
    .timeline-divider-act {
      flex-shrink: 0; width: 3px; align-self: stretch; background: var(--accent);
      margin: 0 0.5rem; position: relative;
    }
    .timeline-divider-act::after {
      content: attr(data-label); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
      font-size: 0.65rem; color: var(--accent); white-space: nowrap; font-weight: 600;
      margin-bottom: 0.25rem; padding: 0.1rem 0.3rem; background: var(--bg-card); border-radius: 4px;
    }
    .timeline-divider-macro {
      flex-shrink: 0; width: 1px; align-self: stretch; background: var(--border);
      margin: 0 0.25rem; opacity: 0.7;
    }
    .holding-area {
      margin-top: 1rem; padding: 1rem; border: 2px dashed var(--border); border-radius: var(--radius-lg);
      background: var(--bg-card); min-height: 120px;
    }
    .holding-area h4 {
      font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .holding-area.drag-over { border-color: var(--accent); background: rgba(230, 57, 70, 0.08); }
    .holding-cards { display: flex; flex-wrap: wrap; gap: 0.5rem; min-height: 80px; }
    .holding-cards .timeline-card { cursor: grab; }
    .timeline-drop-zone { flex-shrink: 0; width: 12px; min-height: 20px; align-self: stretch; }
    .timeline-drop-zone.active { background: var(--accent); width: 16px; opacity: 0.8; }
    .timeline-legend {
      margin-top: 0.75rem; padding: 0.75rem 1rem; background: var(--bg-card); border-radius: var(--radius);
      border: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; font-size: 0.8rem;
    }
    .timeline-legend-item { display: flex; align-items: center; gap: 0.4rem; }
    .timeline-legend-swatch { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
    .timeline-legend-title { color: var(--text-muted); }
    .timeline-legend-length { color: var(--accent); font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
    .timeline-track.timeline-bar-mode { width: 100%; min-width: 100%; }
    .timeline-bar-track {
      display: flex; align-items: stretch; min-height: 48px; width: 100%; border-radius: 6px;
      overflow: hidden; flex-shrink: 0;
    }
    .timeline-bar-segment {
      flex-grow: 1; flex-shrink: 0; min-width: 4px; transition: opacity 0.15s;
    }
    .timeline-bar-segment:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <div id="timeline-script-tooltip" class="timeline-script-tooltip"></div>
  <div class="app">
    <header>
      <div>
        <h1>Lazer Film — Production Tracker</h1>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem" id="header-stats"></p>
      </div>
      <nav class="tabs">
        <button class="tab active" data-tab="overview">Overview</button>
        <button class="tab" data-tab="characters">Characters</button>
        <button class="tab" data-tab="production">Production</button>
        <button class="tab" data-tab="timeline">Timeline</button>
      </nav>
    </header>

    <section id="overview" class="panel active">
      <div id="overview-content"></div>
    </section>

    <section id="characters" class="panel">
      <div class="filter-bar">
        <div class="filter-group">
          <input type="text" id="char-search" placeholder="Search characters...">
        </div>
      </div>
      <div id="characters-content" class="characters-grid"></div>
    </section>

    <section id="production" class="panel">
      <div class="filter-bar">
        <div class="filter-group">
          <label>Search</label>
          <input type="text" id="prod-search" placeholder="Scene, location, character...">
        </div>
        <div class="filter-group">
          <label>Character</label>
          <select id="filter-char">
            <option value="">All</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Location</label>
          <select id="filter-location">
            <option value="">All</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Act</label>
          <select id="filter-act">
            <option value="">All</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Story Beat</label>
          <select id="filter-beat">
            <option value="">All</option>
          </select>
        </div>
      </div>
      <div id="production-content" class="hierarchy"></div>
    </section>

    <section id="timeline" class="panel">
      <div class="timeline-view">
        <div class="timeline-toolbar">
          <div class="timeline-zoom-radios">
            <span class="zoom-radios-label">View:</span>
            <label class="zoom-radio"><input type="radio" name="timeline-zoom" value="act"> Acts</label>
            <label class="zoom-radio"><input type="radio" name="timeline-zoom" value="macro"> Macro</label>
            <label class="zoom-radio"><input type="radio" name="timeline-zoom" value="timeline-1"> Fit</label>
            <label class="zoom-radio"><input type="radio" name="timeline-zoom" value="timeline-2" checked> 100%</label>
            <label class="zoom-radio"><input type="radio" name="timeline-zoom" value="timeline-3"> Large</label>
          </div>
          <div class="filter-group">
            <label>Act</label>
            <select id="timeline-filter-act">
              <option value="">All</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Macro scene</label>
            <select id="timeline-filter-macro">
              <option value="">All</option>
            </select>
          </div>
          <button id="timeline-fit">Fit to screen</button>
          <button id="timeline-reset">Reset order</button>
        </div>
        <div class="timeline-scroll" id="timeline-scroll">
          <div class="timeline-track" id="timeline-track"></div>
        </div>
        <div class="timeline-legend" id="timeline-legend" style="display:none"></div>
        <div class="holding-area" id="holding-area" data-zone="holding">
          <h4>Holding area — drag scenes here to hold</h4>
          <div class="holding-cards" id="holding-cards"></div>
        </div>
      </div>
    </section>
  </div>

  <div class="crop-modal" id="crop-modal">
    <div class="crop-modal-inner">
      <h3 id="crop-modal-title">Crop face (square)</h3>
      <div class="crop-preview" id="crop-preview"><img id="crop-img" src="" alt=""></div>
      <div class="crop-modal-buttons">
        <button type="button" id="crop-cancel">Cancel</button>
        <button type="button" class="primary" id="crop-confirm">Crop & Save</button>
      </div>
    </div>
  </div>

  <script>
    const DATA = __EMBEDDED_DATA__;
    const STORAGE_KEY = 'lazer_production_tracker';
    const KEYFRAMES_KEY = 'lazer_keyframes';
    const MAX_KEYFRAME_SIZE = 400;
    const KEYFRAME_QUALITY = 0.82;
    
    function loadStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        const kfRaw = localStorage.getItem(KEYFRAMES_KEY);
        if (kfRaw) {
          try {
            const kf = JSON.parse(kfRaw);
            if (kf && typeof kf === 'object' && !Array.isArray(kf)) obj.keyframes = kf;
          } catch (_) {}
        }
        return obj;
      } catch (e) { console.warn('Storage load failed:', e); return {}; }
    }
    function saveStorage(obj) {
      const keyframes = obj.keyframes || {};
      const rest = { characterImages: obj.characterImages || {}, timelineOrder: obj.timelineOrder, holdingArea: obj.holdingArea || [] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
      } catch (e) { console.warn('Main storage save failed:', e); }
      try {
        localStorage.setItem(KEYFRAMES_KEY, JSON.stringify(keyframes));
      } catch (e) {
        console.warn('Keyframes save failed (quota?). Trying smaller...', e);
        const ids = Object.keys(keyframes);
        for (let i = ids.length - 1; i >= 0; i--) {
          try {
            const smaller = {};
            ids.slice(0, i).forEach(id => { smaller[id] = keyframes[id]; });
            localStorage.setItem(KEYFRAMES_KEY, JSON.stringify(smaller));
            break;
          } catch (_) {}
        }
      }
    }
    
    function compressKeyframe(dataUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth, h = img.naturalHeight;
          let dw = w, dh = h;
          if (w > MAX_KEYFRAME_SIZE || h > MAX_KEYFRAME_SIZE) {
            const r = Math.min(MAX_KEYFRAME_SIZE / w, MAX_KEYFRAME_SIZE / h);
            dw = Math.round(w * r); dh = Math.round(h * r);
          }
          const c = document.createElement('canvas');
          c.width = dw; c.height = dh;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, dw, dh);
          resolve(c.toDataURL('image/jpeg', KEYFRAME_QUALITY));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    }
    
    const storage = loadStorage();
    if (!storage.characterImages || typeof storage.characterImages !== 'object') storage.characterImages = {};
    if (!storage.keyframes || typeof storage.keyframes !== 'object' || Array.isArray(storage.keyframes)) storage.keyframes = {};
    if (storage.timelineOrder === undefined) storage.timelineOrder = null;
    if (!Array.isArray(storage.holdingArea)) storage.holdingArea = [];
    
    const filmIdentity = DATA.film_identity;
    const characters = DATA.characters?.character_descriptions || {};
    const scenesExtracted = DATA.scenes_extracted?.scenes || [];
    const scenesDescMap = {};
    (DATA.scenes_description?.scenes || []).forEach(s => {
      scenesDescMap[s.scene_id] = s;
    });
    
    function buildHierarchy() {
      const acts = {};
      scenesExtracted.forEach(scene => {
        const act = scene.act;
        if (!acts[act]) acts[act] = { title: scene.act_title, macros: {} };
        const macro = scene.macro_scene;
        if (!acts[act].macros[macro]) acts[act].macros[macro] = [];
        acts[act].macros[macro].push(scene);
      });
      return acts;
    }
    
    const hierarchy = buildHierarchy();
    const sceneMap = {};
    scenesExtracted.forEach(s => { sceneMap[s.scene_id] = s; });
    const allCharacters = Object.keys(characters);
    const allLocations = [...new Set(
      Object.values(scenesDescMap).flatMap(s => 
        s.setting?.location ? [s.setting.location] : []
      )
    )].sort();
    const allActs = [...new Set(scenesExtracted.map(s => s.act))].sort((a, b) => a - b);
    const allBeats = [...new Set(scenesExtracted.map(s => s.story_beat).filter(Boolean))].sort();
    const allMacroScenes = [...new Set(scenesExtracted.map(s => s.macro_scene).filter(Boolean))].sort();
    
    function renderOverview() {
      const keyframeCount = Object.keys(storage.keyframes || {}).filter(id => sceneMap[id]).length;
      const totalShots = scenesExtracted.length;
      const charImgCount = Object.keys(storage.characterImages || {}).filter(n => characters[n]).length;
      const totalChars = allCharacters.length;
      const shotPct = totalShots ? Math.round((keyframeCount / totalShots) * 100) : 0;
      const charPct = totalChars ? Math.round((charImgCount / totalChars) * 100) : 0;
      
      const actProgress = {};
      scenesExtracted.forEach(s => {
        const a = s.act;
        if (!actProgress[a]) actProgress[a] = { total: 0, done: 0 };
        actProgress[a].total++;
        if (storage.keyframes?.[s.scene_id]) actProgress[a].done++;
      });
      const actProgressHtml = Object.keys(actProgress).sort((a,b) => a-b).map(a => {
        const p = actProgress[a];
        const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
        return `<div class="act-progress-item"><span>Act ${a}</span><div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div><span>${p.done}/${p.total}</span></div>`;
      }).join('');
      
      const dashboardHtml = `
        <div class="dashboard-row">
          <div class="dashboard-card">
            <h3>Overall progress</h3>
            <div class="progress-value">${keyframeCount} / ${totalShots}</div>
            <div class="progress-label">Keyframes uploaded</div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${shotPct}%"></div></div>
          </div>
          <div class="dashboard-card">
            <h3>Shot progress</h3>
            <div class="progress-value">${shotPct}%</div>
            <div class="progress-label">${keyframeCount} of ${totalShots} shots have keyframes</div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${shotPct}%"></div></div>
          </div>
          <div class="dashboard-card">
            <h3>Character progress</h3>
            <div class="progress-value">${charImgCount} / ${totalChars}</div>
            <div class="progress-label">Character images uploaded</div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${charPct}%"></div></div>
          </div>
          <div class="dashboard-card dashboard-card-wide">
            <h3>Act-level progress</h3>
            <div class="act-progress-list">${actProgressHtml}</div>
          </div>
        </div>
      `;
      
      const cards = [];
      cards.push(dashboardHtml);
      const fi = filmIdentity.film_identity || {};
      cards.push(`<div class="card"><h3>Film Identity</h3><ul>
        <li><strong>Tone:</strong> ${fi.tone || '—'}</li>
        <li><strong>Genre:</strong> ${fi.genre || '—'}</li>
        <li><strong>Narrative:</strong> ${fi.narrative_stance || '—'}</li>
        <li><strong>Emotional Thesis:</strong> ${fi.emotional_thesis || '—'}</li>
        <li><strong>Pacing:</strong> ${fi.pacing_philosophy || '—'}</li>
      </ul></div>`);
      
      const world = filmIdentity.world || {};
      cards.push(`<div class="card"><h3>World</h3><ul>
        <li><strong>Setting:</strong> ${world.setting_principle || '—'}</li>
        <li><strong>Environment:</strong> ${world.environmental_hierarchy || '—'}</li>
        <li><strong>Temporal:</strong> ${world.temporal_feel || '—'}</li>
        <li><strong>Atmosphere:</strong> ${world.atmospheric_logic || '—'}</li>
      </ul></div>`);
      
      const vs = filmIdentity.visual_style || {};
      cards.push(`<div class="card"><h3>Visual Style</h3><ul>
        <li><strong>Animation:</strong> ${vs.animation_philosophy || '—'}</li>
        <li><strong>Form:</strong> ${vs.form_language || '—'}</li>
        <li><strong>Texture:</strong> ${vs.texture_strategy || '—'}</li>
      </ul></div>`);
      
      const cam = filmIdentity.cinematography || {};
      cards.push(`<div class="card"><h3>Cinematography</h3><ul>
        <li><strong>Camera:</strong> ${cam.camera_attitude || '—'}</li>
        <li><strong>Lens:</strong> ${cam.lens_philosophy || '—'}</li>
        <li><strong>Movement:</strong> ${cam.movement_rules || '—'}</li>
      </ul></div>`);
      
      const light = filmIdentity.lighting_rules || {};
      cards.push(`<div class="card"><h3>Lighting</h3><ul>
        <li><strong>Philosophy:</strong> ${light.lighting_philosophy || '—'}</li>
        <li><strong>Interior:</strong> ${light.interior_light || '—'}</li>
        <li><strong>Exterior:</strong> ${light.exterior_light || '—'}</li>
      </ul></div>`);
      
      document.getElementById('overview-content').innerHTML = dashboardHtml + `<div class="overview-grid">${cards.slice(1).join('')}</div>`;
    }
    
    function renderCharacters(filter = '') {
      const f = filter.toLowerCase();
      const list = allCharacters.filter(
        name => !filter || name.toLowerCase().includes(f) ||
          (characters[name].role || '').toLowerCase().includes(f)
      );
      const html = list.map(name => {
        const c = characters[name];
        const role = c.role || '';
        const img = storage.characterImages[name];
        const vc = c.visual_cues || {};
        const traits = [
          vc.body_language,
          vc.eyes,
          vc.presence,
          vc.gestures,
          c.core_identity
        ].filter(Boolean).slice(0, 2).join(' • ');
        return `
          <div class="char-card">
            <div class="char-avatar-wrap">
              <label class="char-avatar" title="${img ? 'Change photo' : 'Upload image'}">
                <input type="file" accept="image/*" data-char="${name}">
                ${img ? `<img src="${img}" alt="${name}">` : '<span class="placeholder">+</span>'}
              </label>
              ${img ? `<div class="char-avatar-actions">
                <button type="button" class="char-discard" data-char="${name}">Discard</button>
                <button type="button" class="char-reupload" data-char="${name}">Reupload</button>
              </div>` : ''}
            </div>
            <h4>${name}</h4>
            <div class="role">${role}</div>
            <div class="traits">${traits || '—'}</div>
          </div>
        `;
      }).join('');
      document.getElementById('characters-content').innerHTML = html || '<div class="empty-state">No characters match</div>';
      document.querySelectorAll('.char-avatar input').forEach(inp => {
        inp.addEventListener('change', handleCharImageSelect);
      });
      document.querySelectorAll('.char-discard').forEach(btn => {
        btn.addEventListener('click', e => { e.preventDefault(); handleCharDiscard(e.target.dataset.char); });
      });
      document.querySelectorAll('.char-reupload').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const input = e.target.closest('.char-card').querySelector('.char-avatar input');
          if (input) input.click();
        });
      });
    }
    
    let pendingCrop = { charName: null, sceneId: null, dataUrl: null };
    let expandSceneAfterUpload = null;
    
    function handleCharImageSelect(e) {
      const file = e.target.files?.[0];
      const name = e.target.dataset.char;
      if (!file || !name) return;
      e.target.value = '';
      const r = new FileReader();
      r.onload = () => {
        pendingCrop = { charName: name, sceneId: null, dataUrl: r.result };
        showCropModal('Crop face for ' + name + ' (square)', r.result);
      };
      r.readAsDataURL(file);
    }
    
    function handleCharDiscard(name) {
      if (!name) return;
      delete storage.characterImages[name];
      saveStorage(storage);
      renderCharacters(document.getElementById('char-search').value);
    }
    
    function showCropModal(title, dataUrl) {
      const modal = document.getElementById('crop-modal');
      const img = document.getElementById('crop-img');
      document.getElementById('crop-modal-title').textContent = title;
      img.src = dataUrl;
      img.onload = () => initCropDrag(img);
      modal.classList.add('visible');
    }
    
    function initCropDrag(imgEl) {
      const container = document.getElementById('crop-preview');
      const size = 320;
      const w = imgEl.naturalWidth, h = imgEl.naturalHeight;
      const scale = Math.max(size / w, size / h);
      const sw = w * scale, sh = h * scale;
      let offsetX = Math.max(0, (sw - size) / 2), offsetY = Math.max(0, (sh - size) / 2);
      imgEl.style.width = sw + 'px';
      imgEl.style.height = sh + 'px';
      imgEl.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
      container.onmousedown = e => {
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY, startOX = offsetX, startOY = offsetY;
        const onMove = e => {
          offsetX = Math.max(0, Math.min(sw - size, startOX + startX - e.clientX));
          offsetY = Math.max(0, Math.min(sh - size, startOY + startY - e.clientY));
          imgEl.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      };
      container.ontouchstart = e => {
        e.preventDefault();
        const t = e.touches[0];
        const startX = t.clientX, startY = t.clientY, startOX = offsetX, startOY = offsetY;
        const onMove = e => {
          e.preventDefault();
          const t2 = e.touches[0];
          offsetX = Math.max(0, Math.min(sw - size, startOX + startX - t2.clientX));
          offsetY = Math.max(0, Math.min(sh - size, startOY + startY - t2.clientY));
          imgEl.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
        };
        const onEnd = () => {
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend', onEnd);
        };
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
      };
    }
    
    document.getElementById('crop-cancel').addEventListener('click', () => {
      document.getElementById('crop-modal').classList.remove('visible');
      pendingCrop = { charName: null, sceneId: null, dataUrl: null };
    });
    
    document.getElementById('crop-confirm').addEventListener('click', () => {
      const imgEl = document.getElementById('crop-img');
      const style = imgEl.style.transform || 'translate(0px, 0px)';
      const m = style.match(/translate\\(([^,]+)px,\\s*([^)]+)px\\)/);
      const offsetX = m ? Math.max(0, -parseFloat(m[1])) : 0;
      const offsetY = m ? Math.max(0, -parseFloat(m[2])) : 0;
      const size = 320;
      const img = new Image();
      img.src = imgEl.src;
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        const scale = Math.max(size / w, size / h);
        const srcX = offsetX / scale, srcY = offsetY / scale, srcSize = size / scale;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);
        const cropped = canvas.toDataURL('image/jpeg', 0.9);
        if (pendingCrop.charName) {
          storage.characterImages[pendingCrop.charName] = cropped;
          saveStorage(storage);
          renderCharacters(document.getElementById('char-search').value);
        }
        document.getElementById('crop-modal').classList.remove('visible');
        pendingCrop = { charName: null, sceneId: null, dataUrl: null };
      };
      img.src = imgEl.src;
    });
    
    function sceneMatches(scene, desc, filters) {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const txt = [
          scene.source_text,
          scene.macro_scene,
          scene.story_beat,
          desc?.narrative_purpose,
          desc?.setting?.location,
          (desc?.characters_present || []).map(c => c.character).join(' ')
        ].filter(Boolean).join(' ').toLowerCase();
        if (!txt.includes(s)) return false;
      }
      if (filters.char) {
        const chars = (desc?.characters_present || []).map(c => c.character);
        if (!chars.some(c => c && c.toLowerCase().includes(filters.char.toLowerCase()))) return false;
      }
      if (filters.location) {
        const loc = desc?.setting?.location || '';
        if (!loc.toLowerCase().includes(filters.location.toLowerCase())) return false;
      }
      if (filters.act && String(scene.act) !== filters.act) return false;
      if (filters.beat) {
        const beat = (scene.story_beat || '').toLowerCase();
        if (!beat.includes(filters.beat.toLowerCase())) return false;
      }
      return true;
    }
    
    function renderProduction() {
      const search = document.getElementById('prod-search').value.trim();
      const charFilter = document.getElementById('filter-char').value;
      const locFilter = document.getElementById('filter-location').value;
      const actFilter = document.getElementById('filter-act').value;
      const beatFilter = document.getElementById('filter-beat').value;
      const filters = { search, char: charFilter, location: locFilter, act: actFilter, beat: beatFilter };
      
      let html = '';
      const actOrder = Object.keys(hierarchy).sort((a, b) => Number(a) - Number(b));
      const sceneToExpand = expandSceneAfterUpload;
      if (expandSceneAfterUpload) expandSceneAfterUpload = null;
      actOrder.forEach(actNum => {
        if (filters.act && String(actNum) !== filters.act) return;
        const act = hierarchy[actNum];
        const actContainsScene = sceneToExpand && Object.values(act.macros).flat().some(s => s.scene_id === sceneToExpand);
        let macroHtml = '';
        Object.keys(act.macros).forEach(macroName => {
          const shots = act.macros[macroName];
          const macroContainsScene = sceneToExpand && shots.some(s => s.scene_id === sceneToExpand);
          let shotHtml = '';
          shots.forEach(scene => {
            const desc = scenesDescMap[scene.scene_id];
            if (!sceneMatches(scene, desc, filters)) return;
            const keyframe = storage.keyframes[scene.scene_id];
            const np = desc?.narrative_purpose || '';
            const loc = desc?.setting?.location || '';
            const chars = (desc?.characters_present || []).map(c => c.character).filter(Boolean).join(', ');
            const actions = (desc?.actions || []).slice(0, 3).join(' • ');
            const tone = desc?.emotional_tone || '';
            const cam = desc?.camera_intent ? (desc.camera_intent.approach || '') + (desc.camera_intent.framing ? ' — ' + desc.camera_intent.framing : '') : '';
            const detailHtml = desc ? `
              <div class="shot-detail" id="detail-${scene.scene_id}">
                <div class="detail-section"><span class="detail-label">Narrative:</span> ${np}</div>
                ${loc ? `<div class="detail-section"><span class="detail-label">Location:</span> ${loc}</div>` : ''}
                ${chars ? `<div class="detail-section"><span class="detail-label">Characters:</span> ${chars}</div>` : ''}
                ${tone ? `<div class="detail-section"><span class="detail-label">Tone:</span> ${tone}</div>` : ''}
                ${actions ? `<div class="detail-section"><span class="detail-label">Actions:</span> ${actions}</div>` : ''}
                ${cam ? `<div class="detail-section"><span class="detail-label">Camera:</span> ${cam}</div>` : ''}
              </div>
            ` : '';
            shotHtml += `
              <div class="shot-item" data-scene-id="${scene.scene_id}">
                <span class="shot-id">${scene.scene_id}</span>
                <div class="shot-details">
                  <div class="source">${scene.source_text || ''}</div>
                  <div class="desc">${np ? np.substring(0, 120) + (np.length > 120 ? '…' : '') : ''}</div>
                  ${loc ? `<div class="desc" style="font-size:0.8rem;color:var(--text-muted)">Loc: ${loc}</div>` : ''}
                  ${detailHtml ? `<div class="shot-detail-toggle" onclick="document.getElementById('detail-${scene.scene_id}').classList.toggle('visible');this.textContent=document.getElementById('detail-${scene.scene_id}').classList.contains('visible')?'▲ Less':'▼ More detail'">▼ More detail</div>` : ''}
                  ${detailHtml}
                </div>
                <div class="shot-keyframe-wrap">
                  <label class="shot-keyframe" title="${keyframe ? 'Change keyframe' : 'Upload keyframe'}">
                    <input type="file" accept="image/*" data-scene="${scene.scene_id}">
                    ${keyframe ? `<img src="${keyframe}" alt="Keyframe">` : '<span class="placeholder">Keyframe</span>'}
                  </label>
                  ${keyframe ? `<div class="shot-keyframe-actions">
                    <button type="button" class="kf-discard" data-scene="${scene.scene_id}">Discard</button>
                    <button type="button" class="kf-replace" data-scene="${scene.scene_id}">Replace</button>
                  </div>` : ''}
                </div>
              </div>
            `;
          });
          if (!shotHtml) return;
          macroHtml += `
            <div class="macro-block ${macroContainsScene ? '' : 'collapsed'}">
              <div class="macro-header"><span>${macroName}</span> <span class="toggle">${macroContainsScene ? '▼' : '▶'}</span></div>
              <div class="macro-content">${shotHtml}</div>
            </div>
          `;
        });
        if (!macroHtml) return;
        html += `
          <div class="act-block ${actContainsScene ? '' : 'collapsed'}">
            <div class="act-header"><span>Act ${actNum}: ${act.title}</span> <span class="toggle">${actContainsScene ? '▼' : '▶'}</span></div>
            <div class="act-content">${macroHtml}</div>
          </div>
        `;
      });
      
      document.getElementById('production-content').innerHTML = html || '<div class="empty-state">No scenes match filters</div>';
      
      document.querySelectorAll('.act-header, .macro-header').forEach(h => {
        h.addEventListener('click', () => {
          h.parentElement.classList.toggle('collapsed');
          h.querySelector('.toggle').textContent = h.parentElement.classList.contains('collapsed') ? '▶' : '▼';
        });
      });
      document.querySelectorAll('.shot-keyframe input').forEach(inp => {
        inp.addEventListener('change', handleKeyframeUpload);
      });
      document.querySelectorAll('.kf-discard').forEach(btn => {
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); handleKeyframeDiscard(e.target.dataset.scene); });
      });
      document.querySelectorAll('.kf-replace').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const input = e.target.closest('.shot-item').querySelector('.shot-keyframe input');
          if (input) input.click();
        });
      });
    }
    
    function handleKeyframeDiscard(sceneId) {
      if (!sceneId) return;
      delete storage.keyframes[sceneId];
      saveStorage(storage);
      renderProduction();
      if (document.getElementById('timeline').classList.contains('active')) renderTimeline();
    }
    
    function handleKeyframeUpload(e) {
      const file = e.target.files?.[0];
      const sceneId = e.target.dataset.scene;
      if (!file || !sceneId) return;
      e.target.value = '';
      const r = new FileReader();
      r.onload = async () => {
        const compressed = await compressKeyframe(r.result);
        storage.keyframes[sceneId] = compressed;
        saveStorage(storage);
        expandSceneAfterUpload = sceneId;
        renderProduction();
        if (document.getElementById('timeline').classList.contains('active')) renderTimeline();
      };
      r.readAsDataURL(file);
    }
    
    const TIMELINE_BASE_W = 100;
    const TIMELINE_BASE_H = 75;
    const TIMELINE_CARD_ZOOMS = { 'timeline-1': 0.4, 'timeline-2': 1, 'timeline-3': 1.8 };
    const MACRO_COLORS = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#e76f51','#9b5de5','#00b4d8','#06d6a0','#ef476f','#118ab2','#06ffa5'];
    const ACT_COLORS = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261'];
    
    function getTimelineScenes() {
      const base = storage.timelineOrder && Array.isArray(storage.timelineOrder) && storage.timelineOrder.length > 0
        ? storage.timelineOrder
        : scenesExtracted.map(s => s.scene_id);
      return base.filter(id => sceneMap[id] && !storage.holdingArea.includes(id));
    }
    
    function getFilteredTimelineScenes() {
      let scenes = getTimelineScenes();
      const actFilter = document.getElementById('timeline-filter-act')?.value;
      const macroFilter = document.getElementById('timeline-filter-macro')?.value;
      if (actFilter) scenes = scenes.filter(id => String(sceneMap[id]?.act) === actFilter);
      if (macroFilter) scenes = scenes.filter(id => sceneMap[id]?.macro_scene === macroFilter);
      return scenes;
    }
    
    function renderTimeline() {
      const scenes = getFilteredTimelineScenes();
      const zoomLevel = document.querySelector('input[name="timeline-zoom"]:checked')?.value || 'timeline-2';
      const timelineZoom = TIMELINE_CARD_ZOOMS[zoomLevel] ?? 1;
      
      const legendEl = document.getElementById('timeline-legend');
      
      if (zoomLevel === 'act') {
        renderTimelineActBars(scenes, legendEl);
      } else if (zoomLevel === 'macro') {
        renderTimelineMacroBars(scenes, legendEl);
      } else {
        legendEl.style.display = 'none';
        renderTimelineCards(scenes, timelineZoom);
      }
      
      const w = Math.round(TIMELINE_BASE_W * timelineZoom);
      const h = Math.round(TIMELINE_BASE_H * timelineZoom);
      const holdingHtml = storage.holdingArea.map(sceneId => {
        const scene = sceneMap[sceneId];
        if (!scene) return '';
        const kf = storage.keyframes[sceneId];
        const scriptLine = (scene.source_text || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div class="timeline-card" draggable="true" data-scene-id="${sceneId}" data-zone="holding" data-script="${scriptLine}">
          ${kf ? `<img class="kf-img" src="${kf}" width="${w}" height="${h}" alt="">` : `<div class="kf-placeholder" style="width:${w}px;height:${h}px">${sceneId}</div>`}
          <span class="kf-label">${sceneId}</span>
        </div>`;
      }).join('');
      document.getElementById('holding-cards').innerHTML = holdingHtml;
      
      if (zoomLevel !== 'act' && zoomLevel !== 'macro') setupTimelineDragDrop();
    }
    
    function renderTimelineCards(scenes, zoom) {
      const z = zoom ?? 1;
      const w = Math.round(TIMELINE_BASE_W * z);
      const h = Math.round(TIMELINE_BASE_H * z);
      let html = '';
      let prevAct = null, prevMacro = null;
      let insertIndex = 0;
      
      scenes.forEach((sceneId) => {
        const scene = sceneMap[sceneId];
        if (!scene) return;
        if (scene.act !== prevAct) {
          const actLabel = (scene.act_title || 'Act ' + scene.act).substring(0, 25);
          html += `<div class="timeline-divider-act" data-label="${actLabel}"></div>`;
          prevAct = scene.act;
          prevMacro = null;
        } else if (scene.macro_scene !== prevMacro) {
          html += `<div class="timeline-divider-macro"></div>`;
        }
        prevMacro = scene.macro_scene;
        html += `<div class="timeline-drop-zone" data-insert-index="${insertIndex}" data-zone="timeline"></div>`;
        const kf = storage.keyframes[sceneId];
        const scriptLine = (scene.source_text || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html += `<div class="timeline-card" draggable="true" data-scene-id="${sceneId}" data-index="${insertIndex}" data-script="${scriptLine}">
          ${kf ? `<img class="kf-img" src="${kf}" width="${w}" height="${h}" alt="">` : `<div class="kf-placeholder" style="width:${w}px;height:${h}px">${sceneId}</div>`}
          <span class="kf-label">${sceneId}</span>
        </div>`;
        insertIndex++;
      });
      html += `<div class="timeline-drop-zone" data-insert-index="${insertIndex}" data-zone="timeline"></div>`;
      
      document.getElementById('timeline-track').innerHTML = html;
      document.getElementById('timeline-track').className = 'timeline-track';
    }
    
    function renderTimelineMacroBars(scenes, legendEl) {
      const segments = [];
      let prevMacro = null;
      scenes.forEach(sceneId => {
        const scene = sceneMap[sceneId];
        if (!scene) return;
        if (scene.macro_scene !== prevMacro) {
          segments.push({ name: scene.macro_scene, count: 1 });
          prevMacro = scene.macro_scene;
        } else {
          segments[segments.length - 1].count++;
        }
      });
      
      const total = segments.reduce((s, seg) => s + seg.count, 0);
      let barHtml = '';
      segments.forEach((seg, i) => {
        const color = MACRO_COLORS[i % MACRO_COLORS.length];
        const flex = seg.count;
        barHtml += `<div class="timeline-bar-segment" style="flex:${flex} 1 0;background:${color}" title="${seg.name} (${seg.count} shots)"></div>`;
      });
      
      document.getElementById('timeline-track').innerHTML = `<div class="timeline-bar-track">${barHtml}</div>`;
      document.getElementById('timeline-track').className = 'timeline-track timeline-bar-mode';
      
      legendEl.style.display = 'flex';
      legendEl.innerHTML = '<span style="margin-right:0.5rem;color:var(--text-muted);font-weight:600">Macro scenes (zoom in to reorder):</span>' +
        segments.map((seg, i) => {
          const color = MACRO_COLORS[i % MACRO_COLORS.length];
          const shortName = seg.name.length > 35 ? seg.name.substring(0, 32) + '…' : seg.name;
          const safeTitle = (seg.name || '').replace(/"/g, '&quot;');
          return `<div class="timeline-legend-item"><span class="timeline-legend-swatch" style="background:${color}"></span><span class="timeline-legend-title" title="${safeTitle}">${shortName}</span><span class="timeline-legend-length">(${seg.count})</span></div>`;
        }).join('');
    }
    
    function renderTimelineActBars(scenes, legendEl) {
      const segments = [];
      let prevAct = null;
      scenes.forEach(sceneId => {
        const scene = sceneMap[sceneId];
        if (!scene) return;
        if (scene.act !== prevAct) {
          segments.push({ name: (scene.act_title || 'Act ' + scene.act).replace(/^[^:]+:\\s*/, ''), count: 1 });
          prevAct = scene.act;
        } else {
          segments[segments.length - 1].count++;
        }
      });
      
      let barHtml = '';
      segments.forEach((seg, i) => {
        const color = ACT_COLORS[i % ACT_COLORS.length];
        const flex = seg.count;
        barHtml += `<div class="timeline-bar-segment" style="flex:${flex} 1 0;background:${color}" title="${seg.name} (${seg.count} shots)"></div>`;
      });
      
      document.getElementById('timeline-track').innerHTML = `<div class="timeline-bar-track">${barHtml}</div>`;
      document.getElementById('timeline-track').className = 'timeline-track timeline-bar-mode';
      
      legendEl.style.display = 'flex';
      legendEl.innerHTML = '<span style="margin-right:0.5rem;color:var(--text-muted);font-weight:600">Acts (zoom in to reorder):</span>' +
        segments.map((seg, i) => {
          const color = ACT_COLORS[i % ACT_COLORS.length];
          const shortName = seg.name.length > 28 ? seg.name.substring(0, 25) + '…' : seg.name;
          const safeTitle = (seg.name || '').replace(/"/g, '&quot;');
          return `<div class="timeline-legend-item"><span class="timeline-legend-swatch" style="background:${color}"></span><span class="timeline-legend-title" title="${safeTitle}">${shortName}</span><span class="timeline-legend-length">(${seg.count})</span></div>`;
        }).join('');
    }
    
    function setupTimelineTooltips() {
      const tooltip = document.getElementById('timeline-script-tooltip');
      if (!tooltip) return;
      document.querySelectorAll('.timeline-card').forEach(card => {
        card.addEventListener('mouseenter', e => {
          const script = card.dataset.script;
          if (!script) return;
          tooltip.textContent = script;
          tooltip.classList.add('visible');
          const rect = card.getBoundingClientRect();
          tooltip.style.left = Math.min(Math.max(rect.left, 8), window.innerWidth - 380) + 'px';
          const spaceBelow = window.innerHeight - rect.bottom;
          tooltip.style.top = spaceBelow >= 120 ? (rect.bottom + 6) + 'px' : (rect.top - 6) + 'px';
          tooltip.style.transform = spaceBelow >= 120 ? 'translateY(0)' : 'translateY(-100%)';
        });
        card.addEventListener('mouseleave', () => {
          tooltip.classList.remove('visible');
        });
      });
    }
    
    function setupTimelineDragDrop() {
      let draggedCard = null;
      let draggedFromHolding = false;
      
      setupTimelineTooltips();
      
      document.querySelectorAll('.timeline-card').forEach(card => {
        card.addEventListener('dragstart', e => {
          draggedCard = card;
          draggedFromHolding = card.closest('#holding-cards') !== null;
          card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', card.dataset.sceneId);
          e.dataTransfer.setData('application/json', JSON.stringify({ sceneId: card.dataset.sceneId, fromHolding: draggedFromHolding }));
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          document.querySelectorAll('.timeline-drop-zone, .holding-area').forEach(z => z.classList.remove('active'));
          draggedCard = null;
        });
      });
      
      document.querySelectorAll('.timeline-drop-zone').forEach(zone => {
        zone.addEventListener('dragover', e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (zone.dataset.zone === 'timeline') zone.classList.add('active');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('active'));
        zone.addEventListener('drop', e => {
          e.preventDefault();
          zone.classList.remove('active');
          const sceneId = e.dataTransfer.getData('text/plain');
          if (!sceneId || !sceneMap[sceneId]) return;
          const insertIdx = parseInt(zone.dataset.insertIndex, 10);
          if (zone.dataset.zone === 'timeline') {
            const fullOrder = getTimelineScenes();
            const filteredOrder = getFilteredTimelineScenes();
            let realIdx = insertIdx >= filteredOrder.length ? fullOrder.length
              : (filteredOrder.length > 0 ? fullOrder.indexOf(filteredOrder[insertIdx]) : 0);
            if (realIdx < 0) realIdx = fullOrder.length;
            let order = fullOrder.filter(id => id !== sceneId);
            order.splice(realIdx, 0, sceneId);
            storage.timelineOrder = order;
            storage.holdingArea = storage.holdingArea.filter(id => id !== sceneId);
            saveStorage(storage);
            renderTimeline();
          }
        });
      });
      
      document.getElementById('holding-area').addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
      });
      document.getElementById('holding-area').addEventListener('dragleave', e => {
        if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('drag-over');
      });
      document.getElementById('holding-area').addEventListener('drop', e => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const sceneId = e.dataTransfer.getData('text/plain');
        if (!sceneId || !sceneMap[sceneId]) return;
        if (!storage.holdingArea.includes(sceneId)) {
          storage.holdingArea = [...storage.holdingArea, sceneId];
          if (storage.timelineOrder) storage.timelineOrder = storage.timelineOrder.filter(id => id !== sceneId);
          saveStorage(storage);
          renderTimeline();
        }
      });
    }
    
    
    function populateFilters() {
      const charSel = document.getElementById('filter-char');
      allCharacters.forEach(c => {
        charSel.appendChild(new Option(c, c));
      });
      allLocations.forEach(l => {
        document.getElementById('filter-location').appendChild(new Option(l, l));
      });
      Object.keys(hierarchy).sort((a, b) => Number(a) - Number(b)).forEach(a => {
        document.getElementById('filter-act').appendChild(new Option(`Act ${a}: ${hierarchy[a].title}`, a));
      });
      allBeats.forEach(b => {
        document.getElementById('filter-beat').appendChild(new Option(b, b));
      });
    }
    
    function populateTimelineFilters() {
      const actSel = document.getElementById('timeline-filter-act');
      const macroSel = document.getElementById('timeline-filter-macro');
      actSel.innerHTML = '<option value="">All</option>';
      Object.keys(hierarchy).sort((a, b) => Number(a) - Number(b)).forEach(a => {
        actSel.appendChild(new Option(`Act ${a}: ${(hierarchy[a].title || '').substring(0, 30)}`, a));
      });
      macroSel.innerHTML = '<option value="">All</option>';
      allMacroScenes.forEach(m => {
        macroSel.appendChild(new Option(m.length > 35 ? m.substring(0, 32) + '…' : m, m));
      });
    }
    
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        t.classList.add('active');
        document.getElementById(t.dataset.tab).classList.add('active');
        if (t.dataset.tab === 'overview') renderOverview();
        if (t.dataset.tab === 'characters') renderCharacters(document.getElementById('char-search').value);
        if (t.dataset.tab === 'production') renderProduction();
        if (t.dataset.tab === 'timeline') renderTimeline();
      });
    });
    
    document.getElementById('char-search').addEventListener('input', () => renderCharacters(document.getElementById('char-search').value));
    document.getElementById('prod-search').addEventListener('input', () => renderProduction());
    document.getElementById('filter-char').addEventListener('change', renderProduction);
    document.getElementById('filter-location').addEventListener('change', renderProduction);
    document.getElementById('filter-act').addEventListener('change', renderProduction);
    document.getElementById('filter-beat').addEventListener('change', renderProduction);
    
    document.getElementById('timeline-filter-act').addEventListener('change', renderTimeline);
    document.getElementById('timeline-filter-macro').addEventListener('change', renderTimeline);
    
    populateFilters();
    populateTimelineFilters();
    document.getElementById('header-stats').textContent = 
      scenesExtracted.length + ' shots · ' + Object.keys(hierarchy).length + ' acts · ' + allCharacters.length + ' characters';
    renderOverview();
    renderCharacters();
    renderProduction();
    
    document.querySelectorAll('input[name="timeline-zoom"]').forEach(r => {
      r.addEventListener('change', renderTimeline);
    });
    document.getElementById('timeline-fit').addEventListener('click', () => {
      const fitRadio = document.querySelector('input[name="timeline-zoom"][value="timeline-1"]');
      if (fitRadio) { fitRadio.checked = true; renderTimeline(); }
    });
    document.getElementById('timeline-reset').addEventListener('click', () => {
      storage.timelineOrder = null;
      storage.holdingArea = [];
      saveStorage(storage);
      renderTimeline();
    });
  </script>
</body>
</html>
'''

if __name__ == '__main__':
    main()