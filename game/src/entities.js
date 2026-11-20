// Isla Fortuna — the things that move: the player, cars, boats and
// pedestrians. Factories build them, step functions move them, and the
// collision helpers keep them out of each other and out of buildings.
// The player drives with arcade physics: accelerate, steer, brake,
// reverse; boats steer slower and slide more on the water.

import { CFG, CAR_MODELS, PED_SHIRTS } from './config.js';
import { clamp, dist, angleDelta, pick, range, rangeInt } from './random.js';
import { collideBuildings, randomRoadPoint, randomSidewalkPoint, inWater, onRoad } from './city.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    radius: CFG.playerRadius,
    health: CFG.playerHealth,
    car: null,
    boat: null,
    punching: 0,
    punchCooldown: 0,
    running: false,
  };
}

export function makeCar(kind, x, y, angle, model, rng) {
  const m = CAR_MODELS[model] || CAR_MODELS.sedan;
  return {
    kind, // 'traffic' | 'parked' | 'player' | 'police' | 'taxi' | 'mission'
    x, y, angle, speed: 0,
    model: m,
    colour: m.colour,
    w: m.w, h: m.h,
    route: null,
    routeIndex: 0,
    waitAtNode: 0,
    siren: kind === 'police',
    driver: null,
    damaged: 0,
  };
}

export function makeBoat(kind, x, y, angle) {
  return {
    kind, // 'boat' | 'policeBoat'
    x, y, angle, speed: 0,
    model: CAR_MODELS.boat,
    colour: kind === 'policeBoat' ? '#20344d' : '#e8f2f2',
    w: 56, h: 24,
    route: null,
    routeIndex: 0,
    wake: 0,
  };
}

export function makeTaxi(x, y, rng) {
  const car = makeCar('taxi', x, y, -Math.PI / 2, 'taxi', rng);
  car.colour = '#f2c230';
  return car;
}

export function makeSportsCar(x, y, rng) {
  const car = makeCar('mission', x, y, -Math.PI / 2, 'sports', rng);
  return car;
}

export function makeGetawayCar(x, y, rng) {
  const car = makeCar('mission', x, y, 0, 'sports', rng);
  car.colour = '#2a2a30';
  return car;
}

export function makePed(x, y, rng) {
  return {
    x, y,
    angle: range(rng, 0, Math.PI * 2),
    speed: 0,
    target: null,
    wait: range(rng, 0, 3),
    shirt: pick(rng, PED_SHIRTS),
    skin: pick(rng, ['#e8b88a', '#c98d5f', '#8a5a3b', '#f0c8a0']),
    fleeing: false,
    fleeDir: undefined,
    fleeT: 0,
    knocked: 0,
    walkPhase: range(rng, 0, Math.PI * 2),
  };
}

export function spawnTraffic(world) {
  for (let i = 0; i < CFG.trafficCount; i++) {
    const p = randomRoadPoint(world.rng, world.city);
    const vertical = world.rng() < 0.5;
    const model = pick(world.rng, ['sedan', 'sedan', 'pickup', 'van', 'taxi']);
    const car = makeCar('traffic', p.x, p.y, vertical ? Math.PI / 2 : 0, model, world.rng);
    car.route = null;
    world.cars.push(car);
  }
}

export function spawnParked(world) {
  for (let i = 0; i < 10; i++) {
    const p = randomRoadPoint(world.rng, world.city);
    const side = world.rng() < 0.5 ? -1 : 1;
    const vertical = world.rng() < 0.5;
    const x = vertical ? p.x + side * (CFG.roadHalf + 12) : p.x;
    const y = vertical ? p.y : p.y + side * (CFG.roadHalf + 12);
    const model = pick(world.rng, ['sedan', 'pickup', 'van', 'sedan']);
    world.cars.push(makeCar('parked', x, y, vertical ? Math.PI / 2 : 0, model, world.rng));
  }
}

export function spawnPeds(world) {
  for (let i = 0; i < CFG.pedCount; i++) {
    const p = randomSidewalkPoint(world.rng, world.city);
    world.peds.push(makePed(p.x, p.y, world.rng));
  }
}

