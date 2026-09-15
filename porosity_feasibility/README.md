# Electrode Porosity Feasibility Assessment

Initial feasibility notebook for the Data Scientist Candidate Assessment:
can non-destructive process measurements (OES, electrical traces, thermal
imaging) predict battery-electrode porosity? See
`porosity_feasibility.ipynb` for the full analysis, assumptions, and
narrative — this README covers setup, reproduction, and a factual summary.

## Input files

The notebook looks for the data in `./data` relative to the notebook (and
falls back to the notebook's own directory). This repo ships:

```
data/
  Sample_Info.csv              # 20 rows: sample_id, thickness, porosity
  OES_Wavelengths.csv          # 256 rows: Bin Number -> Wavelength (nm)
  Measurement_Data.csv.gz      # 2,000 rows x 2,307 cols, gzip-compressed
  Data_Scientist_Candidate_Assessment.docx  # original assignment brief
```

`Measurement_Data.csv.gz` is the gzip-compressed form of the original
`Measurement_Data.csv` (which is ~84 MB uncompressed). `pandas.read_csv`
reads `.gz` transparently, so no manual decompression is needed — the
notebook's `resolve_data_dir()` accepts either `Measurement_Data.csv` or
`Measurement_Data.csv.gz`, whichever is present.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m ipykernel install --user --name porosity-venv --display-name "Porosity venv"
```

## Reproduce from a clean kernel

```bash
jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.kernel_name=porosity-venv \
  --ExecutePreprocessor.timeout=1200 \
  porosity_feasibility.ipynb
```

Or open it in Jupyter/JupyterLab with the `porosity-venv` kernel and
"Restart Kernel and Run All Cells." The full run (data audit, EDA, nested
5-fold + leave-one-out cross-validation for both model passes, figures, and
report generation) takes well under a minute on a single core — there is
nothing computationally heavy here, given only 20 samples.

No internet connection or interactive widgets are required to rerun it.

## Configuration

All tunable settings live in one cell near the top of the notebook
(`RANDOM_STATE`, `OUTER_FOLDS`, `INNER_FOLDS`, `RUN_LEAVE_ONE_SAMPLE_OUT`,
`RIDGE_ALPHAS`, `PCA_COMPONENT_CANDIDATES`, `TIE_TOLERANCE_MAE`,
`INCLUDE_THICKNESS`, etc.). Defaults match the build brief. Toggling
`INCLUDE_THICKNESS` does not currently do anything by itself — the primary
scenario is sensor-only by design (see assumption A6); a thickness-included
comparison would need to be added as an explicitly separate, labeled
scenario, not a silent overwrite of the primary results.

## What executed

Executed end-to-end in a clean kernel on **2026-09-15**, using
`porosity-venv` (see exact package versions below). **0 of 89 cells raised
an error.** All acceptance checks defined in the notebook's Section 16
(15/15) and Section 18.13 data-quality checklist (9/9) passed — see
`results/data_audit.json` (`n_checks_failed`) for the former. Both the
primary 5-fold scheme and the leave-one-out sensitivity check ran
(`RUN_LEAVE_ONE_SAMPLE_OUT = True`).

**Section 18** is a later, diagnostic-only addendum: a data-quality audit of
all 20 samples plus a detailed investigation of samples 0 and 14 (the two
hardest five-fold predictions). It does not change the model results — it
hash-verifies, at the end of Section 18, that the original `results/*.csv` /
`results/*.json` files are byte-identical to what they were before that
section ran. No samples were removed, no aggregation or modeling choices
were changed, and no new models were fit.

## Outputs

```
porosity_feasibility.ipynb   # the executed notebook (all outputs saved)
results/
  data_audit.json              # recomputed file shapes, hashes, integrity checks
  assumptions_register.csv     # machine-readable version of the assumptions table
  sample_level_features.csv    # 20 rows x 2,304 sensor features (mean per sample)
  sample_reference_data.csv    # sample_id, thickness, porosity (20 rows)
  cv_splits.json               # outer + inner split sample IDs and seeds
  oof_predictions.csv          # one row per (scheme, model, sample_id) held-out prediction
  metrics_summary.csv          # pooled MAE/RMSE/R2 per scheme/model + baseline deltas
  fold_metrics.csv             # per-outer-fold MAE/RMSE/R2
  selected_hyperparameters.csv # chosen alpha / n_components per outer fold
  inner_cv_results.csv         # every inner-fold MAE for every candidate tried
  ridge_coefficients.csv       # ridge coefficients per retained feature per fold (extra, not in the minimum required list)
  pcr_component_loadings.csv   # PCA loadings + component regression coefficients per fold (extra)
  assumptions_and_limitations.md
  findings_report.md           # short results narrative, generated from the CSVs above
  figures/                     # customer-readable PNGs referenced in Sections 9, 13, and 17
  data_quality/                # Section 18 diagnostic addendum (does not alter results above)
    sample_quality_audit.csv         # per-sample record-integrity checks (duplicates, missingness, join, labels)
    feature_within_sample_stats.csv  # per (sample, sensor feature) descriptive stats, 46,080 rows
    training_fold_coverage.csv       # per held-out sample: was its porosity inside its training folds' range?
    reference_provenance_status.csv  # what's known/unknown about the porosity reference measurement
    sample_prediction_diagnostics.csv # primary 5-fold table joining the audit to predictions (obs_*/pred_*/err_*)
    diagnostic_findings.md           # what the audit found, incl. the samples 0/14 investigation
    figures/                         # 4 PNGs: overview, relative-spread, 2x OES profile (samples 0 & 14)
```

## Environment versions actually used

```
python==3.11.15
numpy==2.4.6
pandas==3.0.5
scikit-learn==1.9.1
matplotlib==3.11.2
scipy==1.17.1
nbformat==5.11.1
nbclient==0.11.0
nbconvert==7.17.1
```

## Known limitations

- Only 20 physical samples — every cross-validated metric here is
  informative, not statistically strong.
- No permanent held-out test set: all reported numbers are out-of-fold
  cross-validation estimates on the same 20-sample dataset (5-fold and
  leave-one-out), not an independent confirmation of each other.
- Per-feature standardization does not equalize each sensor block's total
  influence — OES (256), electrical (512 + 512), and thermal (1,024)
  features enter the model with very different column counts.
- Several open questions about the data-generating process (what the 100
  readings represent, sample independence, reference-label provenance,
  thickness availability at prediction time) remain unconfirmed working
  assumptions — see Sections 1-3 of the notebook and
  `results/assumptions_and_limitations.md`.
- See `results/findings_report.md` for the actual computed results and
  whether either model pass beat the constant baselines in this run.

## AI assistance disclosure

OpenAI ChatGPT assisted with developing the analysis plan and the
implementation briefs this notebook was built from (both the original
modeling brief and the Section 18 data-quality addendum brief). Claude Code
assisted with implementing the notebook code (data loading/audit,
aggregation, the ridge and PCR pipelines, the nested cross-validation
engine, metrics and consistency checks, the model-evaluation and
data-quality figures, and Section 18's audit tables and sample 0/14
investigation), and with drafting `results/findings_report.md`,
`results/assumptions_and_limitations.md`, `results/data_quality/diagnostic_findings.md`,
and this README. The assumptions, methods, and conclusions require the
candidate's own review and ownership before being presented to a customer —
that review has not yet happened.
