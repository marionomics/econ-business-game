# Rumbo a la IPO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Spanish, text-based business RPG exam for CORE Econ Unit 7, served as a static site, that auto-grades each run and logs it to a Google Sheet.

**Architecture:** A pure, deterministic engine (seeded params → decisions → quarters → ending) shared by the game state machine and by an exhaustive-search benchmark. A thin DOM UI renders the steps the state machine emits. Results go to a Google Apps Script web app bound to the professor's Sheet.

**Tech Stack:** Vanilla JS ES modules (no build step, no dependencies), HTML/CSS, Node ≥ 18 built-in test runner (`node --test`), Google Apps Script, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-22-econ-business-game-design.md` — read it before any task.

## Global Constraints

- All student-facing text is Spanish and lives only in `js/content.js` (one place for the professor to review).
- Algebra only: no calculus in any question, narration or manual.
- Every number shown to a student is an integer price, an integer quantity, or a money amount computed **from the displayed (rounded) values**, so a student's hand calculation matches the engine exactly.
- The engine (`js/*.js` except `ui.js`, `main.js`, `storage.js`) is pure: no DOM, no `localStorage`, no `Math.random`. All randomness comes from `createRng(seed)`.
- A `Run` object is plain JSON (round-trips through `JSON.stringify`/`JSON.parse` unchanged).
- Grading constants (spec §6): outcome IPO = 40, honorable = 20, quiebra = 0; 8 checkpoints per run × 5 pts; value pts = `20 × min(1, value / benchmark)`; bankrupt runs get 0 value pts but keep checkpoints answered; firm value = `cash + 8 × average(profit of last 2 quarters)`.
- Numeric checkpoint tolerance: correct if `|x − answer| ≤ max(0.02·|answer|, 0.01)`.
- Checkpoints never block progress; a wrong answer shows the CFO's explanation and continues.
- No npm dependencies. `package.json` exists only for `"type": "module"` and `"test": "node --test tests/"`.

## Review Focus

1. **Results can't be sent** (no network, `APPS_SCRIPT_URL` empty) → the run is queued in `localStorage`, the ending screen says it was saved locally, and the queue flushes on the next load. *(Task 9 tests.)*
2. **Tab closed or reloaded mid-run** → the student resumes exactly where they were and doesn't lose 10 minutes. The run is saved after every step. *(Task 9 storage round-trip test; Task 10 wiring.)*
3. **Numbers typed the Mexican/Spanish way**: `"$1,250"`, `"1,250.5"`, `"1.250,5"`, `" 4,5 "`, `"−3"` → parsed to the intended number, and garbage gives a "no entendí" prompt rather than a silent wrong answer. *(Task 6 `parseNumber` tests.)*
4. **Same student, different capitalization or spaces, or a second device** → the Sheet's best-run tab groups by a normalized student ID, not by run number. *(Task 9 `normalizeId` test + Apps Script.)*
5. **Double-click on the final button, or a queue flush racing a send** → no duplicate rows. Each run has a `runId`, and the Apps Script skips any `runId` already present. *(Task 9 test + Apps Script.)*

---

## File Structure

```
index.html            page shell, loads js/main.js as module
css/style.css         text-first styling, phone-first
js/rng.js             seeded PRNG
js/economy.js         demand, cost, profit, elasticity, markup, surplus — pure math
js/params.js          generateParams(seed): all per-run numbers
js/rival.js           Stage 3 segments, payoff matrix, Nash, game type, rival rules
js/engine.js          decision script, decisionOptions, resolveDecision, quarter simulation
js/endings.js         ENDINGS metadata + classifyEnding
js/scoring.js         firmValue, benchmark search, reachableEndings, scoreRun
js/checkpoints.js     checkpoint bank, slot selection, build, grade, parseNumber
js/game.js            Run state machine: createRun, currentStep, advance
js/content.js         ALL Spanish copy + fmt()
js/storage.js         localStorage: identity, run counter, current run, gallery, queue
js/results.js         RESULT_COLUMNS, buildResultRow, sendResult, flushQueue, normalizeId
js/config.js          APPS_SCRIPT_URL, CLASS_CODES
js/ui.js              DOM rendering of steps, dashboard, manual, gallery
js/main.js            wires storage + game + ui + results
apps-script/Code.gs   doPost → append row, dedupe by runId, best-run tab
tests/*.test.js       node:test suites
README.md             Spanish setup guide for the professor
package.json
```

---

### Task 1: Scaffold, RNG and economics core

**Files:**
- Create: `package.json`, `.gitignore`, `js/rng.js`, `js/economy.js`
- Test: `tests/rng.test.js`, `tests/economy.test.js`

**Interfaces:**
- Produces:
  - `createRng(seed: number) → { next(): number /*[0,1)*/, int(min, max): number /*inclusive*/, pick(arr), shuffle(arr): newArray }`. Use mulberry32.
  - `newSeed(): number` (uint32, uses `crypto.getRandomValues`; the only non-deterministic function in the engine).
  - `deriveSeed(seed: number, label: string): number`: stable hash mix, so sub-decisions get independent but deterministic streams.
  - `quantityAt({a, b}, P) → integer` = `max(0, round((a − P)/b))`
  - `profit({P, Q, c, F}) → number` = `(P − c)·Q − F`
  - `optimalPrice({a, c}) → number` = `(a + c)/2`
  - `arcElasticity(P1, Q1, P2, Q2) → number` = `−((Q2−Q1)/Q1) / ((P2−P1)/P1)` (CORE's convention: base = first point)
  - `pointElasticity({a}, P) → number` = `P/(a − P)`
  - `markupPrice(c, eps) → number` = `c·eps/(eps − 1)`
  - `averageCost({c, F}, Q) → number` = `c + F/Q`
  - `consumerSurplus({a, b}, P) → number` = `0.5 · quantityAt · (a − P)`
  - `deadweightLoss({a, b, c}, P) → number` = `0.5 · (quantityAt(c) − quantityAt(P)) · (P − c)`

- [ ] **Step 1:** `git init`. Create `package.json` `{"name":"rumbo-a-la-ipo","private":true,"type":"module","scripts":{"test":"node --test tests/"}}` and `.gitignore` (`node_modules/`, `.DS_Store`).
- [ ] **Step 2: Write failing tests**

```js
// tests/rng.test.js
test('same seed, same sequence', () => { const a = createRng(42), b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next()); });
test('int is inclusive and in range', () => { const r = createRng(1);
  const seen = new Set(); for (let i = 0; i < 2000; i++) seen.add(r.int(3, 5));
  assert.deepEqual([...seen].sort(), [3, 4, 5]); });
