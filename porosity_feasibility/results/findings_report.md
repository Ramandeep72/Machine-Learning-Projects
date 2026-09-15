# Electrode Porosity Feasibility — Findings Report

Generated 2026-09-15T17:14:18.917804+00:00 from `results/metrics_summary.csv` and
`results/oof_predictions.csv`. This is an initial feasibility check, not a
production-readiness claim.

## Question

Can sensor measurements (OES, electrical, thermal) predict electrode
porosity for a held-out physical sample better than a constant prediction,
and does PCA-based dimensionality reduction (PCR) change that result?

## Results (held-out, out-of-fold predictions)

- **ridge / five_fold**: MAE=2.890, RMSE=3.456, pooled R²=-0.141. Does not beat the mean baseline (MAE diff +0.445); does not beat the median baseline (MAE diff +0.439).
- **pcr / five_fold**: MAE=2.477, RMSE=2.994, pooled R²=0.144. Does not beat the mean baseline (MAE diff +0.032); does not beat the median baseline (MAE diff +0.026).
- **ridge / loo**: MAE=2.453, RMSE=3.164, pooled R²=0.044. Beats the mean baseline (MAE diff -0.049); beats the median baseline (MAE diff -0.119).
- **pcr / loo**: MAE=2.726, RMSE=3.190, pooled R²=0.028. Does not beat the mean baseline (MAE diff +0.223); does not beat the median baseline (MAE diff +0.154).

## Error pattern

The single worst-predicted sample (id 2) accounts for 10% of the summed worst-case (ridge-or-pcr) absolute error across all 20 samples in the five_fold scheme — a fairly broadly distributed error pattern.

## Five-fold vs. leave-one-out consistency

Ridge does not beat PCR on pooled MAE under five-fold CV, and ridge beats PCR under leave-one-out — a different direction between schemes. This is a within-dataset sensitivity check, not independent confirmation.

## Read on feasibility

Based only on the numbers above, with 20 physical samples: the
result is one data point per pass per scheme, not a statistically confirmed
conclusion. Report the sign and size of the MAE differences above as
evidence, not as proof of, or against, a physical relationship existing.
Neither a positive nor a negative result here should be taken as final.

## Assumptions most limiting this interpretation

**A1** (sample independence unverified — if samples share a batch/sheet/roll, both outer and inner splits would need to be rebuilt at that grouping level) and **A6** (thickness availability at prediction time is unknown, so it was excluded from the primary predictors) are the assumptions most likely to change the interpretation of these results.

## Most useful next evidence

- What differentiates the repeated readings per sample, and whether they're ordered (affects A2/A5).
- The reference porosity method, timing, and location relative to the sensor readings (A3).
- Any parent-batch, sheet, or roll relationship between samples (A1) — the single most consequential unknown for whether 5-fold/LOO sample-level CV is actually independent.
- Whether thickness will be available at prediction time in the real workflow (A6).
- More representative samples: 20 samples is a small basis for any of these conclusions.

## AI assistance disclosure

OpenAI ChatGPT assisted with developing the analysis plan and the
implementation brief this notebook was built from. Claude Code assisted with
implementing the notebook code, the validation checks, the figures, and this
draft report text. The assumptions, methods, and conclusions require the
candidate's review and ownership before being presented to a customer.
