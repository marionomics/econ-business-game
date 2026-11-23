import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateParams } from '../js/params.js';
import { optimalPrice } from '../js/economy.js';
import { SCRIPT, initialState, decisionOptions, resolveDecision, decisionApplies, STAGE_OF } from '../js/engine.js';
import { classifyEnding, endingType } from '../js/endings.js';
import { benchmarkValue, reachableEndings } from '../js/scoring.js';

const seeds = Array.from({ length: 40 }, (_, i) => i * 104729 + 3);

function play(params, strategy) {
  let st = initialState(params);
  for (const e of SCRIPT) {
    if (e.kind !== 'decision' || !decisionApplies(st, e.id, params)) continue;
    st = resolveDecision(st, e.id, strategy(st, e.id, decisionOptions(st, e.id, params)), params);
  }
  return { state: st, ending: classifyEnding(st, params) };
}
const optimal = (st, id, o) => o[0].kind === 'precio' ? o.find(x => x.price === optimalPrice({ a: st.demand.a, c: st.c })).id
  : id === 's2_inversion' ? 'ninguna' : id === 's3_movida' ? 'nada' : id.startsWith('s3_ronda') ? 'H' : 'seguir';

const CORE7 = ['ipo_premium', 'ipo_volumen', 'ipo_duopolio', 'comprada', 'boutique', 'regulador', 'quiebra_bajo_costo'];
const reach = seeds.map(s => reachableEndings(generateParams(s)));
test('every seed: all IPO and honorable endings and below-cost bankruptcy reachable', () => {
  reach.forEach((got, i) => { for (const e of CORE7) assert.ok(got.has(e), `seed ${seeds[i]} missing ${e}`); });
});
test('overinvestment bankruptcy reachable in ≥ 80% of seeds, price war in ≥ 50%', () => {
  const share = (e) => reach.filter(g => g.has(e)).length / seeds.length;
  assert.ok(share('quiebra_sobreinversion') >= 0.8, `sobreinversion ${share('quiebra_sobreinversion')}`);
  assert.ok(share('quiebra_guerra') >= 0.5, `guerra ${share('quiebra_guerra')}`);
});
test('every seed with a reciprocating rival: optimal prices + ninguna + nada + H reaches an IPO', () => {
  for (const s of seeds) { const p = generateParams(s); if (p.rival.rule === 'best_response') continue;
    const r = play(p, optimal); assert.equal(endingType(r.ending), 'ipo', `seed ${s}: ${r.ending}`); }
});
test('every seed: always picking the below-cost price goes bankrupt by end of Stage 2', () => {
  for (const s of seeds) { const r = play(generateParams(s), (st, id, o) => o[0].kind === 'precio' ? o.find(x => x.price < st.c).id : o[0].id);
    assert.ok(r.state.bankrupt && STAGE_OF(r.state.bankruptAt) <= 2, `seed ${s}`); }
});
test('benchmark under 1500 ms per seed', () => {
  const t = Date.now(); const v = benchmarkValue(generateParams(seeds[0]));
  assert.ok(v > 0); assert.ok(Date.now() - t < 1500, `${Date.now() - t} ms`);
});
