// Isla Fortuna — the simulation. createWorld builds the island, the
// player, the traffic, the pedestrians, the boats and the mission
// vehicles; stepWorld advances one fixed step. The render reads this
// state; nothing here touches the DOM, so the headless smoke tests
// drive the real game. The screen state lives here too: 'title',
// 'play' or 'pause'.

import { CFG } from './config.js';
import { mulberry32, clamp, dist, range } from './random.js';
import { buildCity, collideBuildings, randomRoadPoint, randomSidewalkPoint, districtAt, routeBetween, inWater } from './city.js';
import {
  makePlayer, makeCar, makeTaxi, makeSportsCar, makeGetawayCar,
  makeBoat, makePed, spawnTraffic, spawnParked, spawnPeds, spawnBoats,
  stepTrafficCar, stepPed, stepDrivenCar, stepDrivenBoat,
  collideCars, nearestCar, nearestBoat, knockDown,
} from './entities.js';
import { commitCrime, clearWanted, stepPolice } from './police.js';
import { MISSIONS, startMission, completeMission, failMission, queueDialogue, currentMission } from './missions.js';
import { createWeather, stepWeather } from './weather.js';
import { hire } from './crew.js';

export function createWorld(seed = 7, opts = {}) {
  const rng = mulberry32(seed);
  const city = buildCity(seed);
  const world = {
    seed,
    rng,
    city,
    cityHelpers: { routeBetween },
    audio: null,
    state: 'title',
    time: 0,
    playTime: 0,
    // Player
    player: makePlayer(1100, 1150),
    cash: opts.cash ?? 150,
    // Wanted and heat
    wanted: 0,
    wantedTimer: CFG.wantedDecaySeconds,
    heat: opts.heat ?? 0,
    bustHold: 0,
    busted: false,
    bustedFine: 0,
    spawnTimer: 0,
    roadblockTimer: 8,
    roadblocks: [],
    // Mission
    missionIndex: opts.missionIndex ?? 0,
    missionStep: 0,
    missionTime: 0,
    missionFailed: false,
    missionDone: false,
    missionCars: {},
    waitTimer: 0,
    collected: 0,
    punched: 0,
    rivalsSpawned: false,
    // Crew
    crew: opts.crew || {},
    // Collectibles and side work
    doubloonsTaken: opts.doubloonsTaken ?? 0,
    fare: null,
    fareTimer: 0,
    race: null,
    event: null,
    eventTimer: 70,
    rivals: [],
    // Weather and sky
    weather: createWeather(rng),
    // Dialogue
    dialogue: 'Welcome to Isla Fortuna.',
    dialogueTimer: 5,
    dialogueLog: [],
    // Entities
    cars: [],
    boats: [],
    peds: [],
    // Save
    hasSave: false,
    saveCash: 0,
    saveMission: 0,
  };

  // Mission vehicles, parked where their jobs find them.
  world.taxi = makeTaxi(700, 650, rng);
  world.cars.push(world.taxi);
  world.sportsCar = makeSportsCar(1500, 650, rng);
  world.cars.push(world.sportsCar);
  world.getawayCar = makeGetawayCar(1100, 1850, rng);
  world.cars.push(world.getawayCar);
  world.van = makeCar('mission', 900, 1050, 0, 'van', rng);
  world.van.colour = '#e8e4da';
  world.cars.push(world.van);

  spawnTraffic(world);
  spawnParked(world);
  spawnPeds(world);
  spawnBoats(world);

  // Restore doubloons from a save.
  if (opts.doubloonsTaken) {
    for (let i = 0; i < opts.doubloonsTaken && i < city.doubloons.length; i++) {
      city.doubloons[i].taken = true;
    }
  }
  return world;
}

