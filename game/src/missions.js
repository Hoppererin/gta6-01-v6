// Isla Fortuna — the twelve story jobs. Dante Reyes, getaway driver,
// runs jobs for the fixer Auntie Marisol across the island, and the
// arc ends with the Fortuna heist at the Gilded Crown Casino. Each job
// is data: a name, a briefing, a reward and a list of steps. A step is
// one of:
//   enterCar {car}   — get into a named car (the mission taxi, the van…)
//   driveTo {x,y,r}  — drive (or walk) to a point
//   pickup {x,y,r}   — reach a point on foot
//   wait {x,y,r,s}   — stand at a point for s seconds
//   collect {n}      — pick up n marked items
//   loseWanted       — get the wanted level to zero
//   punch {n}        — knock down n rivals
//   boatTo {x,y,r}   — reach a point by boat
// The world steps the current job; this file only describes it.

export const MISSIONS = [
  {
    name: 'First Fare',
    giver: 'Auntie Marisol',
    brief: 'A client waits by the yellow taxi. Take them to the casino — and drive like you mean it.',
    reward: 120,
    steps: [
      { type: 'enterCar', car: 'taxi', text: 'Get in the taxi' },
      { type: 'driveTo', x: 1500, y: 430, r: 90, text: 'Drive the client to the Gilded Crown Casino' },
    ],
  },
  {
    name: 'Package Run',
    giver: 'Auntie Marisol',
    brief: 'A package waits at the Harbour Office. The Beach Bar wants it in 75 seconds. No questions.',
    reward: 180,
    timeLimit: 75,
    steps: [
      { type: 'pickup', x: 875, y: 2070, r: 70, text: 'Pick up the package at the Harbour Office' },
      { type: 'driveTo', x: 2840, y: 1150, r: 90, text: 'Deliver it to the Palm Beach Bar' },
    ],
  },
  {
    name: 'Getaway',
    giver: 'Sal the Fixer',
    brief: 'The black sports car by the plaza is yours now. Take it — and lose the law.',
    reward: 220,
    steps: [
      { type: 'enterCar', car: 'getaway', text: 'Steal the black sports car' },
      { type: 'loseWanted', text: 'Lose the police' },
    ],
  },
  {
    name: 'The Long Con',
    giver: 'Auntie Marisol',
    brief: 'A mark needs a tour of the island. Three stops, no rushing, no police. Charm them.',
    reward: 260,
    steps: [
      { type: 'driveTo', x: 1100, y: 1050, r: 80, text: 'Stop 1: Old Town Square' },
      { type: 'driveTo', x: 1100, y: 1850, r: 80, text: 'Stop 2: The Plaza' },
      { type: 'driveTo', x: 1500, y: 430, r: 90, text: 'Stop 3: The Gilded Crown Casino' },
    ],
  },
  {
    name: 'Harbor Lights',
    giver: 'Captain Rook',
    brief: 'A crate floats off Palm Beach. Take a boat from the harbour, fetch it, bring it back.',
    reward: 300,
    steps: [
      { type: 'boatTo', x: 3120, y: 1150, r: 90, text: 'Take a boat to the moored boat by the Beach Bar' },
      { type: 'boatTo', x: 3120, y: 900, r: 90, text: 'Sail out to the floating crate' },
      { type: 'boatTo', x: 740, y: 1960, r: 90, text: 'Bring the crate back to the harbour docks' },
    ],
  },
  {
    name: 'The Wheelman Run',
    giver: 'Ivy the Spotter',
    brief: 'A street race across the island. Four checkpoints, fastest time wins. The prize is real money.',
    reward: 400,
    timeLimit: 110,
    steps: [
      { type: 'driveTo', x: 2700, y: 250, r: 80, text: 'Checkpoint 1: Gilded Mile north' },
      { type: 'driveTo', x: 300, y: 650, r: 80, text: 'Checkpoint 2: Jungle road' },
      { type: 'driveTo', x: 700, y: 2150, r: 80, text: 'Checkpoint 3: Harbour bend' },
      { type: 'driveTo', x: 1500, y: 430, r: 90, text: 'Checkpoint 4: The Casino — finish!' },
    ],
  },
  {
    name: 'The Turf War',
    giver: 'Auntie Marisol',
    brief: 'Rivals are muscling in on the jungle clearing. Go remind them whose island this is.',
    reward: 320,
    steps: [
      { type: 'driveTo', x: 450, y: 700, r: 90, text: 'Reach the jungle clearing' },
      { type: 'punch', n: 3, text: 'Knock down 3 rivals' },
    ],
  },
  {
    name: 'The Scanner Job',
    giver: 'Ivy the Spotter',
    brief: 'The police leave a scanner van in Old Town. Borrow it, and do not get caught with it.',
    reward: 350,
    steps: [
      { type: 'enterCar', car: 'van', text: 'Steal the police scanner van' },
      { type: 'driveTo', x: 2450, y: 1960, r: 90, text: 'Hide it at the Airstrip Tower' },
      { type: 'loseWanted', text: 'Lose the police' },
    ],
  },
  {
    name: 'The Blackout',
    giver: 'Captain Rook',
    brief: 'The storm knocked the plaza dark. Drive the generator over — and mind the rain.',
    reward: 300,
    weather: 'rain',
    steps: [
      { type: 'driveTo', x: 1100, y: 1850, r: 90, text: 'Drive the generator to the Plaza' },
      { type: 'wait', x: 1100, y: 1850, r: 90, s: 5, text: 'Hold the plaza until the lights come back' },
    ],
  },
  {
    name: 'The Silent Partner',
    giver: 'Auntie Marisol',
    brief: 'A partner lands at the airstrip. Meet them, then walk them home to my house. Quietly.',
    reward: 380,
    steps: [
      { type: 'pickup', x: 2450, y: 1960, r: 80, text: 'Meet the partner at the Airstrip Tower' },
      { type: 'driveTo', x: 1100, y: 1050, r: 90, text: 'Bring them to Marisol’s House' },
    ],
  },
  {
    name: 'The Big Score',
    giver: 'Sal the Fixer',
    brief: 'The casino vault needs three keys. One at the casino, one at the harbour, one at the airstrip.',
    reward: 500,
    steps: [
      { type: 'collect', n: 1, at: { x: 1500, y: 430 }, text: 'Key 1: The Gilded Crown Casino' },
      { type: 'collect', n: 1, at: { x: 875, y: 2070 }, text: 'Key 2: The Harbour Office' },
      { type: 'collect', n: 1, at: { x: 2450, y: 1960 }, text: 'Key 3: The Airstrip Tower' },
    ],
  },
  {
    name: 'The Fortuna Heist',
    giver: 'Auntie Marisol',
    brief: 'Tonight we take the Crown. Get in, hold the vault, then run for the boat. The whole island will be after you.',
    reward: 1500,
    steps: [
      { type: 'pickup', x: 1500, y: 430, r: 90, text: 'Enter the Gilded Crown Casino' },
      { type: 'wait', x: 1500, y: 430, r: 90, s: 6, text: 'Hold the vault — 6 seconds' },
      { type: 'boatTo', x: 3120, y: 900, r: 100, text: 'Escape by boat to open water' },
    ],
  },
];

