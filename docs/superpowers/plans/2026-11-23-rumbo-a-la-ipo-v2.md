# Rumbo a la IPO v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace v1 with a live, month-ticking cookie-company simulation (Spanish), with dashboard, SVG charts, an AI CFO chat with typing animation, ⓘ glossary popovers, wildcards, rival, regulator, valuation-based IPO and auto-grading to the Google Sheet.

**Architecture:** A pure deterministic simulation (`js/sim/`): `world(seed, line)` → `state`; `applyAction(state, action)`; `tick(state)` → one month + events. A run layer adds CFO messages, questions, auto-pause and scoring. Simulated-player bots in the tests calibrate the balance. A vanilla DOM UI (`js/ui/`) renders the dashboard, charts and chat with the shadcn preset's tokens, driven by a pausable clock.

**Tech Stack:** Vanilla JS ES modules (no build, no deps), HTML/CSS, Node ≥18 `node --test`, Google Apps Script, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-23-rumbo-a-la-ipo-v2-design.md` — read it in full before any task.

## Global Constraints

- All student-facing text is Spanish and lives only in `js/content/copy.js` (CFO, UI, endings, questions) and `js/content/glossary.js` (ⓘ entries).
- Algebra only. Every number shown is an integer price/quantity or money computed from displayed (rounded) values.
- `js/sim/*` is pure: no DOM, no `localStorage`, no `Math.random`, no `Date`. Randomness only from `createRng(deriveSeed(seed, label))`.
- `Run` and `State` are plain JSON (round-trip through `JSON.stringify`/`parse` unchanged).
- 1 tick = 1 month; max 36 months. IPO when the **sustained valuation** (min of the last 3 months) ≥ `world.ipoTarget`.
- Score per run, out of 100: valuation `50 × min(1, bestSustained / ipoTarget)`; crises `30 × survived / max(occurred, 3)`; questions `20 × correct / max(asked, 6)`; total rounded to 1 decimal. Bankrupt runs keep earned points; a crisis open at bankruptcy counts as not survived.
- Crisis survived = 6 months after its start the firm is not bankrupt and last month's profit > 0 (or at month 36 if earlier).
- Numeric answers: v1 rules (tolerance `max(2%·|ans|, 0.01)`, both readings of "1.250"/"1,250", elasticity accepts sign).
- Look: CSS variables from `docs/design/shadcn-preset-b7Br6i5fU.css`, fonts Oxanium + Geist Mono, pill buttons, radius 0.625rem, Remix icons as inline SVG, light + dark.
- No npm dependencies. Tests: `npm test` (`node --test "tests/*.test.js"`).
- Calibration (spec §5): near-optimal bot reaches IPO on most seeds; competent-imperfect bot averages 75–85 and IPOs on ≤ 30% of seeds.

## Review Focus

1. **Tab hidden / phone locked while time runs** → the clock pauses on `visibilitychange`; no months pass unseen, no burst of catch-up ticks. *(Task 13 clock test.)*
2. **Reload mid-run** → resumes paused at the same month with the same pending question/message; nothing re-applied twice. *(Task 12 round-trip test.)*
3. **Price/ad inputs at the extremes** (empty, 0, negative, decimals, huge, non-numeric) → clamped to valid integers, finances never NaN/Infinity. *(Task 4 test.)*
4. **Actions the firm can't afford** (launch, expand, versions, reposition with insufficient cash) → rejected with a CFO reason, never push cash negative by themselves. *(Task 4 test.)*
5. **The CFO talking while time runs** (messages arriving faster than the typing animation; reduced motion) → messages queue in order, typing never blocks the clock or controls, reduced-motion shows text instantly. *(Task 14 chat test + Task 16 browser check.)*

---

## File Structure

```
index.html                      shell; loads js/main.js
css/tokens.css                  preset variables (light/dark) + font stacks
css/app.css                     layout & components
js/rng.js  js/economy.js        (kept from v1)
js/answers.js                   parseNumber, parseNumberCandidates, gradeAnswer   (moved from v1 checkpoints)
js/clickguard.js                (kept)
js/storage.js                   (kept, keys prefixed ipo2.)
js/results.js                   v2 RESULT_COLUMNS, buildResultRow, send/flush (queue-first, kept logic)
js/config.js                    (kept: APPS_SCRIPT_URL, CLASS_CODES)
js/sim/world.js                 makeWorld(seed, line), TUNING, product TEMPLATES
js/sim/market.js                productDemand, rivalShare, quantity, surplus
js/sim/actions.js               applyAction (pure, validated)
js/sim/rival.js                 rival arrival + pricing rules
js/sim/wildcards.js             WILDCARDS, schedule, active effects
js/sim/regulator.js             watch / investigation / penalties
js/sim/valuation.js             valuation breakdown, sustained valuation
js/sim/tick.js                  tick(state, world) → { state, events }
js/sim/endings.js               ENDINGS, classifyEnding
js/sim/questions.js             question bank v2 + triggers
js/sim/score.js                 scoreRun
js/sim/run.js                   createRun, act, step, answer, isPaused reasons
js/content/copy.js              Spanish copy + fmt/money/number + describeEvent
js/content/glossary.js          GLOSSARY entries for ⓘ
js/ui/dom.js                    esc, h, icon()
js/ui/components.js             button, tabs, card, stepper, infoButton, popover, dialog
js/ui/charts.js                 lineChart, demandChart, isoprofitChart, costChart
js/ui/chat.js                   CFO chat queue + typing animation
js/ui/clock.js                  pausable month clock (injectable timers)
js/ui/dashboard.js              tabs: finanzas, mercado, costos, productos, valuacion
js/ui/screens.js                welcome, line choice, ending, gallery, glossary
js/main.js                      wiring
apps-script/Code.gs             v2 sheet tabs
tests/support/bots.js           simulated players
tests/*.test.js
```

---

### Task 1: Clean slate for v2

**Files:** Delete `js/engine.js js/endings.js js/scoring.js js/checkpoints.js js/game.js js/content.js js/params.js js/rival.js js/ui.js js/main.js css/style.css` and their tests (`engine balance scoring checkpoints game content params rival review`). Create `js/answers.js`, `tests/answers.test.js`. Modify `js/storage.js` (key prefix `ipo2.`).

**Interfaces — Produces:** `parseNumber(text) → number|null`, `parseNumberCandidates(text) → number[]`, `gradeAnswer(built, input) → boolean` (same rules as v1 `gradeCheckpoint`; `built = {kind:'mc'|'numeric', answer, absolute?: boolean}`; `absolute: true` replaces v1's ABS_ITEMS).

- [ ] **Step 1:** `git tag v1-final && git checkout -b feat/v2`.
- [ ] **Step 2:** Write `tests/answers.test.js` by porting v1's `parseNumber`, `parseNumberCandidates`, tolerance, mc grading and signed-elasticity tests to the new names (`absolute: true` for the signed case).
- [ ] **Step 3:** Run `npm test` → FAIL (module missing). **Step 4:** Create `js/answers.js` (move the v1 functions). Delete the v1 files listed above. Change storage keys to `ipo2.*`, and make sure `tests/storage.test.js` still passes (it uses only the functions). **Step 5:** `npm test` → PASS (rng, economy, answers, storage, results, clickguard tests remain; `results.test.js` may be deleted here and rewritten in Task 12 if it imports removed modules). **Step 6:** Commit `chore: clean slate for v2`.

---

### Task 2: World and product templates

**Files:** Create `js/sim/world.js` · Test `tests/world.test.js`

**Interfaces — Produces:**
```js
TUNING  // all numeric knobs, one object (tuned in Task 11)
TEMPLATES = { premium: [3 templates], generico: [3 templates] }
// template: { id, segment:'premium'|'generico', a0, b, cProd, launchCost, devMonths, adEff, loyaltyEff }
makeWorld(seed, line /* 'premium'|'generico' */) → World
World = { seed, line, startCash, plant: { F, c, expandCost, expandDF, expandDc, maxExpansions },
  templates: TEMPLATES[line] scaled by seed, saturation, ad: { decay }, loyaltyDecay,
  rival: { arrivalMonth, rule: 'undercut'|'match'|'best_response', costFactor },
  wildcards: Array<{ id, month, params }>, ipoTarget, baseMultiple,
  versionsCost, versionsUnlockMonth: 12, reposition: { cost, months },
  regulator: { shareThreshold, markupThreshold, watchMonths, deadlineMonths, fine } }
