# Assumptions and Limitations

Generated 2026-09-15T16:30:30.725474+00:00.

## Working assumptions

| id | assumption | status | notebook_impact | revision_action |
|---|---|---|---|---|
| A1 | Each sample_id is one sample and the validation unit; independence across samples is unverified. | unconfirmed | One modeling row and one evaluated prediction per sample; no reading-level random split. | If samples share a batch/sheet/roll relevant to deployment, rebuild outer and inner splits at that grouping level and rerun. |
| A2 | The repeated readings per sample are unordered repeated characterizations, not assumed independent. | unconfirmed | Fixed per-feature mean aggregation per sample; no temporal modeling of reading order. | If readings represent different stages/conditions, revisit aggregation and rerun downstream analysis. |
| A3 | Provided porosity is a usable reference for the sensor-characterized state; timing/location/method unknown. | unconfirmed | Join label by sample_id; never used as a predictor; not assumed error-free. | Revisit label matching or paired-specimen effects if labels describe a different location/state. |
| A4 | Corresponding sensor columns are comparable across readings and samples (spectral/trace/pixel alignment). | unconfirmed | Average the same feature position across a sample's readings. | If alignment/units/calibration differ, obtain metadata and revise preprocessing before interpreting averages/coefficients. |
| A5 | A comparable collection of readings will be available for a future sample. | unconfirmed | Evaluate sample-level prediction from aggregated readings only. | A single-scan or different acquisition budget requires a revised representation and evaluation. |
| A6 | Thickness availability at prediction time (in the real workflow) is unconfirmed. | unconfirmed | Thickness retained for descriptive EDA only; excluded from both primary model passes. | If thickness will genuinely be available at prediction time, add a separately labeled sensor+thickness comparison scenario. |
| A7 | OES wavelength is in nm; other units, porosity units, and acquisition ordering are not fully specified. | unconfirmed | Report errors in provided porosity units; use feature indices where physical axes are unknown. | Update units/axis labels/transformations only after confirmation. |
| A8 | No confirmed customer error tolerance or accuracy-vs-interpretability preference. | unconfirmed | Compare held-out error to constant baselines; conclude preliminary feasibility, not customer acceptance. | Assess observed error against the tolerance once an intended decision and threshold are known. |

## Most limiting for this run

**A1** (sample independence unverified — if samples share a batch/sheet/roll, both outer and inner splits would need to be rebuilt at that grouping level) and **A6** (thickness availability at prediction time is unknown, so it was excluded from the primary predictors) are the assumptions most likely to change the interpretation of these results.

## Known limitations of this analysis

- Only 20 physical samples are available; CV metrics from this few
  samples are informative but not statistically strong.
- Per-feature standardization does not equalize each sensor block's total
  influence: OES (256 features), the electrical
  traces (512 + 512
  features), and thermal pixels (1024 features)
  enter the model with very different column counts.
- Ridge coefficients are only approximately comparable across outer folds
  (each fold's scaler is fit on that fold's own training samples).
- PCR component sign/orientation is not comparable across folds.
- No permanent held-out test set exists in this design — all reported
  numbers are cross-validated, out-of-fold estimates on the same 20-sample
  dataset.

## Next useful evidence

- What differentiates the repeated readings per sample, and whether they're ordered (affects A2/A5).
- The reference porosity method, timing, and location relative to the sensor readings (A3).
- Any parent-batch, sheet, or roll relationship between samples (A1) — the single most consequential unknown for whether 5-fold/LOO sample-level CV is actually independent.
- Whether thickness will be available at prediction time in the real workflow (A6).
- More representative samples: 20 samples is a small basis for any of these conclusions.
