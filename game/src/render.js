// Isla Fortuna — the look. A top-down canvas render with a camera that
// follows the player, the island drawn district by district, cars and
// people as clean vector shapes, and the HUD: cash, wanted stars, the
// heat meter, the clock, the weather, the mission objective, dialogue,
// and a live minimap. Day and night change the light; rain streaks
// the screen; sunset turns the whole island gold.

import { CFG, PALETTE, DISTRICTS } from './config.js';
import { clamp, lerp } from './random.js';
import { districtAt, inWater, inHarbourWater } from './city.js';
import { daylight, isNight, isSunset, clockText, skyTint } from './weather.js';
import { currentMission, missionObjectiveText } from './missions.js';
import { CREW } from './crew.js';

export function drawWorld(ctx, world) {
  const W = CFG.viewW;
  const H = CFG.viewH;
  const p = world.player;
  const focus = p.car || p.boat || p;
  const camX = clamp(focus.x - W / 2, 0, CFG.worldW - W);
  const camY = clamp(focus.y - H / 2, 0, CFG.worldH - H);
  world.camera = { x: camX, y: camY };

  // Sky-tinted ground.
  const [sky, light] = skyTint(world.weather);
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(-camX, -camY);

  drawGround(ctx, world, camX, camY, W, H);
  drawRoads(ctx, world);
  drawParkAndPlaza(ctx, world);
  drawBuildings(ctx, world);
  drawDocks(ctx, world);
  drawTrees(ctx, world);
  drawDoubloons(ctx, world);
  drawMarkers(ctx, world);
  drawBoats(ctx, world);
  drawCars(ctx, world);
  drawPeds(ctx, world);
  drawPlayer(ctx, world);
  drawPoliceOverlays(ctx, world);
  ctx.restore();

  drawLighting(ctx, world, W, H, light, sky);
  drawWeather(ctx, world, W, H);
  if (world.state === 'title') drawTitle(ctx, world, W, H);
  else if (world.state === 'pause') drawPause(ctx, world, W, H);
  else drawHUD(ctx, world, W, H);
  if (world.busted) drawBusted(ctx, world, W, H);
  if (world.missionFailed) drawFailed(ctx, world, W, H);
}

function drawGround(ctx, world, camX, camY, W, H) {
  const city = world.city;
  // Ocean and sand along the east edge.
  ctx.fillStyle = PALETTE.oceanDeep;
  ctx.fillRect(CFG.oceanX, 0, CFG.worldW - CFG.oceanX, CFG.worldH);
  ctx.fillStyle = PALETTE.ocean;
  ctx.fillRect(CFG.oceanX - 40, 0, 40, CFG.worldH);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(CFG.sandX, 0, CFG.oceanX - CFG.sandX, CFG.worldH);
  // Harbour basin.
  ctx.fillStyle = PALETTE.ocean;
  ctx.fillRect(CFG.harbour.x, CFG.harbour.y, CFG.harbour.w, CFG.harbour.h);
  // Lagoon along the south edge, joining the harbour to the ocean.
  ctx.fillStyle = '#2a7a9e';
  ctx.fillRect(CFG.lagoon.x, CFG.lagoon.y, CFG.lagoon.w, CFG.lagoon.h);
  // Jungle.
  ctx.fillStyle = PALETTE.jungle;
  ctx.fillRect(CFG.jungle.x, CFG.jungle.y, CFG.jungle.w, CFG.jungle.h);
  // Airstrip tarmac.
  ctx.fillStyle = '#6a6e75';
  ctx.fillRect(CFG.airstrip.x, CFG.airstrip.y, CFG.airstrip.w, CFG.airstrip.h);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(CFG.airstrip.x + 20, CFG.airstrip.y + CFG.airstrip.h / 2 - 3, CFG.airstrip.w - 40, 6);
  // District tint: the Gilded Mile glows gold.
  ctx.fillStyle = 'rgba(245, 197, 66, 0.10)';
  ctx.fillRect(1300, 250, 700, 500);
}

