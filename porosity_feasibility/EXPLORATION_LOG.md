# Session Handoff — Electrode Porosity Feasibility Assessment

Read this first in a new session to pick up full context without re-deriving anything.

## What this is

Data Scientist Candidate Assessment: can non-destructive sensor measurements (OES, electrical,
thermal) predict battery-electrode porosity? Repo: `Ramandeep72/Machine-Learning-Projects`,
branch `claude/ecstatic-archimedes-2tgf64` — **pushed to GitHub**, PR not yet created
(offered, not requested as of this writing).

- Official work: `porosity_feasibility/porosity_feasibility.ipynb` (89 cells, Sections 1-18,
  executed clean, 0 errors, 15/15 + 9/9 acceptance checks pass) + `porosity_feasibility/results/`.
- This file: everything tried *in chat, after* the notebook — ad-hoc, not in the protected
  `results/*.csv` files, not re-executed as notebook cells (scripts lived in session scratchpad
  and are gone; only results/verdicts below persist).

## Official notebook results

| scheme | model | MAE |
|---|---|---|
| five_fold | mean baseline | 2.445 |
| five_fold | ridge | 2.890 |
| five_fold | pcr | 2.477 |
| loo | mean baseline | 2.503 |
| loo | ridge | 2.453 |
| loo | pcr | 2.726 |

**Notebook conclusion: inconclusive.** Neither ridge nor PCR consistently beats baseline across
both CV schemes. Data-quality audit (Section 18) found zero record defects in any of the 20
samples. Samples 0 and 14 (worst five-fold/ridge misses) show no data explanation for their
difficulty — investigated in depth, clean bill of health, still hard to predict.

## Answers from Christina (the customer contact) — these resolve real assumptions

1. **The 100 readings per sample are different physical locations on that sample** (not repeated
   scans of one spot, not time-ordered). Locations themselves aren't meaningful. This **confirms
   the notebook's mean-aggregation choice was correct** (bulk porosity ↔ average-over-locations
   sensor signature), and legitimizes a feature idea not yet fully tested: within-sample spread
   across the 100 readings = **spatial heterogeneity**, itself potentially predictive.
2. **Assume samples were independently prepared.** Confirms the 5-fold/LOO CV design was valid
   all along — this was the biggest unverified assumption (A1) in the notebook.
3. **Customer wants ≤1% prediction error, and explainable models** — predictions must trace to
   named physical features ("current waveform statistics," "a specific emission wavelength"), not
   opaque features like raw pixel indices.
   - Porosity is already in percentage-point-like units (range ~20-32), so **1% ≈ MAE of 1.0** in
     the units used throughout. **Nothing tried, official or ad-hoc, gets within 2x of that** —
     best case (see below) is ~2.14, worst is ~3.7.
   - This **disqualifies the single best-performing model** (raw IR_pix/ridge, not explainable)
     from being the actual deliverable, even though it's numerically the strongest result found.

## Ad-hoc experiments, in order (chat only, not in the notebook)

