// Balance and calibration contract (spec §5). Thresholds measured with 20 seeds per line; see ledger rulings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playRun, BOTS, BANKRUPT_BOTS, MONOPOLIST } from './support/bots.js';
import { classifyEnding, endingType } from '../js/sim/endings.js';

const seeds = Array.from({ length: 20 }, (_, i) => i * 104729 + 3);
const LINES = ['premium', 'generico'];
const cache = {};
const runs = (bot, line) => (cache[bot.name + line] ??= seeds.map((s) => playRun(s, line, bot)));
const share = (arr, f) => arr.filter(f).length / arr.length;
const mean = (arr, f) => arr.reduce((t, x) => t + f(x), 0) / arr.length;

test('optimal player reaches the IPO on most runs', () => {
  assert.ok(share(runs(BOTS.optimal, 'premium'), (r) => r.state.ended.reason === 'ipo') >= 0.6);
  assert.ok(share(runs(BOTS.optimal, 'generico'), (r) => r.state.ended.reason === 'ipo') >= 0.5);
});
test('competent player averages 75–85 overall and rarely IPOs', () => {
  const all = LINES.flatMap((l) => runs(BOTS.competent, l));
  const avg = mean(all, (r) => r.score.total); assert.ok(avg >= 75 && avg <= 85, `competent avg ${avg.toFixed(1)}`);
  for (const l of LINES) assert.ok(share(runs(BOTS.competent, l), (r) => r.state.ended.reason === 'ipo') <= 0.4, l);
});
test('naive player scores below 60', () => { for (const l of LINES) assert.ok(mean(runs(BOTS.naive, l), (r) => r.score.total) < 60, l); });
test('optimal player survives at least 80% of the crises it faces', () => {
  const all = LINES.flatMap((l) => runs(BOTS.optimal, l)).flatMap((r) => r.state.crises);
  assert.ok(all.filter((c) => c.survived).length / all.length >= 0.8);
});
test('both IPO endings are reachable', () => {
  assert.ok(runs(BOTS.optimal, 'premium').some((r) => classifyEnding(r.state) === 'ipo_premium'));
  assert.ok(runs(BOTS.optimal, 'generico').some((r) => classifyEnding(r.state) === 'ipo_volumen'));
});
const MIN_HIT = {
  quiebra_bajo_costo: { premium: 0.8, generico: 0.8 }, quiebra_publicidad: { premium: 0.8, generico: 0.8 },
  quiebra_expansion: { premium: 0.8, generico: 0.8 }, quiebra_guerra: { premium: 0.5, generico: 0.15 },
  quiebra_choque_costos: { premium: 0.3, generico: 0 }, quiebra_demanda: { premium: 0.4, generico: 0.4 },
};
for (const [ending, mins] of Object.entries(MIN_HIT)) test(`bankruptcy "${ending}" is reachable by its bot`, () => {
  for (const l of LINES) assert.ok(share(runs(BANKRUPT_BOTS[ending], l), (r) => classifyEnding(r.state) === ending) >= mins[l], `${ending} ${l}`);
});
test('the regulator breaks up a premium monopolist sometimes', () =>
  assert.ok(runs(MONOPOLIST, 'premium').some((r) => classifyEnding(r.state) === 'regulador')));
test('every run ends with a valid ending', () => {
  for (const l of LINES) for (const r of runs(BOTS.competent, l)) assert.ok(endingType(classifyEnding(r.state)));
});
test('a full bot run takes under 300 ms', () => { const t = performance.now(); playRun(99, 'premium', BOTS.optimal); assert.ok(performance.now() - t < 300); });
