# Rumbo a la IPO — A text RPG exam for CORE Econ Unit 7

Date: 2026-11-22 · Status: draft for approval

## 1. Intent and why

An experimental exam for Unit 7 of CORE Econ *The Economy 2.0* ("The firm and its customers",
https://books.core-econ.org/the-economy/microeconomics/07-firm-and-customers-01-winning-brands.html).
Instead of a paper sheet, students play a short text-based business RPG: they run a small consumer
brand through a reduced set of decisions. Bad economic reasoning bankrupts the firm; good reasoning
takes it to an IPO.

It follows the exam-maker philosophy (`~/.claude/references/pedagogy.md`): the exam is a learning
experience, open notes and open discussion, and **the argument is worth more than the number**.
Bankruptcy is not a punishment — retries are unlimited, and every failure is explained in Unit 7
terms so a failed run still teaches.

The professor wants **automatic grading**, with results landing in a spreadsheet.

## 2. Context

- ~12 students, Spanish-speaking, algebra-level math (no calculus).
- Played **at home, over several days**. Collaboration is allowed (philosophy: open discussion).
- Professor runs a separate platform (`~/Documents/trabajo/coding/school-app`, FastAPI + React on
  Railway). The game is **not** built into it; the professor posts an "examen" there with the game
  link and copies the final scores in by hand.

## 3. Goals, non-goals, anti-goals

**Goals**
- Students make price/cost/differentiation/strategy decisions that exercise Unit 7 concepts.
- Unlimited retries; each run takes ~10–15 minutes (12–15 decisions).
- Reasoning is graded directly via in-game checkpoints, not only the outcome.
- Every attempt is logged to a Google Sheet the professor owns.

**Non-goals**
- Graphics, animation, sound. Text-first with a small dashboard.
- Real authentication or anti-cheat. A student who finds a way to win by hacking gets an A
  (professor's words).
- Integration with school-app.
- The exam-maker's LaTeX study guide / exam PDFs (the CORE unit itself is the guide; see §9).

**Anti-goals** (would make this a failure even if it works)
- A game that can be beaten by memorizing clicks from a previous run (numbers must change per run).
- Bankruptcy that feels arbitrary or unexplained.
- Grading that rewards persistence alone — reaching the IPO by brute force must not give full marks.
- Calculus or opaque formulas the students haven't seen.

## 4. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Static page on GitHub Pages + Google Apps Script web app appending to a Google Sheet | Free, zero maintenance, fully isolated from school-app. No real login; JS is readable and results could be spoofed — acceptable for 12 students. |
| B | Feature inside school-app | Real Google login, grades flow into the grade engine. But days of work under that repo's strict rules and risk to a live app — too heavy for an experiment. |
| C | Separate small service with a DB (Supabase / mini Railway app) | More accounts, keys, deploys; no benefit over A at this scale. |

Professor picked **A**.

Grading model options considered: (A) IPO pass/fail — rewards persistence only; (B) IPO + run
quality; (C) B + reasoning checkpoints. Professor picked **C**.

## 5. Game design

### 5.1 Frame
- The student founds a small consumer brand (craft coffee, *my call*; brand name typed by the
  student). A narrator, **the CFO** — slightly sarcastic, helpful — presents each situation and
  explains the consequences of each decision in Unit 7 vocabulary ("Subiste el precio 10% y vendiste
  30% menos: tu demanda era elástica").
- Time advances in **quarters**. Persistent dashboard: Caja (cash), utilidad del trimestre, cuota de
  mercado, lealtad de marca, trimestre/etapa.
- Each decision offers **2–4 options**. Options are discrete (no free-form price typing), so the
  engine can always compute the best option.

Screen sketch:
```
 ── TRIMESTRE 7 · CAFÉ TLALOC ────────── Caja: $182,400 ▲
 CFO: "Llegó Bean&Co. a la esquina. Cobran $38 la bolsa."

 Lealtad de clientes: ████░░░░  45%
 ¿Qué precio fijas este trimestre?
   [1] Mantener $52 (apostar a la marca)
   [2] Bajar a $40 (guerra de precios)
   [3] Invertir $60k en publicidad y mantener precio
```

### 5.2 Per-run randomization
Each run draws a fresh **seed**; all parameters (demand intercept/slope, unit cost, fixed cost,
starting cash, rival's behaviour, customer-segment mix) are derived from it within ranges that keep
the game winnable and the numbers "nice" (round-ish values students can compute by hand). The seed is
logged so any run can be replayed/audited.

### 5.3 Economic model (algebra only)
- Linear demand per quarter: `P = a − b·Q` (shown to students as a market survey: 4–6 price/quantity
  points, plus the equation once they "hire an analyst" — builder's call on presentation).
- Costs: `C(Q) = F + c·Q`; `AC = c + F/Q`; `MC = c`.
- Profit: `Π = (P − c)·Q − F`.
- Elasticity (arc or point, consistent with CORE's `ε = −(%ΔQ)/(%ΔP)`); markup rule
  `(P − c)/P = 1/ε`.
- Surplus/DWL: consumer surplus, producer surplus, deadweight loss triangle (used in Stage 4 narrative).
- Strategic stage: CORE 7.10-style segments — loyal / relative-price-sensitive / price-driven
  customers, two price levels H and L, payoff matrix.

### 5.4 Stages (mirror the exam-maker four-part arc)

| Stage | Arc role | Decisions (≈) | Content | Checkpoint examples |
|---|---|---|---|---|
| 1 · Lanzamiento | Anchor | 3–4 | Pick a price from the survey; see profit result. Pricing at/below `c` loses money every quarter. | Compute profit at your chosen price (numeric). Compute elasticity between two survey points (numeric). |
| 2 · Crecer | Conceptual bridge | 3–4 | Invest in a bigger roaster (↑F, ↓c), in advertising/brand (shifts demand out, lowers elasticity, raises loyalty), or neither. Overinvesting can drain cash. | "Te subieron la renta (costo fijo). ¿Qué pasa con tu precio óptimo?" (MC; correct: nothing — fixed costs don't change P*). Given ε, pick the markup-rule price (MC). |
| 3 · Llega un rival | Push | 3–4 | Repeated H/L pricing vs a rival, 2–3 rounds. **Share of loyal customers depends on brand investment in Stage 2**, so the game is a coordination game (H,H) or a prisoners' dilemma (L,L) depending on earlier choices. Rival follows a simple rule drawn per run (e.g., tit-for-tat, always-L, matches if you go L). | From a shown payoff matrix: identify the Nash equilibrium/equilibria (MC). Is this a coordination game or a prisoners' dilemma? (MC) |
| 4 · Roadshow IPO | Synthesis | 1–2 | Investors and a competition regulator ask about market power, markup, DWL. | One **open-text answer** (e.g., "El regulador dice que tu markup le cuesta a la sociedad. Defiende o concede.") — logged, not auto-graded. |

Checkpoints are multiple-choice or numeric with tolerance (numeric: ±2% or rounding-aware, *my
call*). MC distractors are the common misconceptions (e.g., "subir el precio para cubrir el costo
fijo"). **Checkpoints never block progress**: a wrong answer costs points and the CFO explains the
correct reasoning, then the game continues.

**Checkpoint variants (professor's decision).** Conceptual checkpoints must not be memorizable
across runs. Each concept has **~3 variants whose correct answer depends on the run's situation**, so
a memorized answer is wrong in most runs and the student must identify which case they're in.
Examples:
- Cost shock: sometimes fixed (rent → P* unchanged), sometimes marginal (coffee beans → P* rises).
- Strategic stage: loyalty share and rival make the game a coordination game in some runs and a
  prisoners' dilemma in others.
- Demand shift: new substitute appears (more elastic → lower markup) vs. brand campaign (less elastic
  → higher markup).
- Rotating misconception distractors and framings.
Target: ~20–25 checkpoint items total in the bank, ~8 drawn per run. The professor described this
variety as "what makes this interesting"; it is a core feature, not polish.

### 5.5 Multiple endings (professor's request)
The professor wants many outcomes and **several ways to finish** — different paths leading to
different endings. Endings map to the competing strategies Unit 7 describes (7.1 contrasts Apple's
premium strategy with Tesco's "pile it high, sell it cheap"; both win). The ending is determined by
the path through Stages 2–3 (brand vs. scale investment, pricing vs. the rival, market power).

| # | Ending | Type | Rough trigger (builder tunes) |
|---|---|---|---|
| 1 | "La marca premium" | IPO | Heavy brand/differentiation, high markup, low elasticity |
| 2 | "Pila alta, precio bajo" | IPO | Scale investment (↑F, ↓c), low price, high volume |
| 3 | "El duopolio cómodo" | IPO | Enough loyal customers that both firms sustain (H,H) |
| 4 | "Te compró el rival" | Honorable | Profitable but small firm acquired by the rival |
| 5 | "La boutique" | Honorable | Survives with profit but below the IPO threshold |
| 6 | "El regulador te parte" | Honorable | Excessive market power / anticompetitive moves trigger competition policy (7.12) |
| 7+ | Quiebra: guerra de precios / sobreinversión / precio bajo el costo marginal | Bankruptcy | Cash < 0; distinct post-mortem per cause |

- Each ending has its own closing narration explaining, in Unit 7 terms, why this path led here.
- **Endings gallery:** a screen showing which endings the student has unlocked (stored locally and
  logged). Encourages deliberately replaying with different strategies. No points attached;
  professor may use it as a discretionary bonus.

### 5.6 Ending conditions
- **Bankruptcy:** cash < 0 at the end of any quarter. Shows a post-mortem: which decisions hurt most,
  explained in Unit 7 terms, and a "Fundar otra empresa" button (new seed).
- **IPO / honorable endings:** see §5.5. IPO requires cash ≥ an IPO threshold and positive profit in
  the last quarters (exact thresholds: builder's call, tuned so a student choosing reasonably — not
  perfectly — makes it).
- Tuning target (*my call*): each of the three IPO endings is reachable in every run by a student who
  reasons well along that strategy; one who ignores elasticity/fixed-vs-marginal cost logic goes
  bankrupt in Stage 1–3.

## 6. Grading (out of 100, shown to students on the first screen)

| Component | Pts | Measures |
|---|---|---|
| Outcome | 40 / 20 / 0 | Any IPO ending = 40; honorable ending (acquired / boutique / broken up) = 20; bankruptcy = 0 (professor approved) |
| Checkpoints (Stages 1–3) | 40 | Correct answers, spread evenly across all checkpoints |
| Firm value at the ending | 20 | Applies to IPO and honorable endings; bankruptcy = 0 (*my call*). `20 × min(1, value / benchmark)`. **Firm value** (*my call*) = final cash + 8 × average profit of the last 2 quarters (an IPO values future earnings, so brand investment that raises later profit gets credit). Explained to students in one line. **Benchmark** (*my call*) = the best firm value reachable with the same seed, found by exhaustive search over the discrete options (the tree is small enough per stage; if not, search per stage and chain). Not greedy per decision — greedy never invests in brand. |
| Stage 4 open answer | 0 | Logged for the professor; bonus at professor's discretion |

- Score is computed **per run**. The student's grade = **best run**. A bankrupt run still earns the
  checkpoints answered before going bankrupt.
- The final screen shows the run's score breakdown.

## 7. Technical design

- **Frontend:** static site — `index.html` + plain JS modules + CSS, no build step, no framework
  (*my call*). Hosted on **GitHub Pages**. Mobile-friendly (students may play on phones).
- **Engine:** economics, randomization (seeded PRNG), scoring and benchmark as pure functions,
  separated from the UI, with unit tests (Node's built-in test runner, *my call*).
- **Identity:** first screen asks for name / student ID and a **class code** (given by the
  professor). Stored in `localStorage` so it isn't re-asked. Run counter also kept locally.
- **Results backend:** a Google Apps Script web app bound to a Google Sheet owned by the professor.
  `doPost` appends one row per completed run (any ending). Frontend sends via `fetch` with a
  `text/plain` JSON body (avoids CORS preflight). If the send fails, queue in `localStorage` and retry
  on next load.
- **Sheet columns (one row per run):** timestamp, class code, name/ID, run #, seed, outcome
  (IPO/honorable/quiebra), ending id, stage reached, quarter reached, checkpoint variant ids, per-checkpoint correctness, checkpoint pts, outcome pts,
  firm value, benchmark value, value pts, total, open-text answer, full decision log (JSON).
  A second tab (formula, *my call*) shows best run per student.
- **Deployment docs:** a short README in Spanish for the professor: how to create the Sheet, paste the
  Apps Script, deploy it as a web app ("Anyone" access), put its URL in the game config, and publish
  on GitHub Pages.
- Repo: this folder (`econ-business-game`), to be `git init`-ed and pushed to a new GitHub repo.

## 8. Language and copy
- All student-facing text in **Spanish**. Claude drafts all copy (narration, options, checkpoint
  questions, CFO explanations) in one strings/content module so the professor can review and edit it
  in one place.

## 9. Left to the builder
- Exact parameter ranges, thresholds, and number of quarters per stage (within §5).
- Exact checkpoint wording and distractors (grounded in Unit 7, algebra level).
- Visual styling (clean, readable, text-first; small dashboard; works on a phone).
- Whether to include a short in-game "Manual del CFO" glossary of Unit 7 formulas (*suggested*: yes,
  as a reference drawer — fits open-notes philosophy).
- Rival rule set and the mapping from brand investment to loyal-customer share.