test('deriveSeed is stable and label-sensitive', () => {
  assert.equal(deriveSeed(7, 'x'), deriveSeed(7, 'x'));
  assert.notEqual(deriveSeed(7, 'x'), deriveSeed(7, 'y')); });
test('shuffle does not mutate input', () => { const arr = [1,2,3,4];
  createRng(3).shuffle(arr); assert.deepEqual(arr, [1,2,3,4]); });

// tests/economy.test.js — values from CORE Unit 7
test('arc elasticity matches CORE K→L example', () =>
  assert.ok(Math.abs(arcElasticity(32800, 18, 32400, 19) - 4.56) < 0.01));
test('Beautiful Cars optimum', () => {          // P = 400(100 − Q) ⇒ a = 40000, b = 400, c = 14400
  assert.equal(optimalPrice({ a: 40000, c: 14400 }), 27200);
  assert.equal(quantityAt({ a: 40000, b: 400 }, 27200), 32);
  assert.equal(profit({ P: 27200, Q: 32, c: 14400, F: 80000 }), 329600); });
test('markup rule recovers optimal price', () =>
  assert.equal(markupPrice(14400, pointElasticity({ a: 40000 }, 27200)), 27200));
test('DWL Beautiful Cars', () =>
  assert.equal(deadweightLoss({ a: 40000, b: 400, c: 14400 }, 27200), 204800));
test('quantity never negative', () => assert.equal(quantityAt({ a: 10, b: 1 }, 50), 0));
test('average cost', () => assert.equal(averageCost({ c: 14400, F: 80000 }, 10), 22400));
```

- [ ] **Step 3:** Run `npm test` → FAIL (modules missing).
- [ ] **Step 4:** Implement `js/rng.js` and `js/economy.js` with the signatures above.
- [ ] **Step 5:** Run `npm test` → PASS.
- [ ] **Step 6:** Commit `feat: rng and economics core`.

---

### Task 2: Per-run parameters

**Files:** Create `js/params.js` · Test `tests/params.test.js`

**Interfaces:**
- Consumes: `createRng`, `optimalPrice`, `quantityAt`, `profit` (Task 1).
- Produces `generateParams(seed) → Params`:

```js
Params = {
  seed,
  demand: { a, b },              // Stage 1 linear demand, P = a − bQ, per quarter
  c, F, cash0,                   // initial marginal cost, fixed cost per quarter, starting cash
  shock: { type: 'fijo' | 'marginal', amount },   // Stage 2 cost shock (F += amount | c += amount)
  roaster: { cost, dF, dc },     // 'tostadora': cash −= cost, F += dF, c −= dc
  brand:   { cost, da, dLoyal }, // 'marca': cash −= cost, a += da, loyalShare += dLoyal
  loyalty: { cost, dLoyal },     // Stage 3 'lealtad' move
  block:   { cost, dLoyal },     // Stage 3 'bloquear' move (anticompetitive)
  rival:   { name, rule: 'tit_for_tat' | 'grim' | 'best_response' },
  segments: { N, loyalBase, priceDrivenShare },   // Stage 3, CORE 7.10 structure
  ipoCash,                       // IPO threshold on final cash
}
```

Generation rule (pins niceness; the implementer tunes ranges): `c` even, 20–40; `m = a − c` a multiple of 8 in [32, 64]; `b` chosen so that `quantityAt` at `optimalPrice` is a multiple of 4 between 800 and 1600; every `cost`, `F`, `cash0`, `ipoCash` rounded to the nearest 1,000; `dc` and `da` multiples of 8 (so `a − c` stays a multiple of 8 and the optimal price stays an integer); `shock.amount` a multiple of 4 when marginal. `rival.name` is drawn from a short list in `content.js` (Task 8 provides it; until then use a placeholder array in params). `loyalBase` in [0.15, 0.30]; `dLoyal` values chosen so that brand + loyalty can turn Stage 3 into a coordination game.

- [ ] **Step 1: Write failing tests**

```js
const seeds = Array.from({ length: 300 }, (_, i) => i * 7919 + 1);
test('deterministic', () => assert.deepEqual(generateParams(5), generateParams(5)));
test('JSON-serializable', () => { const p = generateParams(9);
  assert.deepEqual(JSON.parse(JSON.stringify(p)), p); });
