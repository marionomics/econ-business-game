# Rumbo a la IPO v2: a live cookie-company simulation

Date: 2026-11-23 · Status: draft for approval · Replaces v1 (tag `v1-final`) at the same URL

## 1. Intent and why

v1 (a linear text RPG with 10 fixed decisions) works end to end, but the professor found it "not so good": too linear, no sense of running a business. v2 is **more video game than exam**: a live management simulation of a cookie manufacturer, where the student can change prices and other controllable variables **at any moment**, watches cash flow and sales come in, reads financial statements like the accountants many of them are becoming, and reacts to wildcards and a rival. The point is to **make them fail in different ways and get feedback on time**, and to require Unit 7 knowledge to play well ("that's a given").

Course content: CORE Econ *The Economy 2.0*, Unit 7 "The firm and its customers" (7.1–7.13). Section 7.7 (divided surplus) is explicitly to be incorporated.

Audience: ~12 Spanish-speaking university students, algebra level, many studying accounting. Played at home over several days, unlimited retries, results to the professor's Google Sheet (already connected in v1).

Timing (professor): **as soon as possible, built complete in one pass** (no staged MVP). No students are playing v1, so v2 simply replaces it; v1 rows and grades don't need to carry over.

## 2. Goals, non-goals, anti-goals

**Goals**
- Continuous control: prices, advertising, product launches, plant expansion, versions, at any time while time runs.
- A dashboard with financials (income statement, cash flow, simple balance), market (demand, surplus, share, rival), costs (F, MC, AC, isoprofit), products, valuation breakdown.
- Repeatable actions with a cost and a return (launching products, advertising, expanding).
- An early strategic commitment, **premium brand vs. generic high volume**, that changes the story lines.
- Wildcards (e.g. tariff) and a rival's arrival, each explained by the CFO with a chart.
- IPO = reaching a **valuation target**.
- An original sarcastic AI CFO who talks with a **typing animation**.
- Graphics: demand with surplus areas, isoprofit curves, cost curves, cash and valuation over time.
- Automatic grading to the Sheet.
- **Info icons (ⓘ) wherever possible**: textbook concepts (with the CORE Unit 7 section) and business terms students may not know (IPO, valuación, múltiplo, estado de resultados, flujo de caja, margen de contribución, etc.).

