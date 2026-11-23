# Rumbo a la IPO v2.1 — Tutorial, mini-tutorials, actionable warnings, ES/EN

Date: 2026-11-23 · Status: draft for approval · Builds on `2026-11-23-rumbo-a-la-ipo-v2-design.md` (live v2)

## 1. Intent and why

The professor played v2 and lost immediately "without even knowing what I could and couldn't do". Students need a **first win**: M.A.R.G.E.N. must give a tour, tell them what to do, walk them through launching the first product, let them lose in the first selling month, guide the diagnosis and the fix, and see them recover the next month. Other activities need the same just-in-time teaching, and every warning must say **what to do and where to look**. The game must also be playable in **English**.

Findings from the live v2 (seed 7, premium): launching 3 products at once bankrupts in month 1 with no warning; one product never re-priced falls from $260k to $12k by month 8; the greeting explains everything in one message and then the clock waits for the student to guess.

## 2. Goals, non-goals, anti-goals

**Goals**
- A guided first-run tutorial (5 steps, §4.1) that ends with a profitable month for a student who follows it.
- First-time mini-tutorials (§4.2) and actionable warnings with diagnosis + navigation buttons (§4.3).
- Spanish and English for every student-facing string (§5).

**Non-goals**
- A separate practice mode or a protected run: the tutorial lives inside the real, graded run.
- Changing the economics, grading or calibration of v2 (except what the tutorial needs, §4.1).
- A new Sheet column (no Code.gs redeploy needed).

**Anti-goals**
- A tutorial that plays itself or can't be failed: a student who ignores it can go bankrupt (professor: "that's learning too").
- Walls of text: each tutorial message ≤ 3 short sentences, one action at a time.
- Machine-translated English: the CFO's sarcastic tone and CORE terminology must survive.

## 3. Approaches (professor picked A for both)

| Topic | A (chosen) | B |
|---|---|---|
| Tutorial | Scripted state inside the run (pure sim layer): current step + completion conditions; "waiting for a tutorial step" is a pause reason; the UI only highlights what the step says. Testable with bots, survives reload, reused by mini-tutorials and warnings. | UI-only tour checking the DOM: faster to write, not testable, breaks with layout changes and reloads. |
| Languages | Two copy files and two glossary files with identical keys; a test enforces parity. | Browser machine translation: loses tone and terminology. |

## 4. Design

### 4.1 First-run tutorial (professor approved the flow)
Runs on the student's **first run only** (flag stored locally); afterwards the strategy screen shows **"Repetir el tutorial / Replay the tutorial"**, which runs it again in the next run.

| Step | Time | M.A.R.G.E.N. says / does | Advances when |
|---|---|---|---|
| 1 Tour | frozen | Short tour (3–4 messages, each with a highlight): cash, valuation + IPO target, tabs, chat, ⓘ icons. A "Siguiente / Next" button per message. | Student clicks through |
| 2 Launch | frozen | "Go to Products and launch ONE cookie." [Ir a Productos]. Highlights the launch cards. A second launch during the tutorial is **rejected** with an explanation (cash + development months). | First launch succeeds |
| 3 Development | runs | "It's in development for N months; we pay fixed costs without selling. Losing money now is normal. Press Continue." Highlights Continue. | First month with sales of the product |
| 4 Diagnose | frozen | Reports the story so far: "we lost $X while developing; now we sell and earn $Y, but at the optimal price we'd earn $Z — money left on the table" (professor chose this framing, option B: the first selling month is usually profitable but below optimum). [Ir a Mercado]; highlights demand line, price point and MC. Asks the graded `precio_optimo` question **without teaching the formula first** (professor chose: teach after); it counts as a normal question. | Question answered (right or wrong; the feedback shows (a+c)/2 with the numbers) |
| 5 Fix | frozen until price set | "Set the price I just showed you in Products." [Ir a Productos]; highlights the price stepper. | Price set within ±5% of the optimum → time runs |
| End | runs | Next month: if profit rose versus the diagnose month → "Primer triunfo / First win" (shows the increase) and the tutorial closes; mini-tutorials and free play begin. Otherwise → one diagnostic hint (price vs. optimum) and the tutorial closes anyway. | — |

- Ignoring is allowed: in step 3+ time runs; if the student never fixes the price the tutorial stays at step 5 with the price stepper highlighted and time **running** (*my call*: step 5 freezes time only until the student either sets the price or presses Continue explicitly), so bankruptcy remains possible.
- **First win (professor: option B):** no economics change. Measured by the builder check: with v2 numbers every template is already profitable in its first selling month at the neutral launch price, and more so at the optimum. A test must confirm, for every seed and both lines, that moving from the launch price to the optimum raises the next month's profit when no shock hits.
- **Crises during the tutorial (my call):** in a tutorial run no wildcard is scheduled before month 6; earlier ones are shifted to month ≥ 6 keeping order and the 3-month spacing (they still count for grading).
- The `precio_optimo` question in step 4 replaces the normal launch-triggered question for the first product (no double questions).