```
Template ids are stable strings (e.g. `premium_mantequilla`). Display names live in copy. Premium: higher `cProd`, lower `b`-relative elasticity at the optimum, higher `adEff`/`loyaltyEff`, higher `baseMultiple`. Generic: the opposite.

- [ ] **Step 1: Failing tests**: deterministic per (seed, line); JSON round-trip; `line` changes templates and `baseMultiple`; every template's optimal price `(a0 + c)/2` is an integer and greater than `c`; `rival.arrivalMonth ∈ [12, 18]`; the wildcard schedule (Task 6 fills ids; here just `Array.isArray`) is sorted by month; `ipoTarget > startCash`.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(sim): world and templates`.

---

### Task 3: Market

**Files:** Create `js/sim/market.js` · Test `tests/market.test.js`

**Interfaces — Produces:**
- `productDemand(product, state, world) → { a, b }`: `a = a0 × saturation^(k−1) × wildcardDemandMult(segment) × (1 + adEff·√(adStock/1000))` rounded to an integer, where k is the product's rank among active products of its segment. `b` comes from the template.
- `rivalShare(P, R, loyalty) → number ∈ [0,1]` = `loyalty + (1 − loyalty) · σ((R − P) / (0.1·R))`, with σ logistic; 1 when there's no rival (`R == null`).
- `quantity(product, state, world) → integer` = `round(quantityAt(demand, P) × rivalShare)`.
- `surplus({a,b}, P, c) → { cs, ps, dwl, qEff }` for linear demand (ps = (P − c)·Q, ignoring F).
- `elasticityAt({a}, P) → number` = `P/(a − P)`.

