# Porosity Feasibility Assessment

Can non-destructive plasma-material interaction measurements (optical emission
spectroscopy, thermal imaging, voltage/current waveforms) predict electrode porosity,
which is currently only measured offline?

**Primary notebook (submitted pipeline):** [`porosity_pipeline.ipynb`](porosity_pipeline.ipynb) —
four stages: EDA → baseline (all features + ridge) → test-by-test (each measurement type
alone) → honest, leakage-free weighted combination of all four.
Customer-facing summary: [`REPORT.md`](REPORT.md).

A more exhaustive, earlier exploratory notebook — [`porosity_feasibility.ipynb`](porosity_feasibility.ipynb) —
is also included for reference (data-quality audit, additional engineered features,
residual analysis in more depth). `porosity_pipeline.ipynb` is the one to run for the
core result; the exploratory notebook is supplementary.

## Result, in one line

Of the three measurement types tested (OES, electrical, thermal), only **thermal
imaging** shows a consistent, physically-plausible predictive relationship with
porosity — reproducible across two independent validation schemes and backed by an
independent descriptive correlation (not just the cross-validated model score).
Best result: `IR_pix` / ridge, unstandardized, LOO — **MAE 2.02, MAPE 7.7%**, versus a
baseline of MAE 2.50. See `porosity_pipeline.ipynb` Sections 5-6 and 9 for the full
reasoning, and `REPORT.md` for the customer-facing framing.

## Environment / setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Tested with Python 3.11, pandas 3.0, numpy 2.4, scikit-learn 1.9, plotly 6.x. No GPU or
external services required; everything runs locally. Static PNG previews of the Plotly
figures are pre-rendered via `kaleido` + a local Chromium install — if reproducing in an
environment without a browser available, the notebook still runs and produces the
interactive `.html` files; only the inline preview-image step may need adjusting.

## Data

Place the following files in `data/` (already included in this folder):

| file | contents |
|---|---|
| `Sample_Info.csv` | 20 rows: `sample_id`, `thickness`, `porosity` |
| `Measurement_Data_part_1_samples_0-6.csv` | 700 measurement rows (samples 0-6, 100 repeats each) |
| `Measurement_Data_part_2_samples_7-13.csv` | 700 measurement rows (samples 7-13) |
| `Measurement_Data_part_3_samples_14-19.csv` | 600 measurement rows (samples 14-19) |
| `OES_Wavelengths.csv` | maps `OES_bin_*` column index to wavelength (nm) |

Each measurement row is one plasma-material interaction snapshot: a 256-bin OES
spectrum, a 512-point voltage waveform, a 512-point current waveform, and a
1024-pixel flattened thermal image (2,304 sensor features total). Porosity is only
known at the sample level (n=20), which is the central constraint both notebooks work
around.

## How to reproduce

```bash
cd porosity-feasibility
jupyter nbconvert --to notebook --execute --inplace porosity_pipeline.ipynb
```

or open `porosity_pipeline.ipynb` in Jupyter/JupyterLab and run all cells top to bottom.
Runtime is a couple of minutes. A fixed `RANDOM_STATE = 42` makes the 5-fold CV splits
and all model-internal searches reproducible run to run. Re-running regenerates
`eda_measurements_by_sample.html`, `actual_vs_predicted.html`, and
`thermal_correlation.html` (interactive) in place; the `*_preview.png` files are static
snapshots of those same figures, included for viewers (like GitHub) that don't execute
the interactive JS.

To reproduce the earlier, more exhaustive exploratory notebook instead:

```bash
jupyter nbconvert --to notebook --execute --inplace porosity_feasibility.ipynb
```

## Structure

- `porosity_pipeline.ipynb` — **primary/submitted notebook.** EDA, baseline, test-by-test,
  honest weighted combination, descriptive correlation, actual-vs-predicted, summary.
- `porosity_feasibility.ipynb` — earlier, more exhaustive exploratory notebook (data
  quality audit, engineered features, deeper residual analysis). Supplementary.
- `REPORT.md` — short customer-facing summary of the findings.
- `eda_measurements_by_sample.html`, `actual_vs_predicted.html`, `thermal_correlation.html` —
  standalone interactive Plotly figures (open directly in a browser for hover/zoom/legend
  isolate); `*_preview.png` are static snapshots of the same figures.
- `thickness_effect.html` — supplementary figure: effect of adding thickness as a
  predictor, referenced in `REPORT.md` but not part of the primary pipeline's stages.
- `data/` — the raw input files described above.
- `requirements.txt` — pinned-loose Python dependencies.

## AI-use disclosure

This analysis and both notebooks were built with Claude Code (Anthropic), used for data
loading/aggregation code, the cross-validation framework, exploratory and final
plotting code, and drafting of the written interpretation. The choice of validation
scheme (5-fold + LOO agreement required), the decision to test measurement types
separately, and the read of what the results do/don't support were reviewed and are
represented here as the author's own judgment, not taken uncritically from the tool.
The scope of exploration in the underlying chat history (dozens of additional techniques
tried — Lasso, ElasticNet, group lasso, stacking, row-level retraining, and more) went
well beyond what's reproduced in these two notebooks; only the techniques and results
that materially inform the final conclusion are included here.
