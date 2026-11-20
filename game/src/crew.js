// Isla Fortuna — the crew. Three hires, each a person with a job and
// a bonus that changes how the island plays. Hiring is a one-off cash
// cost from the pause menu (keys 1-3); the save round-trips the roster.
//   Mara the Driver — your cars are 6% faster and grip better.
//   Leo the Lookout — police spot you slower, and the scanner pings
//     the nearest roadblock on the minimap.
//   Ada the Hacker — the wanted level decays 25% faster, and heat
//     cools 25% faster too.

import { CFG } from './config.js';

export const CREW = [
  {
    id: 'driver',
    name: 'Mara the Driver',
    role: 'Wheelwoman',
    cost: CFG.crewCosts.driver,
    blurb: 'Ex-rally driver. Your cars run 6% faster.',
    bonus: 'carTopSpeed +6%',
  },
  {
    id: 'lookout',
    name: 'Leo the Lookout',
    role: 'Spotter',
    cost: CFG.crewCosts.lookout,
    blurb: 'Eyes on every corner. Police spawn slower; roadblocks show on the map.',
    bonus: 'police spawn +1s, roadblocks marked',
  },
  {
    id: 'hacker',
    name: 'Ada the Hacker',
    role: 'Ghost',
    cost: CFG.crewCosts.hacker,
    blurb: 'She owns the island’s cameras. Wanted and heat fade 25% faster.',
    bonus: 'wanted + heat decay +25%',
  },
];

export function hireCost(id) {
  const member = CREW.find((c) => c.id === id);
  return member ? member.cost : 0;
}

export function hire(world, id) {
  const member = CREW.find((c) => c.id === id);
  if (!member) return false;
  if (world.crew[id]) return false;
  if (world.cash < member.cost) return false;
  world.cash -= member.cost;
  world.crew[id] = true;
  world.audio?.cash();
  return true;
}

export function crewCount(world) {
  return Object.keys(world.crew).filter((k) => world.crew[k]).length;
}

export function crewNames(world) {
  return CREW.filter((c) => world.crew[c.id]).map((c) => c.name);
}
