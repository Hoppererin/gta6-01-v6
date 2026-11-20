// Isla Fortuna — keyboard input. WASD and arrows drive and walk, E
// enters and exits vehicles, Space punches, Shift runs, P pauses, Enter
// confirms, M mutes, H honks the horn. The game reads held keys through
// isDown() and one-frame presses through wasPressed(); endFrame() clears
// the pressed set. blankInput() is the no-keys input the screenshot
// scenes and the smoke tests drive with.

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'enter', Enter: 'confirm',
  Space: 'punch',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute',
  KeyH: 'horn',
  KeyC: 'camera',
  KeyR: 'retry',
  Digit1: '1', Digit2: '2', Digit3: '3',
};

export function createInput() {
  const input = {
    held: new Set(),
    pressed: new Set(),
    pointerDown: false,
    isDown(name) { return this.held.has(name); },
    wasPressed(name) { return this.pressed.has(name); },
    // Steering: -1 left, +1 right. Throttle: -1 reverse, +1 forward.
    axisX() { return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0); },
    axisY() { return (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0); },
    endFrame() { this.pressed.clear(); },
  };

  function onKey(e, down) {
    const name = KEYMAP[e.code];
    if (!name) return;
    if (down) {
      if (!input.held.has(name)) input.pressed.add(name);
      input.held.add(name);
    } else {
      input.held.delete(name);
    }
    // Keep the page from scrolling on game keys.
    if (['up', 'down', 'left', 'right', 'punch'].includes(name)) e.preventDefault();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    window.addEventListener('pointerdown', () => { input.pointerDown = true; });
    window.addEventListener('pointerup', () => { input.pointerDown = false; });
  }
  return input;
}

// The input the screenshot scenes and the headless tests use: no keys.
export function blankInput() {
  return {
    held: new Set(),
    pressed: new Set(),
    pointerDown: false,
    isDown() { return false; },
    wasPressed() { return false; },
    axisX() { return 0; },
    axisY() { return 0; },
    endFrame() {},
  };
}

// A scripted input for tests: hold a set of named keys, press some once.
export function scriptedInput(held = [], pressed = []) {
  const h = new Set(held);
  const p = new Set(pressed);
  return {
    held: h,
    pressed: p,
    pointerDown: false,
    isDown(n) { return h.has(n); },
    wasPressed(n) { return p.has(n); },
    axisX() { return (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0); },
    axisY() { return (h.has('down') ? 1 : 0) - (h.has('up') ? 1 : 0); },
    endFrame() { p.clear(); },
  };
}

// Runs a callback on the first key press (used to unlock audio).
export function onFirstKey(fn) {
  if (typeof window === 'undefined') return;
  const once = () => {
    window.removeEventListener('keydown', once);
    window.removeEventListener('pointerdown', once);
    fn();
  };
  window.addEventListener('keydown', once);
  window.addEventListener('pointerdown', once);
}