export function currentMission(world) {
  if (world.missionIndex >= MISSIONS.length) return null;
  return MISSIONS[world.missionIndex];
}

export function missionObjectiveText(world) {
  const m = currentMission(world);
  if (!m) return 'Free roam — the island is yours. Spend cash, hire crew, chase fares.';
  const step = m.steps[world.missionStep];
  if (!step) return m.name + ' — done';
  return m.name + ': ' + step.text;
}

export function startMission(world, index) {
  const m = MISSIONS[index];
  if (!m) return;
  world.missionIndex = index;
  world.missionStep = 0;
  world.missionTime = 0;
  world.missionFailed = false;
  world.missionDone = false;
  world.waitTimer = 0;
  world.collected = 0;
  world.punched = 0;
  world.rivalsSpawned = false;
  world.rivals = [];
  world.missionCars = {};
  // Stage the mission vehicles.
  if (m.name === 'The Scanner Job') {
    world.missionCars.van = world.van;
  }
  if (m.weather) {
    world.weather.kind = m.weather;
    world.weather.timer = 45;
  }
  queueDialogue(world, m.giver + ': ' + m.brief);
  world.audio?.missionOk();
}

export function completeMission(world) {
  const m = currentMission(world);
  if (!m) return;
  world.cash += m.reward;
  world.missionDone = true;
  world.missionIndex++;
  world.missionStep = 0;
  world.missionTime = 0;
  world.audio?.missionOk();
  world.audio?.cash();
  queueDialogue(world, 'Job done: ' + m.name + ' — $' + m.reward + ' in your pocket.');
  if (world.missionIndex >= MISSIONS.length) {
    queueDialogue(world, 'Auntie Marisol: The Crown is ours, Dante. Isla Fortuna is yours now — free roam, forever.');
  }
}

export function failMission(world, reason) {
  world.missionFailed = true;
  world.audio?.missionFail();
  queueDialogue(world, 'Job failed: ' + reason + ' — press R to retry.');
}

export function queueDialogue(world, text) {
  world.dialogue = text;
  world.dialogueTimer = 6;
  if (!world.dialogueLog) world.dialogueLog = [];
  world.dialogueLog.push(text);
}

// The one-line speech the world shows above the HUD.
export function say(world, text) {
  queueDialogue(world, text);
}