- [ ] **Step 1: Failing tests**: no rival → full linear quantity; equal prices + loyalty 0 → share 0.5; higher loyalty → higher share at the same prices; much cheaper rival → share → loyalty; saturation: the 2nd product of a segment has a smaller `a`; advertising raises `a` concavely (doubling ad < doubling the shift); `surplus` matches v1's Beautiful Cars numbers (`dwl = 204800` for a=40000, b=400, c=14400, P=27200); no NaN for Q=0.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(sim): market`.

---

### Task 4: Actions

**Files:** Create `js/sim/actions.js`, `js/sim/state.js` · Test `tests/actions.test.js`

**Interfaces — Produces:**
- `initialState(world) → State`:
```js
State = { month: 0, cash, F, c, line, products: [], rival: { active:false, prices:{} }, effects: [], history: [],
  crises: [], regulator: { watch:0, investigation:null, strikes:0 }, repositioning: null, expansions: 0, ended: null }
Product = { uid, templateId, segment, price, ad, adStock, loyalty, readyAt, active, versions: null | { high, low } }
```
- `applyAction(state, world, action) → { state, ok: boolean, reason?: string }`. Actions:
  `{type:'setPrice', uid, price}`, `{type:'setAd', uid, ad}`, `{type:'launch', templateId}`, `{type:'discontinue', uid}`, `{type:'expand'}`, `{type:'versions', uid, high, low}`, `{type:'reposition'}`. `reason` is a copy key (`act.noCash`, `act.locked`, `act.maxExpansions`, …).
- Validation: prices are clamped to integers in `[1, a0×2]`; ads to integers in `[0, 10× launchCost]`. Non-numeric input → `ok:false, reason:'act.badNumber'`. Launch/expand/versions/reposition require `cash ≥ cost` and charge it immediately. Versions require `month ≥ versionsUnlockMonth` and `high > low`. A new product starts at its template's optimal price, ad 0, `readyAt = month + devMonths`. `reposition` charges `reposition.cost` and sets `state.repositioning = { until: month + reposition.months, to: otherLine }`; while it runs, no launches; when `tick` reaches `until` (Task 5), `state.line` switches, the other line's templates become launchable, and existing products lose 50% loyalty (*plan call*).

- [ ] **Step 1: Failing tests**: purity (input unchanged); the Review Focus #3 table (`''`, `'abc'`, `0`, `-5`, `12.7`, `1e9` → clamped or rejected, never NaN); Review Focus #4: launch with too little cash → `ok:false`, cash unchanged; expand limited by `maxExpansions`; versions locked before month 12; discontinued product has `active:false`.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(sim): actions`.

---

### Task 5: Monthly tick (finances)

