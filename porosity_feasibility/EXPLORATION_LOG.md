# Exploration Log — Ad-Hoc Sensitivity Analyses

This log covers work done in chat *after* the official notebook (`porosity_feasibility.ipynb`,
Sections 1-18) was built and executed. None of it modified the official results — it's a record
of follow-up questions and their honest answers, kept here so a new session doesn't have to
re-derive it. Nothing here is in the protected `results/*.csv` files.

## Official notebook results (for reference)

| scheme | model | MAE |
|---|---|---|
| five_fold | mean baseline | 2.445 |
| five_fold | ridge | 2.890 |
| five_fold | pcr | 2.477 |
| loo | mean baseline | 2.503 |
| loo | ridge | 2.453 |
| loo | pcr | 2.726 |

**Conclusion in the notebook: inconclusive.** Neither ridge nor PCR consistently beats a constant
baseline across both validation schemes. Data-quality audit (Section 18) found no record defects
in any of the 20 samples; samples 0 and 14 (worst five-fold/ridge misses) show no data explanation
for their difficulty.

## Ad-hoc experiments tried, in order

| # | What | Result | Verdict |
|---|---|---|---|
| 1 | Exclude samples 0/14, evaluation only (reuse existing OOF predictions) | Looked better | **Rejected** — circular, models still trained with 0/14 in most folds |
| 2 | Exclude samples 0/14, true refit (fresh CV, n=18) | ridge/pcr ~1.85-1.92 MAE, clearly beat baseline (~2.7-3.0) | **Rejected** — user correctly called this cherry-picking; picks the two worst misses *after* seeing them |
| 3 | Thickness alone | MAE 2.51-2.62, ~tied with/worse than baseline | Weak (r=0.284 with porosity) |
| 4 | Thickness + all sensors (2,305 features) | Identical to sensors-only to 3 decimals | Thickness drowned out by feature-count imbalance |
| 5 | Block-PCR: PCA per block, same k for all 4 blocks, k tuned via inner CV | five_fold 3.16 (worse), loo 2.38 (slightly better) | Inconsistent; k forced to ~1 by n=20 |
| 6 | Each sensor block alone, ridge + PCR | See table below | **IR_pix/ridge is the standout** |
| 7 | OES peak-based features (8 peaks, target-independent selection from mean spectrum) | five_fold ridge 2.63/pcr 2.88 (worse), loo ridge 2.53/pcr 2.55 (~tied) | Disappointing given OES's visible physical structure |
| 8 | Adaptive Block-PCR: per-block k in {0,1,2,3}, jointly tuned via inner CV | five_fold 3.31 (worse), loo 2.85 (worse) | **Clear failure** — search space too large for n=20, inner MAE (~1.7-2.4) didn't transfer to outer folds; same overfitting risk as manual cherry-picking, just automated |
| 9 | Voltage/current descriptive plots (mean±std per sample) | Voltage averages ~0 (oscillates around zero); current has real per-sample structure | Motivated experiments 10-11 |
| 10 | Voltage/current vs. assumed time index (V_t/I_t suffix as time — **unconfirmed assumption**, user's explicit choice) | Voltage: clean ~10-cycle sine wave, amplitude visibly tracks porosity. Current: same period, distorted/asymmetric (nonlinear response) | Suggested amplitude features |
| 11 | Amplitude/level correlations with porosity (descriptive, n=20) | Voltage amplitude r=0.364; current amplitude r=0.195; **thermal mean level r=0.408; thermal amplitude r=0.401** | Strongest descriptive correlations found; consistent with #6's IR_pix result |

### Experiment 6 detail: each sensor block alone (ridge + PCR, full block, no engineering)

| block | n_features | five_fold ridge | five_fold pcr | loo ridge | loo pcr |
|---|---|---|---|---|---|
| baseline | — | 2.45 | — | 2.50 | — |
| OES_bin | 256 | 2.76 (worse) | 3.01 (worse) | 2.78 (worse) | 2.97 (worse) |
| V_t | 512 | 2.79 (worse) | 2.53 (worse) | **2.38 (better)** | 2.53 (worse) |
| I_t | 512 | 2.77 (worse) | 3.55 (worse) | 2.66 (worse) | 2.76 (worse) |
| IR_pix | 1024 | **2.14 (better)** | 3.06 (worse) | **2.40 (better)** | **2.16 (better)** |

**IR_pix/ridge is the only configuration in this entire exploration that consistently beat
baseline in both validation schemes**, and thermal summary stats (mean, amplitude) independently
show the strongest descriptive correlations with porosity of anything tried. Two independent
signals pointing the same direction.

**Important caveat that applies to all of this:** ~10+ different feature-set/model combinations
were tried across experiments 1-11. With n=20, some configuration looking good by chance is the
statistically expected outcome, not proof of a real effect (multiple-comparisons risk). IR_pix is
the most promising lead, not a confirmed result.

## Where this was headed next (not yet run)

**Proposed "Pass 3" (first thing since Pass 1/Pass 2 that would deserve official-pass status):**
engineered features — thermal mean level, thermal amplitude, voltage amplitude (3 features total,
down from 2,304) — run through the same CV rigor as Pass 1/2 (fold-fitted scaling, ridge + OLS,
both schemes, same baselines). Rationale: targets the two blocks/statistics that showed real
signal (experiments 6 and 11) instead of either the full raw feature set or a blind guess at
engineering. Caveat to keep attached to any result: the 3 features were chosen because they
correlated best out of several computed on this same 20-sample set — a good CV result here is a
well-motivated hypothesis test, not independent confirmation. That would require new samples.

## Session housekeeping

- GitHub push has been blocked all session (`403`, org hasn't reconnected the Claude GitHub App /
  claude.ai GitHub connector). Several commits are queued locally on `claude/ecstatic-archimedes-2tgf64`,
  not yet pushed (check `git log origin/claude/ecstatic-archimedes-2tgf64..HEAD` for the exact count).
  Retry `git push -u origin claude/ecstatic-archimedes-2tgf64` once access is fixed.
- All ad-hoc scripts referenced above live in this session's scratchpad, not the repo — only this
  log and the official notebook/results persist. If experiment 12 (Pass 3) should be built as
  actual notebook cells (matching how the eval-visualization and data-quality sections were added),
  that's a rebuild from scratch in the next session, following the same pattern as
  `nb_cells/1*.py` / `2*.py` in this session's build script.
