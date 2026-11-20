// Isla Fortuna — the island itself. A seeded generator lays out the
// road grid, the six districts, the buildings (never on a road, a beach,
// the harbour or the airstrip), the road graph the traffic and the
// autopilot drive on, and the named places missions point at. The same
// seed always builds the same island.

import { CFG, DISTRICTS } from './config.js';
import { mulberry32, clamp, dist, range, rangeInt, pick } from './random.js';

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const city = {
    seed,
    buildings: [],
    nodes: [],
    trees: [],
    lamps: [],
    docks: [],
    doubloons: [],
    casino: null,
    harbourOffice: null,
    airstripTower: null,
    beachBar: null,
    marisolHouse: null,
  };

  // Road graph nodes: every grid intersection.
  for (const x of CFG.roadXs) {
    for (const y of CFG.roadYs) {
      city.nodes.push({ x, y });
    }
  }

  // Named places.
  city.casino = { x: 1590, y: 400, w: 200, h: 150, name: 'The Gilded Crown Casino' };
  city.marisolHouse = { x: 1180, y: 1130, w: 150, h: 110, name: "Marisol's House" };
  city.harbourOffice = { x: 800, y: 1960, w: 150, h: 100, name: 'Harbour Office' };
  city.airstripTower = { x: 2450, y: 1960, w: 90, h: 70, name: 'Airstrip Tower' };
  city.beachBar = { x: 2840, y: 1150, w: 130, h: 80, name: 'Palm Beach Bar' };

  // Docks along the harbour basin's east edge.
  for (let i = 0; i < 4; i++) {
    city.docks.push({ x: 700, y: 1800 + i * 110, w: 90, h: 26 });
  }

  // Buildings: fill the blocks between roads, skipping the districts
  // that are not built-up (beach, harbour water, jungle, airstrip).
  // Block bounds come from the real distance to the next road, since
  // the last row is only 300 tall, not 400.
  for (let bx = 0; bx < 7; bx++) {
    for (let by = 0; by < 5; by++) {
      const nextX = bx + 1 < CFG.roadXs.length ? CFG.roadXs[bx + 1] : CFG.roadXs[bx] + 400;
      const nextY = by + 1 < CFG.roadYs.length ? CFG.roadYs[by + 1] : CFG.roadYs[by] + 400;
      const x0 = CFG.roadXs[bx] + CFG.walkHalf + 8;
      const y0 = CFG.roadYs[by] + CFG.walkHalf + 8;
      const w = nextX - CFG.roadXs[bx] - 2 * (CFG.walkHalf + 8);
      const h = nextY - CFG.roadYs[by] - 2 * (CFG.walkHalf + 8);
      const cx = x0 + w / 2;
      const cy = y0 + h / 2;
      // Skip the jungle, the harbour basin, the airstrip and the park/plaza.
      if (cx > CFG.jungle.x && cx < CFG.jungle.x + CFG.jungle.w && cy > CFG.jungle.y && cy < CFG.jungle.y + CFG.jungle.h) continue;
      if (cx > CFG.harbour.x && cx < CFG.harbour.x + CFG.harbour.w && cy > CFG.harbour.y && cy < CFG.harbour.y + CFG.harbour.h) continue;
      if (cx > CFG.airstrip.x && cx < CFG.airstrip.x + CFG.airstrip.w && cy > CFG.airstrip.y && cy < CFG.airstrip.y + CFG.airstrip.h) continue;
      if (dist(cx, cy, CFG.park.x, CFG.park.y) < 260) continue;
      if (dist(cx, cy, CFG.plaza.x, CFG.plaza.y) < 260) continue;
      if (cx + w / 2 > CFG.sandX) continue;
      // One or two buildings per block, seeded.
      const count = rng() < 0.45 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const bw = count === 1 ? w * range(rng, 0.5, 0.7) : w * range(rng, 0.32, 0.44);
        const bh = count === 1 ? h * range(rng, 0.5, 0.7) : h * range(rng, 0.32, 0.44);
        const ox = count === 1 ? 0 : (i === 0 ? -w * 0.22 : w * 0.22);
        const oy = count === 1 ? 0 : (i === 0 ? -h * 0.18 : h * 0.18);
        city.buildings.push({
          x: cx + ox - bw / 2,
          y: cy + oy - bh / 2,
          w: bw,
          h: bh,
          roof: pick(rng, [0, 1, 2, 3, 4, 5]),
          wall: pick(rng, [0, 1, 2, 3]),
          floors: rangeInt(rng, 1, 4),
        });
      }
    }
  }

  // The casino is its own big building on the Gilded Mile.
  city.buildings.push({
    x: city.casino.x, y: city.casino.y, w: city.casino.w, h: city.casino.h,
    roof: 0, wall: 0, floors: 3, casino: true,
  });
  city.buildings.push({
    x: city.marisolHouse.x, y: city.marisolHouse.y, w: city.marisolHouse.w, h: city.marisolHouse.h,
    roof: 1, wall: 1, floors: 2, home: true,
  });
  city.buildings.push({
    x: city.harbourOffice.x, y: city.harbourOffice.y, w: city.harbourOffice.w, h: city.harbourOffice.h,
    roof: 2, wall: 2, floors: 2,
  });
  city.buildings.push({
    x: city.airstripTower.x, y: city.airstripTower.y, w: city.airstripTower.w, h: city.airstripTower.h,
    roof: 3, wall: 3, floors: 2,
  });
  city.buildings.push({
    x: city.beachBar.x, y: city.beachBar.y, w: city.beachBar.w, h: city.beachBar.h,
    roof: 4, wall: 0, floors: 1,
  });

  // Palm trees along the beach and in the park.
  for (let i = 0; i < 26; i++) {
    city.trees.push({ x: range(rng, CFG.sandX + 20, CFG.oceanX - 20), y: range(rng, 300, 2100), palm: true });
  }
  for (let i = 0; i < 18; i++) {
    city.trees.push({ x: range(rng, CFG.park.x - 140, CFG.park.x + 140), y: range(rng, CFG.park.y - 140, CFG.park.y + 140), palm: false });
  }
  for (let i = 0; i < 30; i++) {
    city.trees.push({ x: range(rng, CFG.jungle.x + 30, CFG.jungle.x + CFG.jungle.w - 30), y: range(rng, CFG.jungle.y + 30, CFG.jungle.y + CFG.jungle.h - 30), palm: false, jungle: true });
  }

  // Street lamps at every intersection.
  for (const n of city.nodes) city.lamps.push({ x: n.x + 56, y: n.y + 56 });

  // Golden doubloons: eight collectibles tucked around the island.
  const spots = [
    { x: 300, y: 2150 }, { x: 2700, y: 250 }, { x: 1500, y: 1050 },
    { x: 700, y: 650 }, { x: 2300, y: 1450 }, { x: 2940, y: 1850 },
    { x: 450, y: 1000 }, { x: 1900, y: 2150 },
  ];
  for (const s of spots) city.doubloons.push({ x: s.x, y: s.y, taken: false });

  return city;
}