**Files:** Create `js/sim/tick.js` · Test `tests/tick.test.js`

**Interfaces — Consumes:** market, state. **Produces:** `tick(state, world) → { state, events: Event[] }` with `Event = { type, ...data }`. In this task: compute every ready, active product's P, Q and contribution (versions: two price points on the same demand curve, high-WTP buyers at the high price and the rest at the low one; capture follows CORE 7.7). Then `fixed = F`, `ads = Σ ad`, profit, cash. Update adStock (`adStock·decay + ad`) and loyalty (`+ loyaltyEff·f(ad) − loyaltyDecay`, clamped [0, 0.8]). Push a history row:
```js
{ month, revenue, cogs, contribution, fixed, ads, other, profit, cash,
  perProduct: [{ uid, P, Q, a, b, c, contribution, cs, ps, dwl, share, elasticity }] }
```
Finish a due repositioning (see Task 4). Set `ended = { reason:'bankrupt' }` when cash < 0 and emit `{type:'bankrupt'}`. Emit `{type:'end36'}` after month 36. Wildcards, rival, regulator and valuation hooks are called here but implemented in Tasks 6–9 (no-op stubs now).

- [ ] **Step 1: Failing tests**: one product at its optimal price, no rival → profit = `(P−c)Q − F − ad`, with Q from the linear demand; JSON round-trip after 12 ticks; versions earn strictly more contribution than one price at the single-price optimum; adStock decays without ads; a not-yet-ready product sells 0; bankruptcy ends the run and further ticks are no-ops; 36 ticks of a 6-product firm take < 50 ms.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(sim): monthly tick`.

---

### Task 6: Wildcards and crises

**Files:** Create `js/sim/wildcards.js` · Modify `js/sim/world.js` (schedule), `js/sim/tick.js` · Test `tests/wildcards.test.js`

**Interfaces — Produces:**
- `WILDCARDS`: ids `arancel` (c += amount, permanent), `renta` (F += amount, permanent), `salud` (demand × 0.75 for one segment for 6 months), `recesion` (all demand × 0.85 for 6 months), `viral` (one product demand × 1.3 for 3 months, not a crisis), `marca_blanca` (generic line only: generic demand × 0.8, permanent), `influencer` (premium line only: premium demand × 1.2 for 4 months, not a crisis). Each `{ id, crisis: boolean, apply(state, world, params) → state, expire? }`.
- `scheduleWildcards(rng, line) → Array<{id, month, params}>`: at least 3 crises among months 3–33 (the rival's arrival also counts as a crisis), no two within 3 months of each other.
- In `tick`: apply due wildcards, emit `{type:'wildcard', id, params}`, open `state.crises.push({ id, start })`, and resolve each crisis 6 months later (`survived = !bankrupt && lastProfit > 0`). At month 36, resolve open crises with the same rule. Emit `{type:'crisisResolved', id, survived}`.
- `wildcardDemandMult(state, segment)` and `costAdd(state)` are used by market/tick.

- [ ] **Step 1: Failing tests**: the tariff raises marginal cost and the optimal price of a template by exactly half the amount; the rent rise leaves the optimal price unchanged; a health shock lowers `a` only for its segment and expires after 6 months; every seed × line schedules ≥ 3 crises (including the rival); crisis resolution follows the rule; a crisis open at bankruptcy resolves `survived:false`.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(sim): wildcards and crises`.

---

### Task 7: Rival

**Files:** Create `js/sim/rival.js` · Modify `tick.js` · Test `tests/rival.test.js`

**Interfaces — Produces:** `rivalPrices(state, world) → { [uid]: price }`. Rules: `undercut` = `max(cRival + 1, round(0.92·P))`; `match` = P; `best_response` = argmax of the rival's profit over integer prices in `[cRival+1, P+10]` given your P (rival quantity = total − yours). `cRival = round(c_product × costFactor)`. At `arrivalMonth`: `rival.active = true`, emit `{type:'rivalArrives'}` and open a crisis `rival`.

- [ ] **Step 1: Failing tests**: before arrival, share = 1; after, share < 1; undercut never prices below `cRival + 1`; best_response beats match for the rival's profit; higher loyalty keeps a higher share against undercut.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(sim): rival`.

---

### Task 8: Regulator