function drawRoads(ctx, world) {
  ctx.fillStyle = PALETTE.sidewalk;
  for (const x of CFG.roadXs) ctx.fillRect(x - CFG.walkHalf, 0, CFG.walkHalf * 2, CFG.worldH);
  for (const y of CFG.roadYs) ctx.fillRect(0, y - CFG.walkHalf, CFG.worldW, CFG.walkHalf * 2);
  ctx.fillStyle = PALETTE.road;
  for (const x of CFG.roadXs) ctx.fillRect(x - CFG.roadHalf, 0, CFG.roadHalf * 2, CFG.worldH);
  for (const y of CFG.roadYs) ctx.fillRect(0, y - CFG.roadHalf, CFG.worldW, CFG.roadHalf * 2);
  // Centre dashes.
  ctx.fillStyle = PALETTE.roadLine;
  for (const x of CFG.roadXs) {
    for (let y = 0; y < CFG.worldH; y += 64) ctx.fillRect(x - 2, y, 4, 30);
  }
  for (const y of CFG.roadYs) {
    for (let x = 0; x < CFG.worldW; x += 64) ctx.fillRect(x, y - 2, 30, 4);
  }
  // Crosswalks at intersections.
  ctx.fillStyle = '#e8e8e8';
  for (const n of world.city.nodes) {
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(n.x - 34 + i * 14, n.y - CFG.roadHalf, 7, 10);
      ctx.fillRect(n.x - 34 + i * 14, n.y + CFG.roadHalf - 10, 7, 10);
    }
  }
}

function drawParkAndPlaza(ctx, world) {
  ctx.fillStyle = PALETTE.park;
  ctx.fillRect(CFG.park.x - 170, CFG.park.y - 170, 340, 340);
  ctx.fillStyle = '#4a7d3f';
  ctx.beginPath();
  ctx.arc(CFG.park.x, CFG.park.y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.plaza;
  ctx.fillRect(CFG.plaza.x - 170, CFG.plaza.y - 170, 340, 340);
  ctx.strokeStyle = '#a89a72';
  ctx.lineWidth = 4;
  ctx.strokeRect(CFG.plaza.x - 170, CFG.plaza.y - 170, 340, 340);
}

function drawBuildings(ctx, world) {
  for (const b of world.city.buildings) {
    ctx.fillStyle = PALETTE.buildingWall[b.wall];
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = PALETTE.buildingRoof[b.roof];
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    if (b.casino) {
      ctx.fillStyle = '#f5c542';
      ctx.fillRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
      ctx.fillStyle = '#7a1f2b';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ GILDED CROWN ★', b.x + b.w / 2, b.y + b.h / 2 + 9);
    }
    if (b.home) {
      ctx.fillStyle = '#7a1f2b';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("MARISOL'S", b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
    // Windows: a grid of lit dots, denser by floors.
    ctx.fillStyle = 'rgba(255, 240, 180, 0.85)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 30));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 3 + b.floors) % 3 === 0) {
          ctx.fillRect(b.x + 12 + i * 34, b.y + 12 + j * 30, 12, 9);
        }
      }
    }
  }
}

function drawDocks(ctx, world) {
  ctx.fillStyle = PALETTE.harbourWood;
  for (const d of world.city.docks) ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.strokeStyle = '#5d4526';
  ctx.lineWidth = 2;
  for (const d of world.city.docks) ctx.strokeRect(d.x, d.y, d.w, d.h);
}