| # | What | Result | Verdict |
|---|---|---|---|
| 1 | Exclude samples 0/14, evaluation only | Looked better | **Rejected** — circular, models still trained with 0/14 in most folds |
| 2 | Exclude samples 0/14, true refit (n=18) | ridge/pcr ~1.85-1.92, clearly beat baseline | **Rejected** — cherry-picking, picks worst misses after seeing them (user's own call) |
| 3 | Thickness alone | MAE 2.51-2.62, ~tied/worse than baseline | Weak (r=0.284 with porosity) |
| 4 | Thickness + all sensors (2,305 feat.) | Identical to sensors-only to 3 decimals | Drowned out by feature-count imbalance |
| 5 | Block-PCR: PCA per block, same k, tuned via inner CV | five_fold 3.16 (worse), loo 2.38 (slightly better) | Inconsistent; k forced to ~1 by n=20 |
| 6 | Each sensor block alone, ridge + PCR | See table below | **IR_pix/ridge is the standout** |
| 7 | OES peak-based features (8 peaks, target-independent) | five_fold worse, loo ~tied | Disappointing given OES's visible structure |
| 8 | Adaptive Block-PCR: per-block k∈{0,1,2,3}, jointly tuned | five_fold 3.31 (worse), loo 2.85 (worse) | **Clear failure** — search space too large for n=20; inner MAE (~1.7-2.4) didn't transfer out; same overfit risk as manual cherry-picking, automated |
| 9 | Voltage/current descriptive plots (mean±std/sample) | Voltage ~0 (oscillates); current has real structure | Motivated #10-11 |
| 10 | V/I vs. assumed time index (unconfirmed axis, user's explicit choice) | Voltage: clean ~10-cycle sine, amplitude tracks porosity. Current: same period, distorted (nonlinear response) | Suggested amplitude features |
| 11 | Amplitude/level correlations with porosity (n=20) | Voltage amp r=0.364; current amp r=0.195; **thermal mean r=0.408; thermal amp r=0.401** | Strongest descriptive correlations found; consistent with #6 |
| 12 | Pass 3: thermal mean+amp, voltage amp, **V-I phase lag + amplitude ratio** (FFT at dominant freq, freq chosen dataset-wide/target-independent) | Phase/ratio corr with porosity ~0 (r=0.098, -0.088) — hypothesis wrong. Combined 5-feature ridge/OLS: **worse than baseline both schemes** (2.60-2.86 vs 2.45-2.50) | **Failed** — physically-motivated impedance hypothesis didn't hold; weak features diluted the decent ones |
| 13 | Mixed resolution: full OES (256) + full IR_pix (1024) + 4 V/I summary feats = 1284 total | Worse than baseline in 3/4 model×scheme combos; underperforms plain IR_pix-alone in all 4 | **Failed** — confirms combining blocks (even "good" ones at full res) dilutes IR_pix's solo signal; pattern held 3 separate ways now (block-PCA, adaptive block-PCA, this) |
| 14 | Stability selection (Lasso over 200 subsamples/fold, keep features selected ≥50%) + SHAP, restricted to **explainable** candidates only (256 OES bins + 10 engineered incl. new spatial-heterogeneity feats from Christina's answer) | Collapsed to **1 feature** in 23/25 folds (usually a single OES wavelength, 392nm most often at 44%). MAE **3.6-3.7 — worst result of the entire session**, clearly worse than baseline | **Failed, and diagnostic:** LassoCV over-regularizes at n≈12-16 training rows, forcing extreme sparsity. Real contrast with #6: ridge (no sparsification, keeps+shrinks all 1024 IR_pix features) was the best performer. Suggests real signal here (if any) is **diffuse across many weak correlated features, not concentrated in a few strong ones** — directly conflicts with what sparse/explainable models assume, and with what the customer wants |

### Experiment 6 detail: each sensor block alone (ridge + PCR, full block, no engineering)

| block | n_features | five_fold ridge | five_fold pcr | loo ridge | loo pcr |
|---|---|---|---|---|---|
| baseline | — | 2.45 | — | 2.50 | — |
| OES_bin | 256 | 2.76 (worse) | 3.01 (worse) | 2.78 (worse) | 2.97 (worse) |
| V_t | 512 | 2.79 (worse) | 2.53 (worse) | **2.38 (better)** | 2.53 (worse) |
| I_t | 512 | 2.77 (worse) | 3.55 (worse) | 2.66 (worse) | 2.76 (worse) |
| IR_pix | 1024 | **2.14 (better)** | 3.06 (worse) | **2.40 (better)** | **2.16 (better)** |

**IR_pix/ridge remains the single best-performing, most consistent result of the entire session**
— survived every attempt to combine it with something else (all made it worse: #8, #12, #13) —
but per Christina's answer, it's **disqualified as a deliverable** because raw pixel indices
aren't explainable and the pixel geometry isn't even confirmed.

**Standing caveat across all 14 experiments:** this many feature-set/model combinations tried on
n=20 means some configuration looking good by chance is statistically expected, not proof of a
real effect (multiple-comparisons risk). Nothing here should be reported as confirmed — including
IR_pix — without new samples.

## Where things actually stand

**The core tension, unresolved:** the only model family that ever beat baseline consistently
(ridge on many raw, weakly-correlated features, no sparsification) is exactly the kind of model
the customer said they don't want. Every attempt at the kind of model they *do* want (few, named,
explainable features) has underperformed baseline, including the most careful, properly-nested
attempt (#14). This isn't a "try more things" gap — three independent methods (peaks, engineered
summary stats, stability selection) all point the same direction.

**Against the 1% (~MAE 1.0) target: nothing is close.** Best real number is 2.14 (disqualified);
best explainable number is around 2.5-2.6 at best, i.e. ~2.5x too imprecise.

## Sound next steps, roughly in priority order

1. **Don't run a 15th feature-set variant** — the ad-hoc exploration has been thorough and the
   negative pattern is consistent, not noisy. More searching on the same 20 points now more
   resembles p-hacking than genuine investigation.
2. **Write up the honest finding**: sensors show a real but diffuse signal (best captured by
   dense linear models on raw high-dimensional blocks, esp. thermal), but no explainable,
   low-dimensional feature set has reproduced that signal, and nothing is within reach of the
   customer's 1% target regardless of approach.
3. **What would actually move this forward**: more samples (n=20 is the fundamental ceiling on
   every method tried), confirmed thermal image geometry (to make IR_pix's signal explainable
   rather than just numerically strong), and possibly relaxing either the accuracy target or the
   explainability requirement — because right now they may be in direct tension for this dataset.
4. If asked to build any of the ad-hoc experiments into real notebook cells (matching how Sections
   17-18 were added), that's a rebuild — the scripts lived in session scratchpad and don't persist.
   Follow the same pattern: cell files in a `nb_cells/` dir, assembled + executed via
   `nbformat`/`nbclient`, per the earlier build script's approach.

## Session housekeeping

- **GitHub push: resolved.** Was blocked all session (403 — Claude GitHub App had read access but
  not write/Contents permission on this repo). Fixed by the user updating the app's installation
  settings at https://github.com/apps/claude/installations/select_target. All commits are now
  pushed to `claude/ecstatic-archimedes-2tgf64`. No PR opened yet.
- requirements/environment: see `porosity_feasibility/README.md` (exact package versions, setup,
  reproduce instructions). `shap==0.51.0` was installed ad-hoc for experiment 14 but is not in
  `requirements.txt` (not part of the official notebook).