**Files:** Create `js/sim/regulator.js` · Modify `tick.js` · Test `tests/regulator.test.js`

**Interfaces — Produces:** `regulatorStep(state, world) → { state, events }`. Watch increments in months where total share > `shareThreshold` **and** the average markup `(P−c)/P` > `markupThreshold`; otherwise it resets. When watch reaches `watchMonths`: open an investigation (`{start, deadline: start + deadlineMonths}`), emit `{type:'investigation'}`, open crisis `regulador`. At the deadline: if the condition still holds → fine (cash −= fine), `strikes++`, emit `{type:'fine'}`. A second strike → `ended = {reason:'regulator'}`. If the condition was cleared before the deadline → close it, emit `{type:'investigationClosed'}`.

- [ ] **Step 1: Failing tests**: a monopoly-priced high share for `watchMonths` opens an investigation; cutting the price below the markup threshold before the deadline closes it; ignoring two investigations ends the run with `reason:'regulator'`; low share never triggers it.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(sim): regulator`.

---

### Task 9: Valuation, endings, score

**Files:** Create `js/sim/valuation.js`, `js/sim/endings.js`, `js/sim/score.js` · Modify `tick.js` · Tests `tests/valuation.test.js`, `tests/score.test.js`

**Interfaces — Produces:**
- `valuation(state, world) → { annualProfit, multiple, parts: { base, growth, margin, regulator }, cash, value }`: `annualProfit = 4 × Σ last 3 months' profit`; `multiple = base × (1 + clamp(growth, −0.3, 0.5)) × marginFactor − (investigation ? 2 : 0)`, floored at 0; `value = max(0, annualProfit × multiple) + max(0, cash)`. `growth` compares the last 3 months with the previous 3. Stored per history row (`row.valuation`); `state.bestSustained` = max over months of the min of the last 3 valuations.
- IPO check in tick: `sustained ≥ ipoTarget` → `ended = { reason:'ipo' }`.
- `ENDINGS`: `ipo_premium, ipo_volumen` (type ipo) · `comprada, fin_sin_ipo` (type fin) · `regulador` (type honorable) · `quiebra_bajo_costo, quiebra_guerra, quiebra_expansion, quiebra_publicidad, quiebra_choque_costos, quiebra_demanda` (type quiebra).
- `classifyEnding(state, world) → endingId`, checked in order:
  1. ipo → by the **current** line.
  2. regulator → `regulador`.
  3. bankrupt: `bajo_costo` if any product priced below its c in the last month; `choque_costos` if a tariff or rent shock happened in the last 6 months and prices weren't raised after it; `demanda` if a health or recession shock is active; `guerra` if the rival is active and your average price fell ≥ 10% since its arrival; `expansion` if launches + expansions in the last 6 months exceeded 6 months of contribution; else `publicidad`.
  4. end36: `comprada` if last profit > 0, else `fin_sin_ipo`.
- `scoreRun(run) → { valuationPts, crisesPts, questionsPts, total, bestSustained, crises:{occurred, survived}, questions:{asked, correct} }` per Global Constraints.