export function stepWorld(world, input, dt) {
  world.time += dt;
  if (world.state !== 'play') return;
  world.playTime += dt;
  stepWeather(world.weather, dt);

  const p = world.player;

  // Dialogue fades.
  if (world.dialogueTimer > 0) world.dialogueTimer -= dt;

  // ------------------------------------------------------------ on foot
  if (!p.car && !p.boat) {
    const speed = input.isDown('run') ? CFG.runSpeed : CFG.walkSpeed;
    const ax = input.axisX();
    const ay = input.axisY();
    const len = Math.hypot(ax, ay) || 1;
    if (ax !== 0 || ay !== 0) {
      const nx = p.x + (ax / len) * speed * dt;
      const ny = p.y + (ay / len) * speed * dt;
      // The player cannot walk on water — except on the wooden docks.
      const onDock = world.city.docks.some((d) => nx > d.x - 6 && nx < d.x + d.w + 6 && ny > d.y - 6 && ny < d.y + d.h + 6);
      if (!inWater(nx, ny) || onDock) {
        p.x = nx;
        p.y = ny;
      }
      p.angle = Math.atan2(ay, ax);
      p.running = input.isDown('run');
    }
    p.x = clamp(p.x, 40, CFG.worldW - 40);
    p.y = clamp(p.y, 40, CFG.worldH - 40);
    collideBuildings(world.city, p, p.radius);

    // Punch.
    if (p.punchCooldown > 0) p.punchCooldown -= dt;
    if (input.wasPressed('punch') && p.punchCooldown <= 0) {
      p.punching = 0.28;
      p.punchCooldown = 0.45;
      world.audio?.punch();
      const reach = 46;
      for (const ped of world.peds) {
        if (ped.knocked > 0) continue;
        if (dist(p.x, p.y, ped.x, ped.y) < reach) {
          knockDown(world, ped);
          if (ped.rival) {
            world.punched++;
            queueDialogue(world, 'Rival down — ' + world.punched + ' of 3.');
          } else {
            commitCrime(world, 0, 6);
            ped.fleeing = true;
          }
          break;
        }
      }
    }
    if (p.punching > 0) p.punching -= dt;

    // Enter a car or a boat.
    if (input.wasPressed('enter')) {
      const car = nearestCar(world, p.x, p.y, 62);
      const boat = nearestBoat(world, p.x, p.y, 78);
      if (car) {
        enterCar(world, car);
      } else if (boat) {
        p.boat = boat;
        boat.kind = 'boat';
        world.audio?.splash();
        queueDialogue(world, 'On the water. Steer with W A S D.');
      }
    }

    // Doubloons.
    for (const d of world.city.doubloons) {
      if (!d.taken && dist(p.x, p.y, d.x, d.y) < 30) {
        d.taken = true;
        world.doubloonsTaken++;
        world.cash += CFG.doubloonReward;
        world.audio?.pickup();
        queueDialogue(world, 'Golden doubloon! +$' + CFG.doubloonReward + ' (' + world.doubloonsTaken + '/' + CFG.doubloonCount + ')');
      }
    }
  } else if (p.car) {
    // ------------------------------------------------------------ driving
    stepDrivenCar(world, p.car, input, dt);
    if (input.wasPressed('enter')) {
      p.x = p.car.x + Math.cos(p.car.angle + Math.PI / 2) * 34;
      p.y = p.car.y + Math.sin(p.car.angle + Math.PI / 2) * 34;
      p.car = null;
      world.audio?.engineOff();
    }
    if (input.wasPressed('horn')) world.audio?.horn();
    if (p.car) world.audio?.engine(Math.abs(p.car.speed) / p.car.model.top);
    // Hitting a pedestrian while driving is a crime. The hit zone is
    // the car's own footprint (an oriented rectangle), not a circle —
    // a pedestrian beside the car is not run over.
    if (p.car) {
      for (const ped of world.peds) {
        if (ped.knocked > 0) continue;
        const dx = ped.x - p.car.x;
        const dy = ped.y - p.car.y;
        const fwd = dx * Math.cos(p.car.angle) + dy * Math.sin(p.car.angle);
        const lat = -dx * Math.sin(p.car.angle) + dy * Math.cos(p.car.angle);
        if (Math.abs(fwd) < 30 && Math.abs(lat) < 16 && Math.abs(p.car.speed) > 60) {
          knockDown(world, ped);
          ped.fleeing = false;
          commitCrime(world, 1, 14);
          world.audio?.crash();
          p.car.speed *= 0.6;
        }
      }
    }
  } else if (p.boat) {
    // ------------------------------------------------------------ boating
    stepDrivenBoat(world, p.boat, input, dt);
    if (input.wasPressed('enter')) {
      // Step ashore only near the docks or the beach.
      const nearDock = world.city.docks.some((d) => dist(p.boat.x, p.boat.y, d.x, d.y) < 110);
      const nearBeach = p.boat.x > CFG.sandX - 60;
      if (nearDock || nearBeach) {
        p.x = clamp(p.boat.x - 40, 60, CFG.worldW - 60);
        p.y = p.boat.y;
        p.boat = null;
        world.audio?.engineOff();
      }
    }
    world.audio?.engine(p.boat ? Math.abs(p.boat.speed) / CFG.boatTopSpeed : 0);
  }

  // ------------------------------------------------------------ traffic
  for (const car of world.cars) {
    if (car.kind === 'traffic') stepTrafficCar(world, car, dt);
  }
  for (const ped of world.peds) stepPed(world, ped, dt);

  // Car-vs-car collisions (not for the police chasers, they shove).
  for (let i = 0; i < world.cars.length; i++) {
    for (let j = i + 1; j < world.cars.length; j++) {
      const a = world.cars[i];
      const b = world.cars[j];
      if (a.kind === 'police' || b.kind === 'police') continue;
      if (dist(a.x, a.y, b.x, b.y) < 34) collideCars(a, b);
    }
  }

  // ------------------------------------------------------------ police
  stepPolice(world, dt);

  // ------------------------------------------------------------ mission
  stepMission(world, dt);

  // ------------------------------------------------------------ side work
  stepSideWork(world, dt);

  // ------------------------------------------------------------ events
  stepEvents(world, dt);

  // ------------------------------------------------------------ health
  if (p.health <= 0) {
    p.health = CFG.playerHealth;
    world.cash = Math.max(0, world.cash - 100);
    clearWanted(world);
    p.x = 1100;
    p.y = 1050;
    p.car = null;
    p.boat = null;
    queueDialogue(world, 'You woke up at the Old Town clinic. -$100. Be careful out there.');
  }
}

