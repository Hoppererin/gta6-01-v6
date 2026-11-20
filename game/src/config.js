// Isla Fortuna — every tuning number, colour and name in one place.
// The rest of the game reads like a description of the island instead of
// a pile of magic numbers. Isla Fortuna is an invented Caribbean island:
// Fortuna City on the east shore, the Gilded Mile casino strip down its
// spine, Old Town at its heart, a fishing harbour in the south-west, Palm
// Beach and the ocean along the east edge, jungle in the west, and an
// airstrip in the south-east. Dante Reyes, getaway driver, runs twelve
// jobs for the fixer Auntie Marisol and ends them with the Fortuna heist.

export const CFG = {
  // World and view
  worldW: 3200,
  worldH: 2400,
  viewW: 1280,
  viewH: 720,

  // Roads (grid) — the city streets of Fortuna City and Old Town.
  roadXs: [300, 700, 1100, 1500, 1900, 2300, 2700],
  roadYs: [250, 650, 1050, 1450, 1850, 2150],
  roadHalf: 46, // half the asphalt width
  walkHalf: 72, // asphalt + sidewalk: blocks start beyond this

  // Coast: sand then ocean along the east edge.
  sandX: 2900,
  oceanX: 3060,

  // Harbour basin (south-west): water cut into the land, with docks.
  harbour: { x: 180, y: 1750, w: 560, h: 420 },
  // Lagoon: a shallow channel along the south edge, joining the
  // harbour basin to the ocean so boats can sail out to sea.
  lagoon: { x: 180, y: 2170, w: 3020, h: 230 },
  // Jungle (west interior) and airstrip (south-east).
  jungle: { x: 150, y: 250, w: 620, h: 900 },
  airstrip: { x: 2350, y: 1900, w: 560, h: 180 },

  // Park and plaza (block centres).
  park: { x: 1500, y: 1050, w: 340, h: 340 },
  plaza: { x: 1100, y: 1850, w: 340, h: 340 },

  // Player on foot
  walkSpeed: 175,
  runSpeed: 270,
  playerRadius: 14,
  playerHealth: 100,

  // Driving
  carAccel: 430,
  carTopSpeed: 545,
  sportsTopSpeed: 650,
  boatTopSpeed: 420,
  carReverseMax: 165,
  carTurn: 2.7,
  carBrake: 720,

  // Traffic and pedestrians
  trafficCount: 15,
  trafficSpeed: 150,
  pedCount: 44,
  pedSpeed: 55,
  pedFleeSpeed: 180,

  // Wanted: stars decay after this long clean, at most this many chasers.
  wantedDecaySeconds: 26,
  maxPoliceCars: 4,
  maxPoliceBoats: 2,
  bustHoldSeconds: 1.4,

  // Wanted heat: a 0-100 meter that lives between jobs. Every crime
  // pours heat in; it cools slowly while the player stays clean. A hot
  // player gets more roadblocks, faster police spawns and slower decay —
  // the island remembers, even after the stars are gone.
  heatMax: 100,
  heatCoolPerSecond: 0.55,
  heatHotThreshold: 55,
  heatRoadblockAt: 40,

  // Day / night: a full island day lasts this long in play.
  dayLengthSeconds: 360,

  // Side activities
  taxiFareBase: 45,
  racePrize: 300,
  doubloonCount: 8,
  doubloonReward: 150,

  // Crew hire costs (one-off) and their bonuses.
  crewCosts: { driver: 400, lookout: 350, hacker: 600 },

  // Save
  saveKey: 'isla-fortuna-save-v1',
};

// Districts, in draw order for the map legend and the minimap.
export const DISTRICTS = [
  { name: 'Gilded Mile', x: 1300, y: 250, w: 700, h: 500, colour: '#f5c542' },
  { name: 'Old Town', x: 900, y: 850, w: 900, h: 700, colour: '#e07840' },
  { name: 'Harbour', x: 150, y: 1700, w: 620, h: 460, colour: '#3f8fbf' },
  { name: 'Palm Beach', x: 2880, y: 250, w: 320, h: 1900, colour: '#f2d98c' },
  { name: 'Jungle', x: 150, y: 250, w: 620, h: 900, colour: '#3d7a3a' },
  { name: 'Airstrip', x: 2300, y: 1850, w: 620, h: 220, colour: '#8a8f96' },
];

// The island's palette: sun-soaked, warm, a little faded like a postcard.
export const PALETTE = {
  grass: '#7fae56',
  jungle: '#4a7d3f',
  sand: '#ecd28a',
  ocean: '#2e7fa8',
  oceanDeep: '#1d5f86',
  road: '#4a4a52',
  roadLine: '#e8d27a',
  sidewalk: '#9a938a',
  buildingRoof: ['#c96f4a', '#d9a05b', '#7fa3b8', '#b8574f', '#8a6fb0', '#5b8a6d'],
  buildingWall: ['#f0e2c8', '#e8cfa8', '#d8e4e0', '#f2d5b8'],
  casino: '#f5c542',
  park: '#5d9448',
  plaza: '#c9b896',
  harbourWood: '#8a6a45',
};

// Car models: name, top speed, colour, size.
export const CAR_MODELS = {
  sedan: { name: 'sedan', top: 520, colour: '#7a8ba0', w: 44, h: 22 },
  taxi: { name: 'taxi', top: 520, colour: '#f2c230', w: 44, h: 22 },
  sports: { name: 'sports', top: 650, colour: '#d43d2a', w: 46, h: 22 },
  van: { name: 'van', top: 460, colour: '#e8e4da', w: 52, h: 24 },
  pickup: { name: 'pickup', top: 500, colour: '#4a7d5a', w: 48, h: 23 },
  police: { name: 'police', top: 590, colour: '#20344d', w: 46, h: 22 },
  boat: { name: 'boat', top: 420, colour: '#e8f2f2', w: 56, h: 24 },
  policeBoat: { name: 'police boat', top: 460, colour: '#20344d', w: 56, h: 24 },
};

// Pedestrian looks: shirt colours and walking speeds.
export const PED_SHIRTS = ['#e85d3d', '#3d7ae8', '#e8c93d', '#7ae83d', '#e83db0', '#f2f2f2', '#3dd8e8'];

// Street names for flavour in dialogue and the HUD.
export const STREETS = [
  'Gilded Mile', 'Marisol Avenue', 'Palm Row', 'Harbour Road', 'Jungle Path',
  'Airstrip Lane', 'Casino Boulevard', 'Old Town Square', 'Coconut Walk',
];