- [ ] **Step 1: Failing tests**: value formula on a hand-made history; a one-month profit spike does not raise `bestSustained` (Review exploit); IPO ends the run; each bankruptcy rule on a crafted state; score anti-exploit (1 correct question → `20/6`; 0 crises → 0; open crisis at bankruptcy counts against); total rounding.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(sim): valuation, endings, score`.

---

### Task 10: Questions and the run layer

**Files:** Create `js/sim/questions.js`, `js/sim/run.js` · Tests `tests/questions.test.js`, `tests/run.test.js`

**Interfaces — Produces:**
- `QUESTIONS`: entries `{ id, trigger, applies(run), build(run, rng) → Built }` with `Built = { id, kind, promptKey, vars, options?, answer, absolute?, explanationKey }`. Triggers and items (each item's answer depends on the run's numbers or situation):
  | trigger | items |
  |---|---|
  | `launch` (first launch of each template) | `precio_optimo` (num: (a+c)/2 from shown a, c) · `utilidad_mes` (num: (P−c)Q − F share shown) |
  | `wildcard:arancel` | `arancel_precio` (num: new optimal = old + amount/2) · `arancel_mc` (mc: sube/sube_mitad/igual/baja → sube_mitad) |
  | `wildcard:renta` | `renta_precio` (mc → igual) · `renta_utilidad` (num) |
  | `wildcard:salud`/`recesion` | `demanda_precio` (num: new optimal with a lower a) · `demanda_ingreso` (mc: elastic/inelastic at your price) |
  | `rivalArrives` | `rival_lealtad` (mc: why loyalty protects share) · `rival_elasticidad` (mc: residual demand more elastic → markup down) |
  | `investigation` | `pie_calculo` (num: DWL at your price from shown a, b, c, P) · `pie_concepto` (mc) |
  | `expand` | `costo_medio` (num: AC at shown Q) · `escala` (mc) |
  | `versions` | `discriminacion` (mc: why versions raise profit and reduce DWL) |
  | `pulse` (months 6, 18, 30 if fewer than 6 asked so far) | `elasticidad` (num: P/(a−P)) · `markup` (num: (P−c)/P) |
- `createRun({ seed, line, meta }) → Run`; `act(run, action) → Run` (applyAction; on success may enqueue a question by trigger); `step(run) → Run` (one tick; turns events into `run.inbox` CFO messages and question triggers); `answer(run, input) → Run`; `pauseReasons(run) → string[]` (`'question'`, `'event'`, `'ended'`); `run.score` is set when ended. At most 1 question per trigger instance and at most 9 per run; `asked` counts questions shown.
- `run.log`: the summary log (per month: prices and ads per product; launches, events, answers), capped at 45,000 chars when stringified (older months compacted first).

- [ ] **Step 1: Failing tests**: every question builds on reachable runs from a random bot (Task 11 bots can be stubbed here with a random-action bot) with finite answers and answer ∈ options; the arancel question's answer equals the engine's optimal-price change; pulse questions make `asked ≥ 6` in any 36-month run; JSON round-trip of a run with a pending question, which continues identically (Review Focus #2); `pauseReasons` contains `'question'` while one is pending and `step` is a no-op then; the log stays under 45,000 chars after 36 months with 6 products.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(sim): questions and run layer`.

---

### Task 11: Bots, balance and calibration

**Files:** Create `tests/support/bots.js`, `tests/balance.test.js` · Modify `js/sim/world.js` (`TUNING` only)

**Interfaces — Produces** (test-only): `playRun(seed, line, bot) → run` that drives `act`/`step`/`answer` to the end. Bots:
- `optimal`: launches products while the payback is < 8 months, prices each at the profit-maximizing integer given the current demand and rival, ad at a tuned level, reacts to shocks the same month, avoids the regulator, answers correctly.
- `competent`: like optimal, but prices within ±10% of the optimum (seeded noise), reacts 2 months late, sometimes over-launches, answers 75% correctly.
- `naive`: one product, never changes the price, no ads.
- One scripted bot per bankruptcy ending (e.g. `belowCost`, `priceWar`, `overExpand`, `adBurn`, `ignoreTariff`, `ignoreDemand`).