export function spawnBoats(world) {
  // Two moored boats at the harbour docks, one at the beach bar.
  world.boats.push(makeBoat('boat', 690, 1830, 0));
  world.boats.push(makeBoat('boat', 690, 2050, 0));
  world.boats.push(makeBoat('boat', 3120, 1150, Math.PI / 2));
}

// Traffic cars follow the road graph: pick a random destination node,
// drive the route, wait a beat at the end, pick another.
export function stepTrafficCar(world, car, dt) {
  if (!car.route || car.routeIndex >= car.route.length) {
    const target = world.city.nodes[Math.floor(world.rng() * world.city.nodes.length)];
    const { routeBetween } = world.cityHelpers;
    car.route = routeBetween(world.city, car.x, car.y, target.x, target.y);
    car.routeIndex = 0;
    car.waitAtNode = 0;
  }
  if (car.waitAtNode > 0) { car.waitAtNode -= dt; return; }
  const node = car.route[car.routeIndex];
  if (!node) return;
  const d = dist(car.x, car.y, node.x, node.y);
  if (d < 14) {
    car.routeIndex++;
    if (car.routeIndex >= car.route.length) car.waitAtNode = range(world.rng, 0.5, 2.5);
    return;
  }
  const want = Math.atan2(node.y - car.y, node.x - car.x);
  car.angle += clamp(angleDelta(car.angle, want), -2.2 * dt, 2.2 * dt);
  const targetSpeed = CFG.trafficSpeed * (world.weather.rain ? 0.8 : 1);
  car.speed += clamp(targetSpeed - car.speed, -300 * dt, 200 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

// Pedestrians stroll the sidewalks, wait at corners, and flee from the
// player when a crime happens nearby or a car comes at them.
export function stepPed(world, ped, dt) {
  if (ped.knocked > 0) { ped.knocked -= dt; return; }
  ped.walkPhase += dt * 6;
  if (ped.fleeing) {
    // A scattered pedestrian runs along the direction set when they
    // jumped aside; a frightened one runs away from the player.
    const away = ped.fleeDir !== undefined
      ? ped.fleeDir
      : Math.atan2(ped.y - world.player.y, ped.x - world.player.x);
    ped.angle = away;
    ped.speed = CFG.pedFleeSpeed;
    ped.x += Math.cos(away) * ped.speed * dt;
    ped.y += Math.sin(away) * ped.speed * dt;
    collideBuildings(world.city, ped, 10);
    ped.x = clamp(ped.x, 60, CFG.worldW - 60);
    ped.y = clamp(ped.y, 60, CFG.worldH - 60);
    ped.fleeT = (ped.fleeT || 0) - dt;
    if (ped.fleeT <= 0 || dist(ped.x, ped.y, world.player.x, world.player.y) > 420) {
      ped.fleeing = false;
      ped.fleeDir = undefined;
      ped.fleeT = 0;
    }
    return;
  }
  // Scatter: a fast car bearing down on a pedestrian makes them jump
  // aside, perpendicular to the car's path. This is what keeps a
  // high-speed chase survivable instead of a wanted-level spiral.
  for (const car of world.cars) {
    if (Math.abs(car.speed) < 120) continue;
    const d = dist(ped.x, ped.y, car.x, car.y);
    if (d > 200) continue;
    const toPed = Math.atan2(ped.y - car.y, ped.x - car.x);
    if (Math.abs(angleDelta(car.angle, toPed)) > 0.6) continue;
    const side = Math.sin(toPed - car.angle) > 0 ? 1 : -1;
    ped.fleeDir = car.angle + side * Math.PI / 2;
    ped.fleeT = 1.6;
    ped.fleeing = true;
    break;
  }
  if (ped.fleeing) return;
  if (ped.wait > 0) { ped.wait -= dt; return; }
  if (!ped.target || dist(ped.x, ped.y, ped.target.x, ped.target.y) < 12) {
    ped.target = randomSidewalkPoint(world.rng, world.city);
    if (world.rng() < 0.3) ped.wait = range(world.rng, 1, 4);
  }
  const want = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
  ped.angle += clamp(angleDelta(ped.angle, want), -3 * dt, 3 * dt);
  ped.speed = CFG.pedSpeed;
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
  collideBuildings(world.city, ped, 10);
  ped.x = clamp(ped.x, 60, CFG.worldW - 60);
  ped.y = clamp(ped.y, 60, CFG.worldH - 60);
}

// The player's car: arcade driving with speed-sensitive steering.
export function stepDrivenCar(world, car, input, dt) {
  const top = car.model.top * (world.crew.driver ? 1.06 : 1);
  const throttle = -input.axisY(); // up = forward
  const steer = input.axisX();
  if (throttle > 0) car.speed += CFG.carAccel * dt;
  else if (throttle < 0) {
    if (car.speed > 10) car.speed -= CFG.carBrake * dt;
    else car.speed -= CFG.carAccel * 0.45 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 260 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  car.speed = clamp(car.speed, -CFG.carReverseMax, top);
  const steerAuthority = clamp(Math.abs(car.speed) / 220, 0, 1);
  car.angle += steer * CFG.carTurn * steerAuthority * dt * Math.sign(car.speed || 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 40, CFG.worldW - 40);
  car.y = clamp(car.y, 40, CFG.worldH - 40);
  const hitWall = collideBuildings(world.city, car, 20);
  if (hitWall && Math.abs(car.speed) > 120) {
    car.speed *= 0.4;
    car.damaged += 1;
    world.audio?.crash();
  }
  if (Math.abs(car.speed) > 300 && Math.abs(steer) > 0.6 && world.rng() < 0.1) {
    world.audio?.skid();
  }
}

// The player's boat: slower steering, more slide, water only.
export function stepDrivenBoat(world, boat, input, dt) {
  const throttle = -input.axisY();
  const steer = input.axisX();
  if (throttle > 0) boat.speed += 260 * dt;
  else if (throttle < 0) boat.speed -= 200 * dt;
  else boat.speed -= Math.sign(boat.speed) * 120 * dt;
  boat.speed = clamp(boat.speed, -120, CFG.boatTopSpeed);
  const steerAuthority = clamp(Math.abs(boat.speed) / 200, 0, 1);
  boat.angle += steer * 1.6 * steerAuthority * dt * Math.sign(boat.speed || 1);
  boat.x += Math.cos(boat.angle) * boat.speed * dt;
  boat.y += Math.sin(boat.angle) * boat.speed * dt;
  boat.wake = Math.min(1, boat.wake + Math.abs(boat.speed) / 400 * dt * 4);
  // Boats stay in the water; the shore pushes them back.
  if (!inWater(boat.x, boat.y)) {
    boat.x -= Math.cos(boat.angle) * boat.speed * dt * 2;
    boat.y -= Math.sin(boat.angle) * boat.speed * dt * 2;
    boat.speed *= 0.5;
  }
  boat.x = clamp(boat.x, 60, CFG.worldW - 30);
  boat.y = clamp(boat.y, 60, CFG.worldH - 60);
}

// Circle-vs-rectangle car collision: push apart, trade a little speed.
export function collideCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const min = 30;
  if (d < min && d > 0.01) {
    const push = (min - d) / 2;
    const nx = dx / d;
    const ny = dy / d;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
    const tmp = a.speed;
    a.speed = b.speed * 0.5;
    b.speed = tmp * 0.5;
    return true;
  }
  return false;
}

export function nearestCar(world, x, y, rangePx) {
  let best = null;
  let bd = rangePx;
  for (const car of world.cars) {
    if (car.kind === 'police') continue;
    const d = dist(x, y, car.x, car.y);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

export function nearestBoat(world, x, y, rangePx) {
  let best = null;
  let bd = rangePx;
  for (const boat of world.boats) {
    if (boat.kind === 'policeBoat') continue;
    const d = dist(x, y, boat.x, boat.y);
    if (d < bd) { bd = d; best = boat; }
  }
  return best;
}

export function knockDown(world, ped) {
  ped.knocked = 1.6;
  ped.fleeing = false;
}