test('nice numbers for every seed', () => { for (const s of seeds) { const p = generateParams(s);
  assert.equal(p.c % 2, 0); assert.equal((p.demand.a - p.c) % 8, 0);
  assert.ok(Number.isInteger(optimalPrice({ a: p.demand.a, c: p.c })));
  assert.equal(quantityAt(p.demand, optimalPrice({ a: p.demand.a, c: p.c })) % 4, 0);
  for (const v of [p.F, p.cash0, p.ipoCash, p.roaster.cost, p.brand.cost]) assert.equal(v % 1000, 0);
  assert.equal(p.roaster.dc % 8, 0); assert.equal(p.brand.da % 8, 0); } });
test('optimal Stage 1 price is profitable', () => { for (const s of seeds) { const p = generateParams(s);
  const P = optimalPrice({ a: p.demand.a, c: p.c });
  assert.ok(profit({ P, Q: quantityAt(p.demand, P), c: p.c, F: p.F }) > 0); } });
test('both shock types and all rival rules occur', () => {
  const ps = seeds.map(generateParams);
  assert.deepEqual(new Set(ps.map(p => p.shock.type)), new Set(['fijo', 'marginal']));
  assert.equal(new Set(ps.map(p => p.rival.rule)).size, 3); });
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implement `js/params.js`. **Step 4:** `npm test` → PASS. **Step 5:** Commit `feat: per-run parameters`.

---

### Task 3: Stage 3 strategic game

**Files:** Create `js/rival.js` · Test `tests/rival.test.js`

**Interfaces:**
- Produces:
  - `myQuantity({N, loyalShare, priceDrivenShare}, me: 'H'|'L', rival: 'H'|'L') → integer`. CORE 7.10 rules: loyal customers (`loyalShare·N`, split evenly between the firms) buy from their firm at either price. Relative-price-sensitive customers (the rest, minus price-driven; half prefer each firm) buy from their preferred firm unless the other is strictly cheaper. Price-driven customers buy only at L, from the cheaper firm, split evenly on a tie.
  - `payoffMatrix(seg, prices: {H, L}, c, F) → { HH: [me, riv], HL: [...], LH: [...], LL: [...] }` (keys are `me+rival`; symmetric game).
  - `nashEquilibria(matrix) → Array<'HH'|'HL'|'LH'|'LL'>` (pure-strategy, weak inequality).
  - `gameType(matrix) → 'coordinacion' | 'dilema' | 'dominante_H' | 'otro'`. Coordinación = HH and LL both NE. Dilema = LL the only NE and HH pays both more than LL. Dominante_H = HH the only NE.
  - `rivalMove(rule, history: Array<{me, rival}>, matrix) → 'H'|'L'`. tit_for_tat: H first, then copy my last move. grim: H until I play L once, then L forever. best_response: H first, then the best response to my last move (ties → H).

- [ ] **Step 1: Write failing tests**

```js
// CORE 7.10: 60 customers, 22 loyal, 20 price-driven, c = 10, H = 36, L = 20
const seg = { N: 60, loyalShare: 22/60, priceDrivenShare: 20/60 };
test('CORE cell: rival H, me L → 49 customers, profit 490', () => {
  assert.equal(myQuantity(seg, 'L', 'H'), 49);
  assert.equal(payoffMatrix(seg, { H: 36, L: 20 }, 10, 0).LH[0], 490); });
test('22 loyal → coordination game, two NE', () => { const m = payoffMatrix(seg, { H: 36, L: 20 }, 10, 0);
  assert.deepEqual(nashEquilibria(m).sort(), ['HH', 'LL']); assert.equal(gameType(m), 'coordinacion'); });
test('26 loyal → H dominant', () => assert.equal(gameType(payoffMatrix(
  { N: 60, loyalShare: 26/60, priceDrivenShare: 20/60 }, { H: 36, L: 20 }, 10, 0)), 'dominante_H'));
test('14 loyal → prisoners dilemma', () => assert.equal(gameType(payoffMatrix(
  { N: 60, loyalShare: 14/60, priceDrivenShare: 20/60 }, { H: 36, L: 20 }, 10, 0)), 'dilema'));
test('rival rules', () => { const m = payoffMatrix(seg, { H: 36, L: 20 }, 10, 0);
  assert.equal(rivalMove('tit_for_tat', [], m), 'H');
  assert.equal(rivalMove('tit_for_tat', [{ me: 'L', rival: 'H' }], m), 'L');
  assert.equal(rivalMove('grim', [{ me: 'L', rival: 'H' }, { me: 'H', rival: 'L' }], m), 'L'); });
```