- [ ] **Step 1: Write the balance contract** (40 seeds × 2 lines):
  - `optimal` reaches the IPO on ≥ 80% of runs per line;
  - `competent` averages a total score in [75, 85] and IPOs on ≤ 30%;
  - `naive` scores < 60;
  - `optimal` survives ≥ 80% of the crises it faces;
  - each bankruptcy ending is reached by its bot on ≥ 50% of seeds;
  - `regulador` is reachable by a bot that holds monopoly prices;
  - both lines can reach their IPO ending;
  - a full bot run takes < 300 ms.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Tune **only `TUNING`** (with scratch sweep scripts, as in v1) until it passes. If a target is unreachable, record a ruling in the ledger with the measured numbers instead of weakening silently.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(sim): balance and calibration`.

---

### Task 12: Copy, glossary, results, Apps Script

**Files:** Create `js/content/copy.js`, `js/content/glossary.js`, rewrite `js/results.js`, `apps-script/Code.gs` · Tests `tests/content.test.js`, `tests/glossary.test.js`, `tests/results.test.js`, `tests/storage.test.js` (round-trip a mid-run v2 Run)

**Interfaces — Produces:**
- `copy.js`: `T`, `fmt(key, vars)` (v1 syntax `{x}` / `{$x}`), `money`, `number`, `pct`; `describeEvent(event, run) → { text, chart?: { kind, data } }` for every event type; `describeQuestion(built, run)`; `ENDING_TEXT`; `TEMPLATE_NAMES`; `CFO_NAME`. CFO voice: original cold, passive-aggressive AI, Mexican Spanish (tú), never GLaDOS's name or lines, always ends economically correct. Idle quips are rate-limited (≤ 1 per 4 months).
- `glossary.js`: `GLOSSARY: { [term]: { title, body, formula?, core? } }` covering at least the spec §4.12 list; `glossaryTerm(id)` returns `null` for unknown ids.
- `results.js`: `RESULT_COLUMNS = ['runId','timestamp','classCode','playerId','playerName','runNumber','seed','line','endingId','monthReached','bestSustained','ipoTarget','valuationPts','crisesOccurred','crisesSurvived','crisesPts','questionsAsked','questionsCorrect','questionsPts','total','galleryCount','log']`; `buildResultRow(run, gallery)` (sanitized, playerId normalized); `sendResult` / `flushQueue` (v1 queue-first logic, unchanged).
- `Code.gs`: same as v1 but sheet `Intentos v2`, `HEADERS = RESULT_COLUMNS`, `setupBestTab` builds `Mejor intento v2` (best total per playerId, runs, best valuation, endings discovered).

- [ ] **Step 1: Failing tests**:
  - **content:** over 20 bot runs per line, every event, question, ending and UI string renders with no `⟦` (v1 technique).
  - **glossary:** every term in the §4.12 list exists with a non-empty body; every `data-term` used in `copy.js` exists.
  - **results:** the Code.gs headers equal `RESULT_COLUMNS`; the row has every column; the log is under 50,000 characters; v1's formula-injection and queue tests are ported.
  - **storage:** a v2 Run round-trips.
- [ ] **Step 2–4:** FAIL → write the copy/glossary/results → PASS. **Step 5:** Commit `feat: copy, glossary, results v2`.

---

### Task 13: UI foundation (tokens, components, clock, info popovers)

**Files:** Create `css/tokens.css`, `css/app.css`, `js/ui/dom.js`, `js/ui/components.js`, `js/ui/clock.js` · Test `tests/clock.test.js`

**Interfaces — Produces:**
- `clock.js`: `createClock({ onTick, intervalFor: (speed) => ms, setTimer, clearTimer, isHidden }) → { play(speed), pause(reason), resume(), speed, paused, handleVisibility() }`. Hidden → paused with reason `'hidden'`; becoming visible does **not** auto-resume (the student presses play); at most one tick per interval (no catch-up).
- `components.js` (string-returning + `bind(root, handlers)`): `button({label, variant:'default'|'outline'|'ghost'|'destructive', size, attrs})`, `tabs({items, active})`, `card({title, body, info})`, `stepper({id, value, min, max, step, label, info})`, `infoButton(termId)` → `<button class="info" data-term="…" aria-label="Qué es …">` with a Remix `information-line` icon, `popover(term)`, `dialog({title, body, actions})`.
- `css/tokens.css`: the variables from `docs/design/shadcn-preset-b7Br6i5fU.css`, with `.dark` replaced by `@media (prefers-color-scheme: dark) :root:not([data-theme=light])` and `:root[data-theme=dark]`; `--font-sans: 'Oxanium'`, `--font-mono: 'Geist Mono'`.
- Load the frontend-design skill before styling. Buttons are pills (`border-radius: calc(var(--radius)*2.6)`), cards use `--card` and `--border`, tabular numbers are monospace.

- [ ] **Step 1: Failing clock tests** (fake timers): play → ticks at the speed interval; pause stops them; hidden → paused with reason `'hidden'`; coming back visible stays paused; changing speed mid-interval never produces two ticks within one interval.
- [ ] **Step 2–4:** FAIL → implement → PASS. Components have no unit tests (checked in the browser in Task 16). **Step 5:** Commit `feat(ui): tokens, components, clock`.

---

### Task 14: CFO chat with typing animation

**Files:** Create `js/ui/chat.js` · Test `tests/chat.test.js`

**Interfaces — Produces:** `createChat({ root, typeSpeedCps = 40, reducedMotion, raf, now }) → { push(message), skip(), flushAll(), queueLength }` where `message = { text, chart?: svgString, kind:'event'|'warning'|'quip'|'question'|'ending' }`. Messages type out in order, one at a time; a click or `skip()` finishes the current one instantly; `reducedMotion` shows the text instantly; typing never calls into the clock. The pure helper `typedPrefix(text, elapsedMs, cps) → string` is exported for tests.

- [ ] **Step 1: Failing tests**: `typedPrefix` grows with time and caps at full text; queue order is preserved when 5 messages are pushed at once; `skip` completes the current one and moves to the next; `reducedMotion` gives the full text immediately (Review Focus #5).
- [ ] **Step 2–4:** FAIL → implement (DOM part behind a thin adapter so the logic is testable) → PASS. **Step 5:** Commit `feat(ui): cfo chat`.

---

### Task 15: SVG charts

**Files:** Create `js/ui/charts.js` · Test `tests/charts.test.js`

**Interfaces — Produces** (each returns an SVG string with `viewBox`, `role="img"` and `aria-label`; colors from CSS variables `--chart-1..5`, `--primary`, `--destructive`):
- `lineChart({ series: [{ label, points: number[] }], target?: number, height })` (cash, valuation vs target);
- `demandChart({ a, b, c, P, versions?: { high, low }, showSurplus: true })` (demand line, MC line, price point, shaded CS / PS / DWL polygons; with versions, two price steps);
- `isoprofitChart({ a, b, c, F, P })` (demand plus 3 isoprofit curves `P = c + (π + F)/Q`, the one through your point highlighted);
- `costChart({ F, c, qMax })` (AC = c + F/Q and MC).

- [ ] **Step 1: Failing tests**: each returns a well-formed `<svg …>…</svg>` string with no `NaN`/`Infinity`; `demandChart` area polygons have the expected vertices for a=100, b=1, c=20, P=60 (CS triangle (0,100)-(0,60)-(40,60) in data space); extreme inputs (P ≤ c, Q = 0) still render.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(ui): svg charts`.

