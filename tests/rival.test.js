import { test } from 'node:test';
import assert from 'node:assert/strict';
import { myQuantity, payoffMatrix, nashEquilibria, gameType, rivalMove } from '../js/rival.js';

const seg = (loyal) => ({ N: 60, loyalShare: loyal / 60, priceDrivenShare: 20 / 60 });
const prices = { H: 36, L: 20 };

test('CORE cell: rival H, me L → 49 customers, profit 490', () => {
  assert.equal(myQuantity(seg(22), 'L', 'H'), 49);
  assert.equal(payoffMatrix(seg(22), prices, 10, 0).LH[0], 490);
});
test('CORE HH and LL payoffs', () => { const m = payoffMatrix(seg(22), prices, 10, 0);
  assert.deepEqual(m.HH, [520, 520]); assert.deepEqual(m.LL, [300, 300]); assert.deepEqual(m.HL, [286, 490]); });
test('22 loyal → coordination game, two NE', () => { const m = payoffMatrix(seg(22), prices, 10, 0);
  assert.deepEqual(nashEquilibria(m).sort(), ['HH', 'LL']); assert.equal(gameType(m), 'coordinacion'); });
test('26 loyal → H dominant', () => assert.equal(gameType(payoffMatrix(seg(26), prices, 10, 0)), 'dominante_H'));
test('14 loyal → prisoners dilemma; Wanda demand 53 when she undercuts', () => {
  assert.equal(myQuantity(seg(14), 'L', 'H'), 53);
  assert.equal(gameType(payoffMatrix(seg(14), prices, 10, 0)), 'dilema'); });
test('asymmetric costs: rival payoff uses rival cost', () => {
  const m = payoffMatrix(seg(22), prices, 4, 0, 10, 0);
  assert.equal(m.HH[0], 640); assert.equal(m.HH[1], 520); });
test('fixed cost subtracted', () => assert.equal(payoffMatrix(seg(22), prices, 10, 100).HH[0], 420));
test('rival rules', () => { const m = payoffMatrix(seg(22), prices, 10, 0);
  assert.equal(rivalMove('tit_for_tat', [], m), 'H');
  assert.equal(rivalMove('tit_for_tat', [{ me: 'L', rival: 'H' }], m), 'L');
  assert.equal(rivalMove('grim', [{ me: 'L', rival: 'H' }, { me: 'H', rival: 'L' }], m), 'L');
  assert.equal(rivalMove('grim', [{ me: 'H', rival: 'H' }], m), 'H');
  assert.equal(rivalMove('best_response', [], m), 'H');
  // coordination game: best response to L is L, to H is H
  assert.equal(rivalMove('best_response', [{ me: 'L', rival: 'H' }], m), 'L');
  assert.equal(rivalMove('best_response', [{ me: 'H', rival: 'H' }], m), 'H');
  // dilemma: best response to H is L
  assert.equal(rivalMove('best_response', [{ me: 'H', rival: 'H' }], payoffMatrix(seg(14), prices, 10, 0)), 'L');
});
