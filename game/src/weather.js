// Isla Fortuna — sky and weather. A full island day runs 360 seconds
// of play: dawn, noon, golden sunset, night with lamps. Weather drifts
// between clear, rain and a golden-hour haze; rain slows traffic, dims
// the light and patters on the roof. The render reads this module's
// numbers, so the whole island's light changes with the clock.

import { CFG } from './config.js';
import { clamp } from './random.js';

export function createWeather(rng) {
  return {
    time: 0.32, // fraction of the day; 0.32 is a late morning
    kind: 'clear', // 'clear' | 'rain' | 'haze'
    timer: 40,
    rain: false,
    rng,
  };
}

// Advance the clock and drift the weather. Missions can force rain.
export function stepWeather(weather, dt) {
  weather.time = (weather.time + dt / CFG.dayLengthSeconds) % 1;
  weather.timer -= dt;
  if (weather.timer <= 0) {
    weather.timer = 30 + weather.rng() * 40;
    const roll = weather.rng();
    if (weather.kind === 'rain') {
      weather.kind = roll < 0.6 ? 'clear' : 'haze';
    } else if (roll < 0.18) {
      weather.kind = 'rain';
    } else if (roll < 0.35) {
      weather.kind = 'haze';
    } else {
      weather.kind = 'clear';
    }
  }
  weather.rain = weather.kind === 'rain';
}

// 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk.
export function daylight(weather) {
  const t = weather.time;
  const sun = Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  return clamp(sun, 0, 1);
}

export function isNight(weather) {
  return daylight(weather) < 0.25;
}

export function isSunset(weather) {
  const t = weather.time;
  return (t > 0.66 && t < 0.78) || (t > 0.2 && t < 0.3);
}

// Clock text for the HUD: 06:00–05:59 across the day.
export function clockText(weather) {
  const hours = Math.floor(weather.time * 24);
  const mins = Math.floor((weather.time * 24 - hours) * 60);
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  return hh + ':' + mm;
}

// Sky tint for the render: [top colour, light level 0..1].
export function skyTint(weather) {
  const day = daylight(weather);
  if (weather.kind === 'rain') return ['#5a6a72', 0.55];
  if (isSunset(weather)) return ['#e8915a', 0.8];
  if (day < 0.25) return ['#1a2340', 0.35];
  return ['#8ec9e8', 1];
}