---

### Task 16: Dashboard, screens, main loop

**Files:** Create `js/ui/dashboard.js`, `js/ui/screens.js`, rewrite `index.html`, `js/main.js`

**Interfaces:** `renderDashboard(root, run, uiState, handlers)` renders the top bar (firm, month, speed controls play/pause/1×/2×, cash, valuation vs target bar, each with ⓘ), the tabs from spec §4.11, and the chat panel (side by side ≥ 900px; collapsible drawer on phones). Screens: welcome (identity + grading table + ⓘ), line choice (premium / generic, explained by the CFO), ending (narration, score breakdown, send status, new-run button), gallery, glossary (the Manual). `main.js`: identity → line choice → `createRun` → clock drives `step`. It auto-pauses when `pauseReasons` is non-empty. Controls call `act` (rejections become CFO messages), save the run every month and after every action, resume a saved run paused, send at the ending once (v1 logic), and flush the queue on load. It renders only what changed: re-render the active tab and top bar each month, never rebuild the chat.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Browser check** with Chrome automation at 390 px and 1280 px, light and dark:
  - (a) play a premium run to the IPO or the end;
  - (b) play a generic run to bankruptcy and see its post-mortem;
  - (c) answer a question with "1.250";
  - (d) open 5 different ⓘ popovers;
  - (e) hide the tab while playing and confirm it paused;
  - (f) reload mid-run and confirm it resumes paused at the same month;
  - (g) confirm the typing animation and that skip works;
  - (h) confirm there's no horizontal scroll and no console errors;
  - (i) confirm a result row reaches the queue (and the Sheet, if the professor has redeployed).
- [ ] **Step 3:** `npm test` PASS. **Step 4:** Commit `feat(ui): dashboard and game loop`.

---

### Task 17: README and handoff

**Files:** Rewrite `README.md`

- [ ] **Step 1:** Write the Spanish README for v2: what it is, grading and calibration, local preview, **how to update the Apps Script** (paste the new `Code.gs`, run `setupBestTab`, Implementar → Administrar implementaciones → editar → Nueva versión, same URL), where to edit copy and glossary, auditing with the seed + log, and that v1 lives at the tag `v1-final`.
- [ ] **Step 2:** Commit `docs: readme v2`.
- [ ] **Step 3:** Merge and push only after the professor confirms (they approved pushing v1; v2 replaces the live site).