(If the CORE segment counts don't reproduce the 26/14 cases exactly with the 20 price-driven customers held fixed, adjust the relative-sensitive count as CORE does, keeping the total at 60. The CORE 490 cell is the hard anchor.)

- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS → **Step 5:** Commit `feat: stage 3 pricing game`.

---

### Task 4: Decision engine and endings

**Files:** Create `js/engine.js`, `js/endings.js` · Test `tests/engine.test.js`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `SCRIPT: Array<Entry>`, the fixed order of a run (spec §5.4). Entries: `{kind:'decision', id}`, `{kind:'checkpoint', slot: 's1'|'s2'|'s3'}`, `{kind:'narration', id}`, `{kind:'openText'}`. Exact order:
    ```
    narration intro
    decision s1_precio_1 · checkpoint s1 · decision s1_precio_2 · checkpoint s1 · checkpoint s1
    narration s2_intro · decision s2_inversion · narration s2_choque · checkpoint s2
    decision s2_precio_1 · checkpoint s2 · decision s2_precio_2 · checkpoint s2
    narration s3_rival · decision s3_movida · checkpoint s3
    decision s3_ronda_1 · checkpoint s3 · decision s3_ronda_2 · decision s3_ronda_3
    decision s4_oferta  (only if not IPO-eligible and not regulator)
    openText            (only if not bankrupt)
    ```
    Bankruptcy is checked after every quarter. When it happens, the remaining entries are skipped.
  - `initialState(params) → State` with `{ cash, demand, c, F, loyalShare, quarter: 0, quarters: [], investment: null, move: null, rounds: [], offer: null, bankrupt: false, bankruptAt: null }`.
  - `decisionOptions(state, decisionId, params) → Array<{ id: string, kind: 'precio'|'opcion', price?: number }>`. It must be deterministic (use `createRng(deriveSeed(params.seed, decisionId))`).
    - Price decisions (`s1_precio_*`, `s2_precio_*`): 4 integer prices on the grid `P* + j·(a−c)/8`, computed from the current state's `a` and `c`. Always include `j = 0` and exactly one `j ≤ −5` (below marginal cost). The other two come from {−2, −1, 1, 2, 3}. Shuffled.
    - `s2_inversion`: `ninguna | tostadora | marca | ambas`. `s3_movida`: `nada | lealtad | bloquear`. `s3_ronda_*`: `H | L`. `s4_oferta`: `aceptar | seguir`.
  - `resolveDecision(state, decisionId, optionId, params) → State` (new object, input untouched). Price decisions and rounds each simulate one quarter: append `{ P, Q, profit, cash }` to `quarters`, set `bankrupt` if `cash < 0`. The shock is applied when `s2_inversion` resolves, so both Stage 2 quarters see it. Stage 3 H/L prices: `H` = the current optimal monopoly price, `L` = the grid price at `j = −2`. Stage 3 quantities come from `myQuantity` with `N` scaled to the current demand. Fixed cost F is charged every quarter.
  - `isIpoEligible(state, params) → boolean` = `!bankrupt && cash ≥ ipoCash && last two quarters' profit > 0`.
  - `ENDINGS` (in `endings.js`): ids and types exactly
    `ipo_premium, ipo_volumen, ipo_duopolio` (ipo) · `comprada, boutique, regulador` (honorable) · `quiebra_bajo_costo, quiebra_guerra, quiebra_sobreinversion` (quiebra).
  - `classifyEnding(state, params) → endingId`. Rules, checked in order:
    1. If bankrupt: `quiebra_bajo_costo` if any quarter had `P < c`. Otherwise `quiebra_guerra` if ≥ 2 Stage 3 rounds had me = L. Otherwise `quiebra_sobreinversion`.
    2. If `move === 'bloquear'`: `regulador`.
    3. If IPO-eligible: `ipo_duopolio` if ≥ 2 rounds were (H, H). Otherwise by investment: `marca` → `ipo_premium`, `tostadora` → `ipo_volumen`. Otherwise (`ninguna` or `ambas`), `ipo_premium` if a majority of my rounds were H, else `ipo_volumen`.
    4. Otherwise: `comprada` if offer = `aceptar`, else `boutique`.
  - `simulate(params, choices: Record<decisionId, optionId>) → { state, ending }` runs the decision entries of SCRIPT only.

- [ ] **Step 1: Write failing tests**

```js
const p = generateParams(123);
const opt = (st, id) => decisionOptions(st, id, p);
test('price options: 4 integers, include optimum and one below cost', () => {
  const o = opt(initialState(p), 's1_precio_1').map(x => x.price);
  assert.equal(o.length, 4); assert.ok(o.every(Number.isInteger));
  assert.ok(o.includes(optimalPrice({ a: p.demand.a, c: p.c })));
  assert.equal(o.filter(x => x < p.c).length, 1); });
test('options deterministic', () =>
  assert.deepEqual(opt(initialState(p), 's1_precio_1'), opt(initialState(p), 's1_precio_1')));
test('resolveDecision is pure', () => { const s = initialState(p); const copy = structuredClone(s);
  resolveDecision(s, 's1_precio_1', opt(s, 's1_precio_1')[0].id, p); assert.deepEqual(s, copy); });
test('quarter profit uses displayed values', () => { const s0 = initialState(p);
  const o = opt(s0, 's1_precio_1')[0]; const s1 = resolveDecision(s0, 's1_precio_1', o.id, p);
  const q = s1.quarters[0]; assert.equal(q.profit, (q.P - p.c) * q.Q - p.F);
  assert.equal(s1.cash, p.cash0 + q.profit); });
test('fixed shock leaves Stage 2 optimal price unchanged; marginal raises it by half', () => { /* find a seed of
  each type; compare optimum of s2_precio_1 options vs a no-shock state */ });
test('bloquear → regulador even if IPO-eligible', () => { /* simulate optimal prices + bloquear */ });
test('below-cost prices every quarter → quiebra_bajo_costo', () => { /* simulate choosing the j≤−5 option */ });
test('ENDINGS has the 9 ids with correct types', () => {
  assert.deepEqual(ENDINGS.map(e => e.id).sort(), ['boutique','comprada','ipo_duopolio','ipo_premium',
    'ipo_volumen','quiebra_bajo_costo','quiebra_guerra','quiebra_sobreinversion','regulador']); });
```

(The commented tests must be written out in full by the implementer, with the assertion named in the test title.)

- [ ] **Step 2:** FAIL → **Step 3:** implement both files → **Step 4:** PASS → **Step 5:** Commit `feat: decision engine and endings`.

---

### Task 5: Scoring, benchmark and balance contract

**Files:** Create `js/scoring.js` · Test `tests/scoring.test.js`, `tests/balance.test.js`

**Interfaces:**
- Consumes: `SCRIPT`, `decisionOptions`, `resolveDecision`, `classifyEnding`, `isIpoEligible`, `ENDINGS`.
- Produces:
  - `firmValue(state) → number` = `cash + 8 × mean(last 2 quarters' profit)`.
  - `explore(params, visit: (state, ending) => void)` does a DFS over every option of every decision in SCRIPT and calls `visit` at each leaf. Prune at bankruptcy, where the leaf is the bankrupt state. `s4_oferta` is only branched when it applies. The tree is about 16·64·24·2 ≈ 49k leaves.
  - `benchmarkValue(params) → number` = the max `firmValue` over non-bankrupt leaves.
  - `reachableEndings(params) → Set<endingId>`.
  - `scoreRun({ ending, state, checkpoints: Array<{correct: boolean}> }, benchmark) → { outcomePts, checkpointPts, valuePts, total }`. Constants are in Global Constraints. If `benchmark ≤ 0`, a non-bankrupt run gets the full 20 value pts. A negative value gets 0. `total` is rounded to 1 decimal.

- [ ] **Step 1: Write failing tests** (`tests/scoring.test.js`)

```js
test('outcome points by ending type', () => { /* ipo_* → 40, comprada/boutique/regulador → 20, quiebra_* → 0 */ });
test('8 correct checkpoints = 40, 3 answered before bankruptcy = 15', () => { ... });
test('value pts proportional and capped', () => { /* value = benchmark/2 → 10; value > benchmark → 20 */ });
test('benchmark ≤ 0 → full value pts unless bankrupt', () => { ... });
test('bankrupt run gets 0 value pts', () => { ... });
test('firmValue = cash + 8 × mean(last two profits)', () =>
  assert.equal(firmValue({ cash: 1000, quarters: [{profit: 1}, {profit: 100}, {profit: 300}] }), 1000 + 8 * 200));
```

- [ ] **Step 2: Write the balance contract** (`tests/balance.test.js`). This is the tuning target from spec §5.6, so it fixes what "winnable" means.

```js
const seeds = Array.from({ length: 40 }, (_, i) => i * 104729 + 3);
test('every seed: all 9 endings reachable', () => { for (const s of seeds)
  assert.equal(reachableEndings(generateParams(s)).size, 9, `seed ${s}`); });
test('every seed: always picking the optimal price + ninguna + nada + H reaches an IPO', ...);
test('every seed: always picking the below-cost price goes bankrupt by end of Stage 1 or 2', ...);
test('benchmark under 1500 ms per seed', () => { const t = Date.now();
  benchmarkValue(generateParams(seeds[0])); assert.ok(Date.now() - t < 1500); });
```

- [ ] **Step 3:** `npm test` → FAIL.
- [ ] **Step 4:** Implement `js/scoring.js`. Then **tune the ranges in `js/params.js`** until `balance.test.js` passes. Do not weaken the tests. If a seed can't reach `ipo_duopolio`, raise the `dLoyal` values. If `quiebra_guerra` is unreachable, tighten `cash0`/`F`.
- [ ] **Step 5:** `npm test` → PASS. **Step 6:** Commit `feat: scoring, benchmark, balance contract`.

---

### Task 6: Checkpoint bank

**Files:** Create `js/checkpoints.js` · Test `tests/checkpoints.test.js`

**Interfaces:**
- Consumes: economy, rival, engine state.
- Produces:
  - `CONCEPTS = { s1: ['utilidad','elasticidad','optimo'], s2: ['choque','markup','escala','excedente'], s3: ['equilibrio','poder'] }`.
  - `BANK: Array<Item>` with `Item = { id, concept, applies(state, params) → boolean, build(state, params, rng) → Built }`.
  - `Built = { itemId, kind: 'mc'|'numeric', promptKey, vars, options?: Array<{id, labelKey, vars}>, answer /*option id or number*/, explanationKey }`.
  - `assignConcepts(seed) → { s1: [3 concepts], s2: [3 of the 4], s3: [2] }`. Each slot is a distinct concept and the order is shuffled by seed.
  - `buildCheckpoint(concept, state, params, seed, index) → Built` picks uniformly among the applicable items of that concept with `createRng(deriveSeed(seed, 'cp'+index))`.
  - `gradeCheckpoint(built, input) → boolean` uses the tolerance in Global Constraints.
  - `parseNumber(text) → number | null`.

The bank has 21 items. The answers below are fixed. Copy keys are named `cp.<id>.prompt`, `cp.<id>.explain`, and option labels `cp.<id>.opt.<optionId>`:

| Concept | id | Kind | Applies when | Answer |
|---|---|---|---|---|
| utilidad | `utilidad_total` | num | ≥1 quarter | last quarter's profit |
| | `utilidad_unidad` | num | ≥1 quarter | last P − c |
| | `costo_medio` | num | ≥1 quarter, Q>0 | AC = c + F/Q at last Q |
| elasticidad | `elast_arco` | num | always | arcElasticity between two survey points (grid j=0 → j=1) |
| | `elast_clasif` | mc elástica/inelástica/unitaria | always | pointElasticity at a survey price vs 1 |
| | `ingreso_direccion` | mc sube/baja/igual | always | revenue change for one grid step down from a survey price |
| optimo | `optimo_tangencia` | mc | always | "the highest-profit price is not the one that sells the most" (fixed correct option, rotating distractors) |
| | `isoprofit_comparar` | mc | always | which of 3 (P,Q) pairs gives the same profit as a reference (computed) |
| | `precio_bajo_costo` | mc | always | each extra unit sold below c raises the loss |
| choque | `choque_fijo` | mc sube/igual/baja/sube_mitad | shock fijo | igual |
| | `choque_marginal` | mc same options | shock marginal | sube_mitad |
| | `choque_utilidad` | num | always | profit at the last price with the shock applied |
| markup | `markup_precio` | num | always | markupPrice(c, ε) for ε given at the current optimum |
| | `markup_eps` | num | always | ε = P/(P − c) at the current optimum |
| | `markup_marca` / `markup_sustituto` | mc sube/baja/igual | investment includes marca / otherwise | sube / baja |
| escala | `escala_cm` | num | always | AC at a given Q with the current c, F |
| | `escala_cmg` | num | always | current c (MC after investment) |
| | `escala_retornos` | mc | always | "the fixed cost is spread over more units" |
| excedente | `excedente_consumidor` | num | ≥1 Stage 2 quarter | consumerSurplus at last P |
| | `perdida_irrecuperable` | num | ≥1 Stage 2 quarter | deadweightLoss at last P |
| equilibrio | `nash` | mc HH/LL/HH_LL/HL | always | nashEquilibria of the current matrix |
| | `tipo_juego` | mc coordinacion/dilema/dominante_H | always | gameType of the current matrix |
| | `mejor_respuesta` | mc H/L | ≥1 round | best response to the rival's last move |
| poder | `lealtad_poder` | mc | always | "more loyal customers → less elastic demand → higher price" |
| | `bloquear` / `pago_celda` | mc / num | move = bloquear / otherwise | "blocks entry: removes substitutes" / my payoff in a named cell |

All mc options are shuffled by `rng`. An mc item's distractors are misconceptions, named in its option ids (e.g. `subir_para_cubrir_fijo`).

- [ ] **Step 1: Write failing tests**

```js
test('assignConcepts: 3/3/2, distinct, deterministic', ...);
test('every concept has an applicable item in every reachable state', () => {
  /* for 20 seeds, simulate 5 random paths with createRng; at each checkpoint position of SCRIPT,
     buildCheckpoint for every concept of that slot must not throw */ });
test('choque item answer follows shock type', () => { /* fijo seed → answer 'igual'; marginal seed → 'sube_mitad' */ });
test('nash/tipo_juego answers match rival.js', ...);
test('numeric grading tolerance', () => { const b = { kind: 'numeric', answer: 1000 };
  assert.ok(gradeCheckpoint(b, 1019)); assert.ok(!gradeCheckpoint(b, 1021)); });
test('parseNumber', () => {
  for (const [s, n] of [['$1,250', 1250], ['1,250.5', 1250.5], ['1.250,5', 1250.5], [' 4,5 ', 4.5],
    ['−3', -3], ['-3', -3], ['12', 12], ['0.25', 0.25]]) assert.equal(parseNumber(s), n);
  for (const s of ['', 'abc', '1,2,3x']) assert.equal(parseNumber(s), null); });
test('a memorized mc answer is not always right', () => {
  /* over 60 seeds, for choque, markup and tipo_juego, the correct answer takes ≥ 2 distinct values */ });
```

The `parseNumber` rule: strip `$`, spaces and normalize `−` to `-`. If both `.` and `,` are present, the last one is the decimal separator. If only `,` is present with exactly 3 digits after it, it's a thousands separator. Otherwise `,` is a decimal separator.

- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS → **Step 5:** Commit `feat: checkpoint bank with run-dependent variants`.

---

### Task 7: Run state machine

**Files:** Create `js/game.js` · Test `tests/game.test.js`

**Interfaces:**
- Consumes: SCRIPT, engine, checkpoints, endings, scoring.
- Produces:
  - `createRun({ seed, playerId, playerName, firmName, classCode, runNumber }) → Run`, where `Run = { runId: \`${seed}-${Date.now()}\`, seed, params, state, cursor, meta, checkpoints: [], choices: {}, openText: null, ending: null, score: null, startedAt }`. `Date.now()` is only allowed here, in `createRun`.
  - `currentStep(run) → Step`. Step kinds:
    `{kind:'narration', id, vars}` · `{kind:'decision', id, options, vars}` · `{kind:'checkpoint', built, index}` · `{kind:'feedback', correct, built, input}` (shown after each checkpoint answer) · `{kind:'quarterResult', quarter}` (after each quarter) · `{kind:'openText'}` · `{kind:'ending', ending, score}`.
  - `advance(run, input) → Run` (pure). The input is ignored for narration, quarterResult and feedback, is an option id for a decision, raw text for a numeric checkpoint (parsed with `parseNumber`; on `null` it returns the run unchanged with `run.inputError = true`), an option id for an mc checkpoint, and text for openText.
  - On reaching the end (or bankruptcy), `advance` sets `ending = classifyEnding(...)` and `score = scoreRun(..., benchmarkValue(params))`.
  - `dashboard(run) → { cash, lastProfit, marketShare, loyalShare, stage, quarter }`.

- [ ] **Step 1: Write failing tests**

```js
test('a full random playthrough always reaches an ending with a score', () => {
  /* 50 seeds × random inputs (createRng), advance until kind === 'ending'; assert ending in ENDINGS,
     0 ≤ total ≤ 100, at most 8 checkpoints recorded, step count < 100 */ });
test('Run survives JSON round-trip at every step and continues identically', () => { ... });
test('advance does not mutate its input', ...);
test('bad numeric input sets inputError and does not consume the checkpoint', ...);
test('wrong checkpoint answer → feedback step with correct=false, then the game continues', ...);
test('bankrupt run skips openText and records checkpoints answered so far', ...);
```

- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS → **Step 5:** Commit `feat: run state machine`.

---

### Task 8: Spanish copy

**Files:** Create `js/content.js` · Test `tests/content.test.js` · Modify `js/params.js` (rival names from content)

**Interfaces:**
- Produces: `T: Record<string, string>` with `{var}` placeholders; `fmt(key, vars) → string` (missing key → `⟦key⟧`; missing var → `⟦var⟧`); `money(n) → '$12,400'`; `RIVAL_NAMES: string[]`; `MANUAL: Array<{title, body}>` (Manual del CFO: profit, AC/MC, elasticity, markup rule, isoprofit, Nash equilibrium, surplus/DWL — algebra only, citing CORE section numbers); `GRADING_INTRO` (the spec §6 table in plain Spanish, including the firm-value formula in one line).
- Voice: the CFO is slightly sarcastic and helpful (tú, Mexican Spanish). Every quarterResult explains *why* in Unit 7 terms (elastic/inelastic, fixed vs marginal, markup, loyal customers). Every ending has a closing narration (3–5 sentences) explaining which decisions led there, and every bankruptcy has a post-mortem naming the culprit decision. The openText prompt for Stage 4 uses the regulator's challenge from spec §5.4.

- [ ] **Step 1: Write failing test**: over 50 seeds × random playthroughs, collect every key and var referenced by steps (narration ids, decision/option ids, checkpoint keys, ending ids, quarterResult). Assert `fmt` never returns text containing `⟦`.
- [ ] **Step 2:** FAIL → **Step 3:** write all copy → **Step 4:** PASS → **Step 5:** Commit `feat: spanish copy`.

---

### Task 9: Storage, results and Apps Script

**Files:** Create `js/storage.js`, `js/results.js`, `js/config.js`, `apps-script/Code.gs` · Test `tests/results.test.js`, `tests/storage.test.js`

**Interfaces:**
- `storage.js`. Every function takes an optional `store` (defaults to `globalThis.localStorage`). Every read and write is wrapped in try/catch, and a failure returns a default:
  `getIdentity()/setIdentity({playerId, playerName, classCode})`, `nextRunNumber()`, `saveCurrentRun(run)/loadCurrentRun()/clearCurrentRun()`, `getGallery() → endingId[]`/`addToGallery(id)`, `enqueue(row)/dequeueAll() → row[]`.
- `results.js`:
  - `RESULT_COLUMNS` = exactly
    `['runId','timestamp','classCode','playerId','playerName','runNumber','seed','outcome','endingId','stageReached','quarterReached','checkpointItems','checkpointCorrect','checkpointPts','outcomePts','firmValue','benchmarkValue','valuePts','total','openText','galleryCount','decisionLog']`
  - `normalizeId(s) → string`: trim, lowercase, collapse inner whitespace, strip accents.
  - `buildResultRow(run, gallery) → object` keyed by RESULT_COLUMNS (`decisionLog` = JSON string of choices + quarters).
  - `sendResult(url, row, { fetchImpl = fetch, store }) → Promise<'sent'|'queued'>`. Empty url or fetch rejection → enqueue and return `'queued'`. Otherwise POST `JSON.stringify(row)` as `text/plain;charset=utf-8` with `mode: 'no-cors'` and return `'sent'`.
  - `flushQueue(url, opts) → Promise<number>` re-sends queued rows and re-queues failures.
- `config.js`: `export const APPS_SCRIPT_URL = '';` and `export const CLASS_CODES = [];` (empty = accept any code).
- `apps-script/Code.gs`: `doPost(e)`. Its `HEADERS` array is identical to `RESULT_COLUMNS`. It uses a sheet `Intentos` (creates the header row if empty), skips the row if `runId` already exists in column A, and appends otherwise. It returns `ContentService` text `ok`. `setupBestTab()` creates a sheet `Mejor intento` with a QUERY formula grouping by normalized `playerId`, showing max `total`, number of runs and distinct endings.

- [ ] **Step 1: Write failing tests**

```js
test('Code.gs HEADERS equals RESULT_COLUMNS', () => { const src = readFileSync('apps-script/Code.gs', 'utf8');
  const m = src.match(/const HEADERS = (\[[\s\S]*?\]);/); assert.deepEqual(JSON.parse(m[1].replace(/'/g, '"')), RESULT_COLUMNS); });
test('row has every column', ...);
test('normalizeId', () => assert.equal(normalizeId('  José  Pérez '), 'jose perez'));
test('empty URL → queued', async () => assert.equal(await sendResult('', row, { store: fakeStore() }), 'queued'));
test('fetch rejects → queued; flushQueue resends and empties queue', async () => { ... });
test('saveCurrentRun/loadCurrentRun round-trips a mid-run Run', ...);
test('storage functions survive a store that throws', ...);
```

- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS → **Step 5:** Commit `feat: storage, results and apps script`.

---

### Task 10: UI

**Files:** Create `index.html`, `css/style.css`, `js/ui.js`, `js/main.js`

**Interfaces:**
- Consumes: everything above. `ui.js` exports `render(root, view, handlers)` where `view` is one of `welcome | step | gallery | manual`. `main.js` owns the loop: load identity → flush queue → resume `loadCurrentRun()` or show welcome → on each input `run = advance(run, input); saveCurrentRun(run); render`. At `ending`: `addToGallery`, `sendResult`, `clearCurrentRun`, show score breakdown and "Fundar otra empresa" (new `newSeed()`).
- Load the frontend-design skill for styling. It must stay text-first, readable, and phone-first (test at 375px). Use a persistent dashboard (spec §5.1 sketch) and options as large tap targets. The "Manual del CFO" and "Finales" (gallery: unlocked endings by name, locked ones as `???`) are reachable from any screen.
- The welcome screen shows `GRADING_INTRO`, asks for name, student ID, class code and brand name, and validates the code against `CLASS_CODES` when it's non-empty.
- The final button disables itself after the first click. The ending screen says "Resultado enviado" or "Guardado en este dispositivo; se enviará la próxima vez que abras el juego".

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Serve with `python3 -m http.server 8000` and use Chrome automation to play: (a) one run to an IPO ending, (b) one to bankruptcy, (c) a reload mid-Stage 2 that resumes on the same step, (d) the gallery and manual open and close, (e) a 375px viewport has no horizontal scroll. Check the console for errors. With `APPS_SCRIPT_URL` empty, confirm the ending says "Guardado en este dispositivo".
- [ ] **Step 3:** `npm test` still PASS. **Step 4:** Commit `feat: game ui`.

---

### Task 11: README and publish

**Files:** Create `README.md`

- [ ] **Step 1:** Write the README in Spanish for the professor: what the game is, the grading table, local preview (`python3 -m http.server`), and Sheet setup (create the Sheet, Extensions → Apps Script, paste `Code.gs`, run `setupBestTab` once, Deploy → Web app, execute as *me*, access *Anyone*, copy the URL into `js/config.js`). It also covers setting `CLASS_CODES`, publishing on GitHub Pages (Settings → Pages → branch `main`, root), where to edit copy (`js/content.js`), and how to replay a suspicious run from its `seed` + `decisionLog`.
- [ ] **Step 2:** Commit `docs: readme`.
- [ ] **Step 3:** **Ask the professor before** creating the GitHub repository or pushing anything (an outward-facing action), and ask whether it should be public, which GitHub Pages on a free plan requires. Only then `gh repo create` + push + enable Pages.