function enterCar(world, car) {
  const p = world.player;
  if (car.kind === 'police' || car.kind === 'roadblock') return;
  p.car = car;
  const wasParked = car.kind === 'parked';
  car.kind = wasParked ? 'player' : car.kind;
  // Stealing a car is a crime — once per car, not every time you get in.
  if (!car.stolen) {
    car.stolen = true;
    if (car === world.taxi || car === world.getawayCar || car === world.van) {
      commitCrime(world, car === world.getawayCar ? 2 : 1, 14);
      queueDialogue(world, 'That car was not yours. The law noticed.');
    } else if (wasParked) {
      commitCrime(world, 1, 10);
    }
  }
  world.audio?.engine(0.1);
}

function stepMission(world, dt) {
  const m = currentMission(world);
  if (!m) return;
  if (world.missionFailed || world.missionDone) return;
  world.missionTime += dt;
  if (m.timeLimit && world.missionTime > m.timeLimit) {
    failMission(world, 'Out of time on ' + m.name);
    return;
  }
  const step = m.steps[world.missionStep];
  if (!step) { completeMission(world); return; }
  const p = world.player;

  switch (step.type) {
    case 'enterCar': {
      const want = step.car === 'taxi' ? world.taxi : step.car === 'getaway' ? world.getawayCar : world.van;
      if (p.car === want) advance(world);
      break;
    }
    case 'driveTo': {
      const at = p.car || p.boat || p;
      if (dist(at.x, at.y, step.x, step.y) < step.r) advance(world);
      break;
    }
    case 'pickup': {
      if (!p.car && !p.boat && dist(p.x, p.y, step.x, step.y) < step.r) advance(world);
      break;
    }
    case 'wait': {
      const at = p.car || p.boat || p;
      if (dist(at.x, at.y, step.x, step.y) < step.r) {
        world.waitTimer += dt;
        if (world.waitTimer >= step.s) { world.waitTimer = 0; advance(world); }
      } else {
        world.waitTimer = 0;
      }
      break;
    }
    case 'collect': {
      if (!p.car && !p.boat && dist(p.x, p.y, step.at.x, step.at.y) < 70) {
        world.collected++;
        world.audio?.pickup();
        advance(world);
      }
      break;
    }
    case 'loseWanted': {
      if (world.wanted === 0) advance(world);
      break;
    }
    case 'punch': {
      if (world.punched >= step.n) advance(world);
      break;
    }
    case 'boatTo': {
      if (p.boat && dist(p.boat.x, p.boat.y, step.x, step.y) < step.r) advance(world);
      break;
    }
    default:
      break;
  }

  // The Turf War spawns its rivals when the step starts, once per attempt.
  if (m.name === 'The Turf War' && world.missionStep === 1 && !world.rivalsSpawned) {
    world.rivalsSpawned = true;
    world.rivals = [];
    for (let i = 0; i < 3; i++) {
      const ped = makePed(450 + i * 50, 700 + (i % 2) * 60, world.rng);
      ped.rival = true;
      ped.shirt = '#3a3a3a';
      world.rivals.push(ped);
      world.peds.push(ped);
    }
    queueDialogue(world, 'Three rivals. Handle them.');
  }
}