### 4.2 First-time mini-tutorials (once per student, stored locally)
Each: auto-pause, ≤3 sentences, one highlight, one navigation button, "Entendido / Got it" to continue.

| Trigger (first time) | Teaches | Button |
|---|---|---|
| Second product launched | Saturation | Mercado |
| First time advertising is set > 0 | Demand shift, diminishing returns, carry-over | Productos |
| First sustained valuation (month ≥ 3) | Valuation formula and IPO gap | Valuación |
| Rival arrives | Share, loyalty, why price wars hurt | Mercado |
| Editions unlocked (month 12) | Price discrimination; how to pick high/low | Productos |
| First cost shock (arancel/renta) or demand shock | What moved and what to adjust (MC vs. fixed vs. demand) | Costos / Mercado |
| First regulator investigation | Markup, DWL, deadline | Mercado |
| Plant expansion becomes profitable (savings × volume > extra fixed cost over 12 months, *my call*) | Economies of scale | Costos |

During the first-run tutorial, mini-tutorials wait until the tutorial closes (queued, *my call*).

### 4.3 Actionable warnings
Every warning = what happened + a concrete diagnosis + 1–2 navigation buttons (and, where it applies, the product it is about):
- **Runway** (cash ≤ ~3 months): checks, in order, products priced below MC, advertising above contribution, products losing money after overhead, investments in progress; names the first culprit found and links there.
- **Below marginal cost:** names the product, links to it.
- **Crisis not survived:** what the shock changed and the adjustment that was missing.
- **Regulator fine / investigation:** current markup vs. threshold, months left.
- **Rejected actions:** the fix (e.g., "launch costs $120k, you have $40k: wait for N months of profit or drop a product").
- Navigation buttons switch the dashboard tab and highlight the relevant element; on phones they also collapse the chat.

### 4.4 Highlights
A highlighted element gets a visible ring + dimmed surroundings (spotlight), keyboard focusable, respects reduced motion. Highlight targets are named (`data-tour="cash"`, `"launch"`, `"price:<uid>"`, `"demand-chart"`, …) so the sim layer refers to names, never to DOM structure.

### 4.5 Links to the textbook (professor's request)
Every ⓘ entry citing CORE shows the section as a **link** to read it in full, opening in a new tab, in the player's language:
- Spanish: `https://books.core-econ.org/the-economy/microeconomics/es/07-firm-and-customers-NN-<slug>.html`
- English: same without `es/`.
Slugs (verified 200 in both languages for 7.1, 7.5, 7.7, 7.12; the rest come from the official contents page): 01-winning-brands, 02-breakfast-cereal, 03-large-scale-production, 04-beautiful-cars, 05-demand-elasticity-revenue, 06-maximize-profit, 07-divided-surplus, 08-price-setting-competition-market, 09-firms-differentiate-products, 10-strategic-price-setting, 11-decreasing-long-run-costs, 12-influencing-market-power, 13-summary. A test checks every glossary `core` reference maps to one of these. The section numbers are The Economy 2.0's (the edition the professor uses), identical in both languages. Endings and CFO messages that cite a section get the same link.

## 5. Languages
- `js/content/copy.es.js` + `copy.en.js`, `glossary.es.js` + `glossary.en.js`, identical keys; `copy.js` / `glossary.js` become thin selectors by current locale. A test fails if any key, placeholder or `[[term]]` differs between locales.
- Locale: browser language by default (`en*` → English, else Spanish), selector on the welcome screen and in the top bar, stored locally. Switching mid-run re-renders; past chat messages re-render in the new language (*my call*).
- Numbers/money keep the same format in both (`$12,400`).
- English copy written by Claude in the same voice; the professor reviews. M.A.R.G.E.N. keeps its name (acronym explained in English: "Machine for Analysis of Revenue, Growth, Earnings and Numbers", *my call*).
- The run's locale is stored in the Sheet row's `log` JSON (no new column, no Code.gs change).

## 6. Constraints
- Same stack and rules as v2 (pure sim, no deps, Node tests, GitHub Pages). All v2 tests and the balance contract keep passing.
- Tutorial and mini-tutorial state are plain JSON in the run (reload-safe); "seen" flags are per student in localStorage.

## 7. Left to the builder
- Exact wording (≤3 sentences per message) in both languages.
- Spotlight visuals within the preset.
- Exact runway diagnosis thresholds.
