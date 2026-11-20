// Isla Fortuna — the law. Wanted stars, the heat meter, police cars
// and boats that chase the player, and roadblocks that appear when the
// heat is high. Stars decay when the player stays clean; heat cools
// slower and makes the island stay angry longer. Getting busted costs
// cash and the mission's progress; outrunning the law clears the stars.

import { CFG } from './config.js';
import { clamp, dist, angleDelta, range } from './random.js';
import { makeCar, makeBoat, collideCars } from './entities.js';
import { randomRoadPoint, nearestNode, routeBetween, onRoad } from './city.js';

// A crime of this many stars: stars rise, heat rises faster.
export function commitCrime(world, stars, heat = 12) {
  world.wanted = clamp(world.wanted + stars, 0, 5);
  world.heat = clamp(world.heat + heat, 0, CFG.heatMax);
  world.wantedTimer = CFG.wantedDecaySeconds;
  if (world.wanted > 0) world.audio?.siren();
}

export function clearWanted(world) {
  world.wanted = 0;
  world.wantedTimer = CFG.wantedDecaySeconds;
  for (const car of world.cars) {
    if (car.kind === 'police') car.despawn = true;
  }
  for (const boat of world.boats) {
    if (boat.kind === 'policeBoat') boat.despawn = true;
  }
  world.roadblocks = [];
}

// Per-frame: decay stars and heat, spawn chasers, steer the chase.
export function stepPolice(world, dt) {
  // Heat always cools a little; faster when the player is clean.
  const cooling = world.wanted === 0 ? CFG.heatCoolPerSecond * 1.6 : CFG.heatCoolPerSecond;
  world.heat = clamp(world.heat - cooling * dt, 0, CFG.heatMax);

  // Stars decay after a clean stretch.
  if (world.wanted > 0) {
    world.wantedTimer -= dt;
    if (world.wantedTimer <= 0) {
      world.wanted = Math.max(0, world.wanted - 1);
      world.wantedTimer = CFG.wantedDecaySeconds;
      if (world.wanted === 0) clearWanted(world);
    }
  }

  // Spawn chasers up to the wanted level's allowance.
  const wantCars = world.wanted === 0 ? 0 : Math.min(CFG.maxPoliceCars, world.wanted + (world.heat > CFG.heatHotThreshold ? 1 : 0));
  const cops = world.cars.filter((c) => c.kind === 'police' && !c.despawn);
  if (cops.length < wantCars && world.spawnTimer <= 0) {
    spawnPoliceCar(world);
    world.spawnTimer = world.heat > CFG.heatHotThreshold ? 1.6 : 2.6;
  }
  world.spawnTimer -= dt;

  // Police boats when the player is on the water and wanted.
  const onWater = world.player.boat !== null;
  const wantBoats = onWater && world.wanted > 0 ? Math.min(CFG.maxPoliceBoats, world.wanted) : 0;
  const copBoats = world.boats.filter((b) => b.kind === 'policeBoat' && !b.despawn);
  if (copBoats.length < wantBoats && world.spawnTimer <= 0) {
    spawnPoliceBoat(world);
    world.spawnTimer = 3;
  }

  // Steer every chaser at the player.
  for (const cop of world.cars) {
    if (cop.kind !== 'police' || cop.despawn) continue;
    stepChaser(world, cop, dt);
  }
  for (const boat of world.boats) {
    if (boat.kind !== 'policeBoat' || boat.despawn) continue;
    stepChaserBoat(world, boat, dt);
  }

  // Roadblocks: hot islands get them ahead of the player.
  if (world.heat > CFG.heatRoadblockAt && world.wanted > 0 && world.roadblocks.length < 2 && world.roadblockTimer <= 0) {
    spawnRoadblock(world);
    world.roadblockTimer = 14;
  }
  world.roadblockTimer -= dt;

  // Drop despawned chasers.
  world.cars = world.cars.filter((c) => !c.despawn);
  world.boats = world.boats.filter((b) => !b.despawn);

  // Bust check: a police car touching the player on foot holds them.
  if (world.wanted > 0 && !world.player.car && !world.player.boat) {
    for (const cop of world.cars) {
      if (cop.kind !== 'police') continue;
      if (dist(cop.x, cop.y, world.player.x, world.player.y) < 34 && Math.abs(cop.speed) < 60) {
        world.bustHold += dt;
        if (world.bustHold > CFG.bustHoldSeconds) {
          bustPlayer(world);
          return;
        }
      } else {
        world.bustHold = Math.max(0, world.bustHold - dt);
      }
    }
  } else {
    world.bustHold = 0;
  }
}

