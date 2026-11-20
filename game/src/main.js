// Isla Fortuna — boot, fixed-step loop, screens, save/load and the
// ?shot= screenshot mode. The simulation itself lives in world.js;
// this file only wires it to the canvas, the keyboard and localStorage.
//
// v6: twelve story jobs ending in the Fortuna heist, boats on the
// harbour and the ocean, a day/night cycle with rain and sunset, a
// wanted heat meter, a three-person crew to hire, taxi fares, street
// races and eight golden doubloons. The save round-trips cash, the
// job, the crew and the doubloons.

import { CFG } from './config.js';
import { createWorld, stepWorld, saveSnapshot, retryAfterArrest, retryFailedMission } from './world.js';
import { drawWorld } from './render.js';
import { createInput, onFirstKey } from './input.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';
import { startMission, MISSIONS } from './missions.js';
import { hire, CREW } from './crew.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 7) || 7;
const shot = params.get('shot');
const audio = createAudio();
const input = createInput();
onFirstKey(() => audio.unlock());

// ---------------------------------------------------------------- save

function loadSave() {
  try {
    const raw = window.localStorage.getItem(CFG.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.missionIndex !== 'number') return null;
    if (data.crew && typeof data.crew !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

function storeSave(world) {
  try {
    window.localStorage.setItem(CFG.saveKey, JSON.stringify(saveSnapshot(world)));
  } catch {
    // Storage full or blocked: the game still plays.
  }
}

// ---------------------------------------------------------------- boot

const saved = loadSave();
const world = createWorld(seed, saved || {});
world.audio = audio;
world.hasSave = !!saved;
world.saveCash = saved ? saved.cash : 0;
world.saveMission = saved ? saved.missionIndex : 0;

// For automated tests: the live world, one hop away.
window.__fortuna = { world, input };

// Screenshot mode: run the scripted scene, draw one frame, stop. Hide
// the status line so the canvas fills the 1280x720 viewport exactly.
if (shot) {
  if (statusEl) statusEl.style.display = 'none';
  applyShot(world, shot);
  drawWorld(ctx, world);
  document.title = 'Isla Fortuna — shot ' + shot;
  if (statusEl) statusEl.textContent = 'shot=' + shot + ' seed=' + seed;
  window.__shotDone = true;
} else {
  // Normal play.
  audio.startMusic();
  const DT = 1 / 60;
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25;
    acc += elapsed;

    // Screen transitions, from one-shot keys.
    if (world.busted && (input.wasPressed('confirm') || input.pointerDown)) {
      retryAfterArrest(world);
    } else if (world.missionFailed && input.wasPressed('retry')) {
      retryFailedMission(world);
    } else if (world.state === 'title' && (input.wasPressed('confirm') || input.pointerDown)) {
      world.state = 'play';
      audio.unlock();
      if (world.missionIndex < MISSIONS.length) startMission(world, world.missionIndex);
    } else if (world.state === 'play' && input.wasPressed('pause')) {
      world.state = 'pause';
    } else if (world.state === 'pause' && input.wasPressed('pause')) {
      world.state = 'play';
    }

    // Pause menu: hire crew with 1/2/3.
    if (world.state === 'pause') {
      for (let i = 0; i < CREW.length; i++) {
        if (input.wasPressed(String(i + 1))) hire(world, CREW[i].id);
      }
      if (input.wasPressed('retry')) retryFailedMission(world);
    }

    // Mute toggle.
    if (input.wasPressed('mute')) audio.setMuted(!audio.isMuted());

    // Fixed-step simulation.
    while (acc >= DT) {
      stepWorld(world, input, DT);
      acc -= DT;
    }
    input.endFrame();

    // Autosave every few seconds of play.
    if (world.state === 'play' && Math.floor(world.playTime) % 10 === 0) storeSave(world);

    drawWorld(ctx, world);
    if (statusEl) {
      statusEl.textContent =
        'Isla Fortuna — $' + world.cash +
        ' · job ' + Math.min(world.missionIndex + 1, 12) + '/12' +
        ' · wanted ' + world.wanted +
        ' · heat ' + Math.round(world.heat);
    }
  }
  requestAnimationFrame(frame);
}
