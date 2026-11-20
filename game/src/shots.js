// Isla Fortuna — the four deterministic screenshot scenes. Each one
// runs the real simulation forward from a fresh world with a fixed
// seed and a scripted driver, then the browser draws one frame and
// stops — so every shot is a real render of the game's own code, and
// the same seed always gives the same frame.
//
// The scripted driver steers with plain geometry: it holds the
// accelerator and nudges left or right to stay on its road. Traffic
// near the player is cleared in 0.5-second chunks around the player
// (a 600px bubble no traffic car can cross in one chunk), so the
// corridor stays clean for the whole run and the shots never end in
// a traffic jam.

import { CFG } from './config.js';
import { clamp } from './random.js';
import { stepWorld } from './world.js';
import { makeCar, makePed } from './entities.js';
import { startMission, queueDialogue } from './missions.js';
import { blankInput, scriptedInput } from './input.js';
import { randomRoadPoint, randomSidewalkPoint } from './city.js';
import { commitCrime } from './police.js';

const DT = 1 / 60;

function run(world, seconds, driver) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    stepWorld(world, driver(world, i) || blankInput(), DT);
  }
}

function clearNearPlayer(world, radius) {
  const p = world.player;
  const focus = p.car || p.boat || p;
  for (const car of world.cars) {
    if (car.kind !== 'traffic') continue;
    if (Math.abs(car.x - focus.x) < radius && Math.abs(car.y - focus.y) < radius) {
      let spot = randomRoadPoint(world.rng, world.city);
      let guard = 0;
      while (Math.abs(spot.x - focus.x) < radius + 200 && Math.abs(spot.y - focus.y) < radius + 200 && guard++ < 20) {
        spot = randomRoadPoint(world.rng, world.city);
      }
      car.x = spot.x; car.y = spot.y;
    }
  }
  for (const ped of world.peds) {
    if (Math.abs(ped.x - focus.x) < radius && Math.abs(ped.y - focus.y) < radius) {
      const spot = randomSidewalkPoint(world.rng, world.city);
      ped.x = spot.x; ped.y = spot.y;
    }
  }
}

function runCleared(world, seconds, driver, radius) {
  const chunks = Math.round(seconds / 0.5);
  for (let c = 0; c < chunks; c++) {
    clearNearPlayer(world, radius);
    run(world, 0.5, driver);
  }
}

// Steer the player's car along a road: hold W, steer toward the road.
function roadDriver(roadX, dirY) {
  return (world) => {
    const car = world.player.car;
    if (!car) return blankInput();
    const held = new Set(['up']);
    const err = car.x - roadX;
    if (err > 12) held.add('left');
    else if (err < -12) held.add('right');
    if (dirY < 0 && car.angle > 0) held.add('left');
    return scriptedInput([...held], []);
  };
}

export function applyShot(world, shot) {
  world.state = 'play';
  if (shot === 'chase') return shotChase(world);
  if (shot === 'drive') return shotDrive(world);
  if (shot === 'street') return shotStreet(world);
  if (shot === 'start') return shotStart(world);
  return shotChase(world);
}

export function runShot(world, shot) {
  return applyShot(world, shot);
}

function shotChase(world) {
  // Sunset chase down the Gilded Mile: three stars, two police cars
  // on the player's tail, the casino glowing behind them.
  world.weather.time = 0.72;
  world.weather.kind = 'haze';
  world.cash = 2450;
  startMission(world, 5); // The Wheelman Run — a race, so the objective reads as a chase.
  const car = world.sportsCar;
  car.x = 1500; car.y = 1450; car.angle = -Math.PI / 2;
  world.player.x = car.x; world.player.y = car.y + 20;
  world.player.car = car;
  car.stolen = true;
  commitCrime(world, 3, 40);
  // Two chasers right behind.
  for (let i = 0; i < 2; i++) {
    const cop = makeCar('police', 1500 + (i === 0 ? -60 : 60), 1650 + i * 60, -Math.PI / 2, 'police', world.rng);
    cop.speed = 380;
    world.cars.push(cop);
  }
  runCleared(world, 2.2, roadDriver(1500, -1), 600);
  // Place a roadblock ahead of the chase on the next road east, in
  // frame and in front of the chase, clear of the casino's sign.
  const block = { x: 1900, y: world.player.car.y - 260, cars: [] };
  for (let i = -1; i <= 1; i++) {
    const c = makeCar('police', 1900 + i * 44, block.y, Math.PI / 2, 'police', world.rng);
    c.kind = 'roadblock';
    block.cars.push(c);
    world.cars.push(c);
  }
  world.roadblocks.push(block);
  queueDialogue(world, 'Ivy: They are all over the Mile — keep it pinned, Dante!');
}

function shotDrive(world) {
  // Morning on the water: Dante in the boat off Palm Beach, sailing
  // south along the coast — ocean to the east, sand and the city to
  // the west, a wake behind the boat.
  world.weather.time = 0.32;
  world.weather.kind = 'clear';
  world.cash = 1320;
  startMission(world, 4); // Harbor Lights — the boat job.
  const boat = world.boats[2];
  boat.x = 3120; boat.y = 700; boat.angle = Math.PI / 2;
  world.player.x = boat.x; world.player.y = boat.y;
  world.player.boat = boat;
  const driver = () => scriptedInput(['up'], []);
  run(world, 1.2, driver);
  queueDialogue(world, 'Captain Rook: The crate is out past the breakers. Steady on.');
}

function shotStreet(world) {
  // Old Town at noon: Dante on foot with the crew around him, traffic
  // and pedestrians on the street, the first job's objective on the HUD.
  world.weather.time = 0.5;
  world.weather.kind = 'clear';
  world.cash = 860;
  startMission(world, 0); // First Fare.
  world.player.x = 1100; world.player.y = 1150;
  world.player.angle = -Math.PI / 2;
  // The crew, standing with Dante.
  const crew = [
    { shirt: '#e8c93d', dx: -46, dy: 30 },
    { shirt: '#3d7ae8', dx: 46, dy: 30 },
    { shirt: '#e83db0', dx: -46, dy: -30 },
    { shirt: '#7ae83d', dx: 46, dy: -30 },
  ];
  for (const c of crew) {
    const ped = makePed(world.player.x + c.dx, world.player.y + c.dy, world.rng);
    ped.shirt = c.shirt;
    ped.wait = 99;
    world.peds.push(ped);
  }
  run(world, 1.5, () => blankInput());
  queueDialogue(world, 'Auntie Marisol: The taxi is waiting, Dante. First fare of the day.');
}

function shotStart(world) {
  // The title screen over the island at golden hour.
  world.weather.time = 0.7;
  world.weather.kind = 'haze';
  world.state = 'title';
  world.hasSave = false;
  world.saveCash = 0;
}