function spawnPoliceCar(world) {
  const p = randomRoadPoint(world.rng, world.city);
  const cop = makeCar('police', p.x, p.y, 0, 'police', world.rng);
  cop.speed = 100;
  world.cars.push(cop);
}

function spawnPoliceBoat(world) {
  const boat = makeBoat('policeBoat', world.player.x + 300, world.player.y, 0);
  boat.speed = 120;
  world.boats.push(boat);
}

function spawnRoadblock(world) {
  const ahead = 420;
  const px = world.player.x + Math.cos(world.player.angle) * ahead;
  const py = world.player.y + Math.sin(world.player.angle) * ahead;
  const node = nearestNode(world.city, px, py);
  const block = { x: node.x, y: node.y, cars: [] };
  for (let i = -1; i <= 1; i++) {
    const c = makeCar('police', node.x + i * 40, node.y, Math.PI / 2, 'police', world.rng);
    c.speed = 0;
    c.kind = 'roadblock';
    block.cars.push(c);
    world.cars.push(c);
  }
  world.roadblocks.push(block);
}

function stepChaser(world, cop, dt) {
  const target = world.player.car || world.player;
  const d = dist(cop.x, cop.y, target.x, target.y);
  const want = Math.atan2(target.y - cop.y, target.x - cop.x);
  cop.angle += clamp(angleDelta(cop.angle, want), -3.2 * dt, 3.2 * dt);
  const top = 560 + world.wanted * 18 + (world.heat > CFG.heatHotThreshold ? 30 : 0);
  const desired = d > 60 ? top : top * 0.5;
  cop.speed += clamp(desired - cop.speed, -500 * dt, 320 * dt);
  cop.x += Math.cos(cop.angle) * cop.speed * dt;
  cop.y += Math.sin(cop.angle) * cop.speed * dt;
  // Ram the player: a hard hit slows them and costs health.
  if (d < 36 && Math.abs(cop.speed) > 150) {
    if (world.player.car) {
      world.player.car.speed *= 0.55;
      world.player.car.damaged += 1;
      world.audio?.crash();
      cop.speed *= 0.4;
    } else if (world.bustHold <= 0) {
      world.player.health -= 12 * dt * 10;
      world.audio?.crash();
      cop.speed *= 0.4;
    }
  }
  // Chasers push through traffic instead of queueing behind it.
  for (const other of world.cars) {
    if (other === cop || other.kind === 'police' || other.kind === 'roadblock') continue;
    if (dist(cop.x, cop.y, other.x, other.y) < 44) {
      other.x += (other.x - cop.x) * 0.08;
      other.y += (other.y - cop.y) * 0.08;
    }
  }
}

function stepChaserBoat(world, boat, dt) {
  const target = world.player.boat || world.player;
  const d = dist(boat.x, boat.y, target.x, target.y);
  const want = Math.atan2(target.y - boat.y, target.x - boat.x);
  boat.angle += clamp(angleDelta(boat.angle, want), -2.4 * dt, 2.4 * dt);
  boat.speed += clamp(430 - boat.speed, -300 * dt, 240 * dt);
  boat.x += Math.cos(boat.angle) * boat.speed * dt;
  boat.y += Math.sin(boat.angle) * boat.speed * dt;
  boat.wake = 1;
  if (d < 40 && world.player.boat) {
    world.player.boat.speed *= 0.6;
    world.audio?.crash();
    boat.speed *= 0.5;
  }
}

function bustPlayer(world) {
  const fine = Math.min(world.cash, 150 + world.wanted * 50);
  world.cash -= fine;
  world.busted = true;
  world.bustedFine = fine;
  world.audio?.busted();
  clearWanted(world);
  world.heat = Math.max(20, world.heat * 0.5);
  // The player wakes up at the police station in Old Town.
  world.player.x = 1100;
  world.player.y = 1050;
  world.player.car = null;
  world.player.boat = null;
  world.player.health = CFG.playerHealth;
  world.bustHold = 0;
}