**Non-goals**
- Anti-cheat or server-side scoring (professor: a student who hacks it earns an A).
- Calculus; real accounting standards (statements are simplified, but internally consistent).
- Multiplayer; sound; a React/Next frontend (professor chose vanilla JS with the shadcn preset's look).
- Preserving v1 gameplay (v1 stays in git under tag `v1-final`).

**Anti-goals**
- A game winnable by dragging sliders until profit goes up without understanding (the rival, wildcards and questions must punish pure trial-and-error at least sometimes).
- Failures that feel arbitrary or unexplained.
- A dashboard so dense that students on phones can't play.
- Reusing GLaDOS's name, lines or likeness: the CFO is an original character in that *tone*.

## 3. Approaches considered

**Stack** (professor picked A)
| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Vanilla JS ES modules, no build, styled with the tokens of shadcn preset `b7Br6i5fU`; components and SVG charts hand-built | Same deploy as v1 (GitHub Pages), no build step; ~10 components and the charts written by hand. |
| B | Vite + React with real shadcn | Components ready-made, static site still possible; adds a build step and a React port. |
| C | Next.js + shadcn (static export or server) | What the professor first named; heaviest; server option adds hosting for anti-cheat nobody wants. |

**Time model** (professor): time runs on its own (months tick by), with pause; not turn-based.

**Grading of "failures"** (professor picked A + gallery): A = crises survived within a run count for points; B = distinct ways of going bankrupt across attempts, shown as a gallery without points.

## 4. Game design

### 4.1 World and start
- The student founds a **cookie company** (brand name typed by the student). Starting cash, one small plant (fixed cost F per month, marginal cost c per box), no products.
- **Founding commitment (story line):** *Marca premium* or *Genérico de volumen*. It sets:
  - which product templates are available (premium: high cost, low elasticity, advertising builds loyalty strongly; generic: low cost, high elasticity, advertising weak);
  - the base valuation multiple (premium higher);
  - which wildcards and CFO remarks appear (e.g. health study hits premium "artisanal" claims; a supermarket private label hits generic);
  - a costly **repositioning** action exists but is expensive and slow (*my call*: so the commitment matters but a disastrous start can be corrected).
- First action: launch the first product.

### 4.2 Time
- 1 tick = 1 month. Default speed ~4 s per month, with **pause, 1×, 2×** (*my call* on exact speeds; builder tunes). Max **36 months** (*my call*); a run takes roughly 15–25 minutes with pauses.
- **Auto-pause** when the CFO delivers an event, a question, or a game-ending warning. Changing a control does not need a pause; it applies from the next month.

### 4.3 Controls (always available)
| Control | Effect |
|---|---|
| Price per product (integer, stepper/slider) | Quantity from that product's demand; margin |
| Monthly advertising per product | Shifts demand out with diminishing returns; builds a **loyalty stock** that decays; loyalty lowers elasticity and protects against the rival |
| Launch product (choose a template within your positioning) | One-time cost + development time (e.g. 2 months) before sales; each additional product in the same segment has lower demand (saturation) |
| Discontinue product | Stops its sales and its share of costs |
| Expand plant | One-time cost; F rises, c falls (economies of scale) |
| Versions (unlocked after month 12, *my call*) | Split one product into premium/basic editions = price discrimination; captures part of the deadweight loss; costs a development fee |
| Repositioning | See 4.1 |

### 4.4 Economic model (algebra only; builder tunes numbers)
- Each product *i*: monthly linear demand `P = a_i − b_i·Q`, marginal cost `c_i` (plant-level c plus product-specific component), contribution `(P_i − c_i)·Q_i`.
- Firm: `Profit = Σ contributions − F − advertising − other expenses`; cash updates monthly. Bankruptcy when cash < 0 (*my call*: no credit line in v2; builder may add a one-month grace with a CFO warning).
- Elasticity is a property of the product/market (not controllable), shown in the dashboard as an **estimate** at the current price (`ε = P/(a−P)` for linear demand) once the student has "market research" (*my call*: available from the start or a cheap purchase; builder decides).
- Advertising: `a_i` rises with recent advertising (concave), loyalty stock rises with advertising and decays monthly.
- Rival (from month ~12–18, random per seed): sets its own prices by a rule drawn per run (e.g. undercut, match, best response). Demand for each of your products splits between you and the rival by relative price, with your loyal customers staying (generalizing CORE 7.10's loyal / comparers / price-driven segments to continuous prices).
- Surplus per product: consumer surplus, producer surplus, deadweight loss vs. pricing at MC (CORE 7.7). Versions capture part of the DWL.
- Every number shown is computed from displayed (rounded) values, as in v1.

### 4.5 Wildcards and crises
Random schedule per seed (≥ 3 crises per run guaranteed, *my call*). Each: CFO message + chart showing what moved + often a CFO question.
| Wildcard | Economic effect | Crisis? |
|---|---|---|
| Arancel al cacao | c rises (MC shock → optimal price up by half the shock for linear demand) | yes |
| Sube la renta | F rises (optimal price unchanged; the trap is to raise prices) | yes |
| Estudio de salud | demand falls (a down) for premium or generic per story line | yes |
| Recesión | all demand falls for N months | yes |
| Llega el rival | competition, more elastic residual demand | yes |
| Investigación del regulador | see 4.6 | yes |
| Viral en redes | demand up for one product | no |
| Marca blanca del súper (generic line) / Influencer premium (premium line) | story-line specific | builder decides |

**Crisis survived** = 6 months after the crisis starts, the firm is not bankrupt and the last month's profit is positive. Crises still running at month 36 count if those conditions hold at the end (*my call*).

### 4.6 Regulator storyline
- If, for several consecutive months, your market share is high **and** your markup/deadweight loss is high (thresholds tuned), the competition authority opens an **investigation** (a crisis) and the CFO explains DWL with the surplus chart.
- You get a deadline (e.g. 4 months) to reduce the DWL (lower price, versions, etc.). If you don't, a fine and/or forced divestiture of a product; repeated offense ends the run with the "El regulador te parte" ending.

### 4.7 Valuation and IPO
- Shown every month with its breakdown: `Valuación = utilidad anualizada × múltiplo` where annualized profit = last 3 months × 4 (*my call*, responsive but not one-month noise), and the multiple = base by story line, adjusted up for growth and brand/loyalty, down for thin margins or an open regulator case (exact formula: builder, but it must be explainable in two lines on screen).
- **IPO** when valuation ≥ target for 3 consecutive months (*my call*, avoids a lucky spike). The run ends with the IPO ending.
- If month 36 arrives without IPO: an ending by situation (still running, acquired offer, boutique, etc., as in v1).

### 4.8 Endings and failure gallery
- Bankruptcy endings, each with a post-mortem naming what caused it: price below MC, price war, over-expansion (launches/plant), advertising burn, ignoring a cost shock, ignoring a demand collapse, regulator breakup. (Builder may merge/add; ≥ 6 distinct.)
- Non-bankrupt endings: IPO (premium / volume story lines), reached month 36 without IPO, acquired.
- **Gallery** of endings discovered (locally + logged); no points.

### 4.9 The CFO
- An original AI character (name: builder/Claude proposes; the professor writes final copy if they want). Voice: cold, polite, passive-aggressive, darkly funny, in Mexican Spanish (tú); always economically correct in the end.
- Lives in a **chat panel**. Messages appear with a **typing animation** (tap/click to finish instantly; respects reduced-motion). Messages can embed a chart.
- Speaks on: events/wildcards, crises and their resolution, warnings (cash runway < 3 months, price below MC, DWL high), CFO questions, endings. Also occasional idle sarcasm (rate-limited so it never spams).

### 4.10 CFO questions
- Adapted from v1's bank: triggered by events and use the run's own numbers (e.g. "el arancel subió tu costo marginal $3; ¿cuánto debería subir tu precio óptimo?"). Auto-pause; MC or numeric with v1's parsing/tolerance rules (both readings of "1.250", signed elasticity accepted).
- ~6–8 per run, at least one per crisis; the answer still varies with the situation so memorizing fails.
- Wrong answer: CFO explains; the game continues.

### 4.11 Dashboard (tabs)
| Tab | Contents |
|---|---|
| Finanzas | Monthly income statement (ingresos, costo de ventas, margen de contribución, costos fijos, publicidad, utilidad); cash and cash-flow chart; simple balance (caja, planta) |
| Mercado | Per product: demand curve, your price point, shaded CS / PS / DWL (live as you move the price); market share; rival price |
| Costos | F, MC, AC curve; isoprofit curves around your current point |
| Productos | List with price/advertising controls, launch / discontinue / versions |
| Valuación | Formula breakdown, valuation over time vs. target line |

Phone: tabs + collapsible chat; desktop: dashboard and chat side by side.

### 4.12 Info icons (professor's request)
- An ⓘ next to every metric, control, chart and CFO question that involves a concept. Tapping it opens a small popover: a plain-Spanish definition (2–4 sentences, algebra only), the formula if there is one, and for textbook concepts the CORE section (e.g. "CORE 7.5"). Keyboard- and touch-accessible; never pauses the game by itself (*my call*), but the popover stays open until dismissed.
- One glossary module holds all entries (same "single place to edit" rule as the copy). Minimum coverage: every Unit 7 concept used in the game (costo marginal/medio/fijo, economías de escala, demanda, disposición a pagar, elasticidad, ingreso marginal, markup, isobeneficio, excedente del consumidor/productor, pérdida irrecuperable, discriminación de precios, diferenciación, poder de mercado, equilibrio de Nash, regulación/competencia) and every business term (IPO, valuación, múltiplo, utilidad anualizada, estado de resultados, margen de contribución, flujo de caja, balance, quiebra, arancel, marca blanca, reposicionamiento).
- The "Manual del CFO" becomes the full glossary, browsable.

## 5. Grading (shown on the first screen)

Calibration target (professor): out of ~12 students, **2–3 reach the IPO**; the rest should land around **80/100** if they understand Unit 7 and play reasonably. The builder sets the IPO target and tuning so that a simulated "competent but imperfect" player (reasonable prices, reacts to shocks, some mistakes) scores ≈ 75–85 and does **not** usually IPO, while a near-optimal player does; this is checked by simulated-player tests.

Per run, out of 100; **best run counts** (as v1):
| Component | Pts |
|---|---|
| Valuation: `50 × min(1, peak valuation / IPO target)` | 50 |
| Crises survived: `30 × survived / crises that occurred` | 30 |
| CFO questions: `20 × correct / asked` | 20 |
Gallery: no points. Bankrupt runs keep the points earned until then.

Anti-exploit rules (*my calls*, so a run can't score well without holding up over time):
- **Valuation that counts = sustained valuation**: the best value that was held for 3 consecutive months (the minimum of any 3-month window), the same rule as the IPO. A one-month spike from cutting costs doesn't count.
- **Questions**: `20 × correct / max(asked, 6)`, so answering one question and going bankrupt is worth 20/6, not 20.
- **Crises**: `30 × survived / max(occurred, 3)`; a crisis still open at bankruptcy counts as not survived; 0 crises faced = 0 points.
- Only finished runs (any ending) send a row; a run abandoned by starting a new one is not sent (as v1).

## 6. Technical design

- Vanilla JS ES modules, no build, GitHub Pages, same repo; v1 tagged `v1-final` before the replacement.
- **Look:** CSS variables copied from `docs/design/shadcn-preset-b7Br6i5fU.css` (style base-maia, base mist, indigo primary, radius 0.625rem, pill buttons), fonts Oxanium (UI) + Geist Mono (figures) from Google Fonts, Remix icons as inline SVG. Light and dark.
- **Engine:** pure, deterministic per seed (seeded RNG): `createRun(seed, meta)`, `applyAction(run, action)`, `tick(run)` (one month), `score(run)`. No DOM. Thoroughly tested (balance contract like v1: each story line can reach IPO; each crisis is survivable; each bankruptcy type reachable).
- **Loop:** UI timer calls `tick`; saves the run to localStorage every month (resume after reload, paused).
- **Charts:** hand-written SVG components (line, demand + shaded areas, isoprofit family, AC/MC).
- **Copy:** all student-facing text in one content module, as v1.
- **Results:** same Apps Script pipeline, queue-before-send, dedupe by runId. v2 rows go to a new sheet tab `Intentos v2` with v2 columns (valuation, crises, questions, story line, ending, event log). The log is a **summary** (seed, monthly price/ad per product, launches, events, answers), capped below Google Sheets' 50,000-character cell limit; exact replay is not required (*my call*: the seed plus the summary is enough to audit a suspicious run). **The professor must paste the new Code.gs and redeploy a new version** (README updated).

## 7. Left to the builder
- All numeric tuning (demands, costs, launch costs, ad response, rival rules, wildcard magnitudes, thresholds, target valuation, multiple formula) under the balance contract.
- Exact product templates per story line (names, flavors) and the CFO's name.
- Component visual details within the preset.
- Exact question bank adaptation (6–8 per run, situation-dependent).