export function onRoad(x, y) {
  for (const rx of CFG.roadXs) if (Math.abs(x - rx) < CFG.roadHalf) return true;
  for (const ry of CFG.roadYs) if (Math.abs(y - ry) < CFG.roadHalf) return true;
  return false;
}

export function inHarbourWater(x, y) {
  const h = CFG.harbour;
  return x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h;
}

export function inOcean(x, y) {
  return x > CFG.oceanX;
}

export function inLagoon(x, y) {
  const l = CFG.lagoon;
  return x > l.x && x < l.x + l.w && y > l.y && y < l.y + l.h;
}

export function inWater(x, y) {
  return inHarbourWater(x, y) || inOcean(x, y) || inLagoon(x, y);
}

export function inJungle(x, y) {
  const j = CFG.jungle;
  return x > j.x && x < j.x + j.w && y > j.y && y < j.y + j.h;
}

export function insideBuilding(city, x, y, margin = 0) {
  for (const b of city.buildings) {
    if (x > b.x - margin && x < b.x + b.w + margin && y > b.y - margin && y < b.y + b.h + margin) return b;
  }
  return null;
}

// Push a circular body out of buildings; returns true if it collided.
export function collideBuildings(city, body, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = clamp(body.x, b.x, b.x + b.w);
    const cy = clamp(body.y, b.y, b.y + b.h);
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      const d = Math.sqrt(d2) || 0.001;
      const push = (radius - d) / d;
      body.x += dx * push;
      body.y += dy * push;
    }
  }
  return hit;
}

export function randomRoadPoint(rng, city) {
  const vertical = rng() < 0.5;
  if (vertical) {
    return { x: CFG.roadXs[Math.floor(rng() * CFG.roadXs.length)], y: range(rng, 250, 2150) };
  }
  return { x: range(rng, 300, 2700), y: CFG.roadYs[Math.floor(rng() * CFG.roadYs.length)] };
}

export function randomSidewalkPoint(rng, city) {
  const p = randomRoadPoint(rng, city);
  const side = rng() < 0.5 ? -1 : 1;
  const vertical = rng() < 0.5;
  if (vertical) p.x += side * (CFG.roadHalf + 14);
  else p.y += side * (CFG.roadHalf + 14);
  return p;
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return d.name;
  }
  if (x > CFG.sandX) return 'Palm Beach';
  if (inJungle(x, y)) return 'Jungle';
  return 'Fortuna City';
}

export function districtCenter(name) {
  const d = DISTRICTS.find((v) => v.name === name);
  if (!d) return { x: 1500, y: 1200 };
  return { x: d.x + d.w / 2, y: d.y + d.h / 2 };
}

export function nearestNode(city, x, y) {
  let best = city.nodes[0];
  let bd = Infinity;
  for (const n of city.nodes) {
    const d = dist(x, y, n.x, n.y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

// Breadth-first route over the road graph, from the node nearest (x,y)
// to the node nearest (tx,ty). Returns a list of nodes, start included.
export function routeBetween(city, x, y, tx, ty) {
  const start = nearestNode(city, x, y);
  const goal = nearestNode(city, tx, ty);
  const key = (n) => n.x + ',' + n.y;
  // Grid neighbours: nodes were pushed column-major (roadXs outer,
  // roadYs inner), so index i means column floor(i/rows), row i%rows.
  const rows = CFG.roadYs.length;
  const cols = CFG.roadXs.length;
  const neighbours = (n) => {
    const i = city.nodes.indexOf(n);
    const out = [];
    const cx = Math.floor(i / rows);
    const cy = i % rows;
    if (cx > 0) out.push(city.nodes[i - rows]);
    if (cx < cols - 1) out.push(city.nodes[i + rows]);
    if (cy > 0) out.push(city.nodes[i - 1]);
    if (cy < rows - 1) out.push(city.nodes[i + 1]);
    return out;
  };
  const prev = new Map();
  const queue = [start];
  prev.set(key(start), null);
  while (queue.length) {
    const n = queue.shift();
    if (n === goal) break;
    for (const m of neighbours(n)) {
      if (!prev.has(key(m))) {
        prev.set(key(m), n);
        queue.push(m);
      }
    }
  }
  const path = [];
  let cur = goal;
  let guard = 0;
  while (cur && guard++ < 100) {
    path.unshift(cur);
    cur = prev.get(key(cur));
  }
  return path.length ? path : [start, goal];
}
