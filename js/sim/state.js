// The firm's state at the start of a run. Plain JSON.
export function initialState(world) {
  return {
    month: 0, cash: world.startCash, F: world.plant.F, line: world.line,
    products: [], nextUid: 1, expansions: 0,
    rival: { active: false, prices: {}, since: null },
    effects: [], history: [], crises: [], shocks: [],
    regulator: { watch: 0, investigation: null, strikes: 0 },
    repositioning: null, bestSustained: 0, ended: null,
  };
}