function advance(world) {
  world.missionStep++;
  world.audio?.pickup();
  const m = currentMission(world);
  if (m && world.missionStep >= m.steps.length) completeMission(world);
}

function stepSideWork(world, dt) {
  const p = world.player;
  // Taxi fares: while driving the taxi between jobs, fares appear.
  if (p.car === world.taxi && !world.fare && currentMission(world) === null) {
    world.fareTimer += dt;
    if (world.fareTimer > 6) {
      const spot = randomRoadPoint(world.rng, world.city);
      world.fare = { x: spot.x, y: spot.y, pay: CFG.taxiFareBase + Math.floor(world.rng() * 40) };
      world.fareTimer = 0;
    }
  }
  if (world.fare && p.car === world.taxi && dist(p.car.x, p.car.y, world.fare.x, world.fare.y) < 80) {
    world.cash += world.fare.pay;
    world.audio?.cash();
    queueDialogue(world, 'Fare paid: +$' + world.fare.pay);
    world.fare = null;
  }
  // Street race: a timed checkpoint pays $150.
  if (world.race && dist(p.car ? p.car.x : p.x, p.car ? p.car.y : p.y, world.race.x, world.race.y) < 80) {
    world.cash += 150;
    world.audio?.cash();
    queueDialogue(world, 'Race checkpoint! +$150');
    world.race = null;
  }
  if (world.race) {
    world.race.timer -= dt;
    if (world.race.timer <= 0) world.race = null;
  }
}

function stepEvents(world, dt) {
  world.eventTimer -= dt;
  if (world.eventTimer > 0 || currentMission(world) !== null) return;
  world.eventTimer = 75 + world.rng() * 45;
  const roll = world.rng();
  if (roll < 0.4) {
    // Street race: a checkpoint appears for 30 seconds.
    const spot = randomRoadPoint(world.rng, world.city);
    world.race = { x: spot.x, y: spot.y, timer: 30 };
    world.event = 'Street race! Reach the gold marker in 30 seconds for $150.';
    queueDialogue(world, world.event);
    world.audio?.scanner();
  } else if (roll < 0.7) {
    // Police raid: a sweep in a random district.
    const d = districtAt(1100 + world.rng() * 1200, 650 + world.rng() * 1200);
    world.event = 'Police raid in ' + d + ' — stay clear or stay quiet.';
    commitCrime(world, 0, 8);
    queueDialogue(world, world.event);
  } else {
    // Blackout: the rain rolls in and the lights go down.
    world.weather.kind = 'rain';
    world.weather.timer = 30;
    world.event = 'Blackout rolling in — rain across the island.';
    queueDialogue(world, world.event);
  }
}

export function saveSnapshot(world) {
  return {
    cash: world.cash,
    missionIndex: world.missionIndex,
    crew: world.crew,
    doubloonsTaken: world.doubloonsTaken,
    heat: Math.round(world.heat),
  };
}

export function retryAfterArrest(world) {
  world.busted = false;
  world.bustedFine = 0;
  world.player.x = 1100;
  world.player.y = 1050;
  world.player.car = null;
  world.player.boat = null;
  world.player.health = CFG.playerHealth;
  world.state = 'play';
  const m = currentMission(world);
  if (m) startMission(world, world.missionIndex);
}

export function retryFailedMission(world) {
  world.missionFailed = false;
  world.missionTime = 0;
  world.missionStep = 0;
  world.waitTimer = 0;
  world.collected = 0;
  world.punched = 0;
  world.rivalsSpawned = false;
  world.rivals = [];
  world.wanted = 0;
  world.heat = Math.max(0, world.heat - 20);
  world.state = 'play';
  const m = currentMission(world);
  if (m) startMission(world, world.missionIndex);
}

export { hire };