function drawTrees(ctx, world) {
  for (const t of world.city.trees) {
    ctx.fillStyle = t.palm ? '#7a5a30' : '#5d4526';
    ctx.fillRect(t.x - 2, t.y - 2, 4, 10);
    ctx.fillStyle = t.palm ? '#3f9e4d' : '#2f6b2f';
    ctx.beginPath();
    ctx.arc(t.x, t.y - 6, t.jungle ? 16 : 11, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDoubloons(ctx, world) {
  for (const d of world.city.doubloons) {
    if (d.taken) continue;
    const bob = Math.sin(world.time * 3 + d.x) * 3;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(d.x, d.y + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', d.x, d.y + bob + 5);
  }
}

function drawMarkers(ctx, world) {
  const m = currentMission(world);
  // Mission target marker.
  if (m && !world.missionFailed) {
    const step = m.steps[world.missionStep];
    if (step) {
      const pt = step.at || { x: step.x, y: step.y };
      if (pt && typeof pt.x === 'number') {
        const pulse = 1 + Math.sin(world.time * 5) * 0.15;
        ctx.strokeStyle = '#ffd94d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 26 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffd94d';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 34, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a1f2b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', pt.x, pt.y - 30);
      }
    }
  }
  // Taxi fare marker.
  if (world.fare) {
    ctx.fillStyle = '#37d67a';
    ctx.beginPath();
    ctx.arc(world.fare.x, world.fare.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#062b16';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', world.fare.x, world.fare.y + 5);
  }
  // Race marker.
  if (world.race) {
    ctx.strokeStyle = '#37d67a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(world.race.x, world.race.y, 30, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBoats(ctx, world) {
  for (const b of world.boats) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    // Wake.
    if (b.wake > 0.1) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-b.w / 2 - 8, 0, 18 * b.wake, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = b.colour;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = b.kind === 'policeBoat' ? '#e8e8e8' : '#c96f4a';
    ctx.fillRect(-6, -7, 18, 14);
    if (b.kind === 'policeBoat') {
      ctx.fillStyle = '#e33';
      ctx.fillRect(-b.w / 2 + 2, -b.h / 2 - 6, 8, 5);
      ctx.fillStyle = '#37f';
      ctx.fillRect(-b.w / 2 + 12, -b.h / 2 - 6, 8, 5);
    }
    ctx.restore();
  }
}

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-car.w / 2 + 3, -car.h / 2 + 4, car.w, car.h);
  ctx.fillStyle = car.colour;
  ctx.beginPath();
  ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 6);
  ctx.fill();
  ctx.fillStyle = '#222a33';
  ctx.fillRect(-car.w / 2 + 10, -car.h / 2 + 3, car.w / 2 - 6, car.h - 6);
  ctx.fillStyle = '#e8e4da';
  ctx.fillRect(car.w / 2 - 6, -car.h / 2 + 3, 4, 4);
  ctx.fillRect(car.w / 2 - 6, car.h / 2 - 7, 4, 4);
  if (car.kind === 'police' || car.kind === 'roadblock') {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-8, -car.h / 2, 16, car.h);
    ctx.fillStyle = '#20344d';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    ctx.fillStyle = '#e33';
    ctx.fillRect(-10, -car.h / 2 - 5, 8, 4);
    ctx.fillStyle = '#37f';
    ctx.fillRect(2, -car.h / 2 - 5, 8, 4);
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#20344d';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 4);
  }
  if (car.damaged >= 3) {
    ctx.fillStyle = 'rgba(60,60,60,0.5)';
    ctx.beginPath();
    ctx.arc(-car.w / 4, -car.h / 2, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCars(ctx, world) {
  for (const car of world.cars) drawCarShape(ctx, car);
}

function drawPeds(ctx, world) {
  for (const ped of world.peds) {
    if (ped.knocked > 0) {
      // Lying down.
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y, 12, 6, ped.angle, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const bob = Math.sin(ped.walkPhase) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(ped.x, ped.y + 10, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y - 8 + bob * 0.3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.roundRect(ped.x - 7, ped.y - 4 + bob * 0.3, 14, 16, 5);
    ctx.fill();
    if (ped.rival) {
      ctx.fillStyle = '#e33';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', ped.x, ped.y - 20);
    }
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.car || p.boat) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle + Math.PI / 2);
  // Dante: teal jacket, dark jeans.
  ctx.fillStyle = '#1f8a70';
  ctx.beginPath();
  ctx.roundRect(-8, -6, 16, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath();
  ctx.arc(0, -11, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20344d';
  ctx.fillRect(-8, 12, 6, 8);
  ctx.fillRect(2, 12, 6, 8);
  if (p.punching > 0) {
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath();
    ctx.arc(0, -22, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPoliceOverlays(ctx, world) {
  // Roadblock cones.
  for (const block of world.roadblocks) {
    ctx.fillStyle = '#e86a1f';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(block.x + i * 44 - 7, block.y + 26);
      ctx.lineTo(block.x + i * 44, block.y + 6);
      ctx.lineTo(block.x + i * 44 + 7, block.y + 26);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawLighting(ctx, world, W, H, light, sky) {
  if (light >= 0.95 && world.weather.kind !== 'rain') return;
  const night = 1 - light;
  ctx.fillStyle = `rgba(10, 16, 48, ${night * 0.42})`;
  ctx.fillRect(0, 0, W, H);
  if (world.weather.kind === 'rain') {
    ctx.fillStyle = 'rgba(70, 90, 100, 0.12)';
    ctx.fillRect(0, 0, W, H);
  }
  // Sunset wash.
  if (isSunset(world.weather)) {
    ctx.fillStyle = 'rgba(232, 145, 90, 0.16)';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawWeather(ctx, world, W, H) {
  if (!world.weather.rain) return;
  ctx.strokeStyle = 'rgba(200, 220, 235, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const t = world.time * 900;
  for (let i = 0; i < 90; i++) {
    const x = (i * 137 + t) % (W + 40) - 20;
    const y = (i * 211 + t * 1.6) % (H + 40) - 20;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 14);
  }
  ctx.stroke();
}

function drawHUD(ctx, world, W, H) {
  const p = world.player;
  // Top-left: cash, wanted, heat.
  ctx.fillStyle = 'rgba(10, 14, 20, 0.55)';
  ctx.beginPath();
  ctx.roundRect(12, 12, 250, 92, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('$' + world.cash.toLocaleString(), 24, 40);
  // Wanted stars.
  ctx.font = '20px sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < world.wanted ? '★' : '☆';
  ctx.fillStyle = world.wanted > 0 ? '#ff5a4d' : '#9aa5b1';
  ctx.fillText(stars, 24, 66);
  // Heat meter.
  ctx.fillStyle = '#222a33';
  ctx.fillRect(24, 76, 180, 10);
  ctx.fillStyle = world.heat > CFG.heatHotThreshold ? '#ff5a4d' : '#ff9a3d';
  ctx.fillRect(24, 76, 180 * (world.heat / CFG.heatMax), 10);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '11px sans-serif';
  ctx.fillText('HEAT ' + Math.round(world.heat), 212, 85);

  // Top-right: clock, weather, district.
  ctx.fillStyle = 'rgba(10, 14, 20, 0.55)';
  ctx.beginPath();
  ctx.roundRect(W - 212, 12, 200, 64, 10);
  ctx.fill();
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(clockText(world.weather) + (world.weather.rain ? '  🌧' : isSunset(world.weather) ? '  🌇' : '  ☀'), W - 24, 38);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#c9d4de';
  ctx.fillText(districtAt(p.x, p.y), W - 24, 60);

  // Mission objective bar.
  ctx.fillStyle = 'rgba(10, 14, 20, 0.55)';
  ctx.beginPath();
  ctx.roundRect(12, H - 64, 560, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  const obj = missionObjectiveText(world);
  ctx.fillText(obj.length > 72 ? obj.slice(0, 72) + '…' : obj, 24, H - 32);
  const m = currentMission(world);
  if (m && m.timeLimit) {
    ctx.fillStyle = world.missionTime > m.timeLimit - 15 ? '#ff5a4d' : '#e8e8e8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.max(0, Math.ceil(m.timeLimit - world.missionTime)) + 's', 556, H - 32);
  }

  // Dialogue line.
  if (world.dialogueTimer > 0 && world.dialogue) {
    ctx.fillStyle = 'rgba(10, 14, 20, 0.7)';
    const tw = Math.min(760, ctx.measureText(world.dialogue).width + 32);
    ctx.beginPath();
    ctx.roundRect(W / 2 - tw / 2, H - 128, tw, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#f2f2f2';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.dialogue.length > 90 ? world.dialogue.slice(0, 90) + '…' : world.dialogue, W / 2, H - 102);
  }

  drawMinimap(ctx, world, W, H);
}

function drawMinimap(ctx, world, W, H) {
  const size = 168;
  const x0 = W - size - 12;
  const y0 = H - size - 12;
  const scale = size / CFG.worldW;
  ctx.fillStyle = 'rgba(10, 14, 20, 0.6)';
  ctx.beginPath();
  ctx.roundRect(x0 - 6, y0 - 6, size + 12, size + 12, 10);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  ctx.fillStyle = '#3d6b35';
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(x0 + CFG.oceanX * scale, y0, (CFG.worldW - CFG.oceanX) * scale, size);
  ctx.fillStyle = '#ecd28a';
  ctx.fillRect(x0 + CFG.sandX * scale, y0, (CFG.oceanX - CFG.sandX) * scale, size);
  ctx.fillStyle = '#4a4a52';
  for (const x of CFG.roadXs) ctx.fillRect(x0 + x * scale - 1, y0, 2, size);
  for (const y of CFG.roadYs) ctx.fillRect(x0, y0 + y * scale - 1, size, 2);
  // Mission marker.
  const m = currentMission(world);
  if (m) {
    const step = m.steps[world.missionStep];
    const pt = step ? step.at || { x: step.x, y: step.y } : null;
    if (pt && typeof pt.x === 'number') {
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(x0 + pt.x * scale, y0 + pt.y * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Roadblocks (lookout bonus marks them).
  if (world.crew.lookout) {
    ctx.fillStyle = '#ff5a4d';
    for (const b of world.roadblocks) {
      ctx.beginPath();
      ctx.arc(x0 + b.x * scale, y0 + b.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Police (red) and player (white).
  ctx.fillStyle = '#ff5a4d';
  for (const car of world.cars) {
    if (car.kind === 'police') {
      ctx.fillRect(x0 + car.x * scale - 2, y0 + car.y * scale - 2, 4, 4);
    }
  }
  const p = world.player;
  const focus = p.car || p.boat || p;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0 + focus.x * scale, y0 + focus.y * scale, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // North + job counter.
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N', x0 + 4, y0 + 12);
  ctx.textAlign = 'right';
  ctx.fillText('JOB ' + Math.min(world.missionIndex + 1, 12) + '/12', x0 + size, y0 - 10);
}

function drawTitle(ctx, world, W, H) {
  ctx.fillStyle = 'rgba(8, 12, 24, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('ISLA FORTUNA', W / 2, H / 2 - 110);
  ctx.fillStyle = '#f2f2f2';
  ctx.font = '22px sans-serif';
  ctx.fillText('An open-world crime story on an invented island', W / 2, H / 2 - 70);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 18px sans-serif';
  const job = currentMission(world);
  ctx.fillText(job ? 'Job ' + (world.missionIndex + 1) + ' of 12: ' + job.name : 'All twelve jobs done — free roam', W / 2, H / 2 - 30);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '16px sans-serif';
  ctx.fillText('WASD / arrows — move & drive      E — enter a car or boat      Space — punch', W / 2, H / 2 + 16);
  ctx.fillText('Shift — run      P — pause      M — mute      H — horn', W / 2, H / 2 + 44);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.sin(world.time * 4) > 0 ? 1 : 0.25;
  ctx.globalAlpha = blink;
  ctx.fillText(world.hasSave ? 'Press ENTER to continue — $' + world.saveCash + ' saved' : 'Press ENTER to start', W / 2, H / 2 + 96);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#9aa5b1';
  ctx.font = '13px sans-serif';
  ctx.fillText('12 story jobs · wanted heat · police chases · boats · day & night · crew to hire · 8 golden doubloons', W / 2, H / 2 + 132);
}

function drawPause(ctx, world, W, H) {
  ctx.fillStyle = 'rgba(8, 12, 24, 0.65)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('PAUSED', W / 2, H / 2 - 120);
  ctx.fillStyle = '#f2f2f2';
  ctx.font = '18px sans-serif';
  ctx.fillText('Cash $' + world.cash.toLocaleString() + '   ·   Job ' + Math.min(world.missionIndex + 1, 12) + '/12   ·   Doubloons ' + world.doubloonsTaken + '/8', W / 2, H / 2 - 80);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('HIRE CREW  (press 1, 2 or 3)', W / 2, H / 2 - 40);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '15px sans-serif';
  CREW.forEach((c, i) => {
    const hired = world.crew[c.id];
    ctx.fillText(
      (i + 1) + '. ' + c.name + ' — ' + c.role + ' — $' + c.cost + (hired ? '  ✓ HIRED' : '') + '   ·   ' + c.blurb,
      W / 2, H / 2 - 8 + i * 26,
    );
  });
  ctx.fillStyle = '#9aa5b1';
  ctx.font = '14px sans-serif';
  ctx.fillText('P — resume      R — retry current job', W / 2, H / 2 + 96);
}

function drawBusted(ctx, world, W, H) {
  ctx.fillStyle = 'rgba(8, 12, 24, 0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a4d';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('BUSTED', W / 2, H / 2 - 20);
  ctx.fillStyle = '#f2f2f2';
  ctx.font = '20px sans-serif';
  ctx.fillText('Fine paid: $' + world.bustedFine + '. The Fortuna PD lets you go — this time.', W / 2, H / 2 + 24);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Press ENTER to get back out there', W / 2, H / 2 + 64);
}

function drawFailed(ctx, world, W, H) {
  ctx.fillStyle = 'rgba(8, 12, 24, 0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a4d';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('JOB FAILED', W / 2, H / 2 - 20);
  ctx.fillStyle = '#f2f2f2';
  ctx.font = '18px sans-serif';
  ctx.fillText('Press R to retry the job', W / 2, H / 2 + 24);
}
