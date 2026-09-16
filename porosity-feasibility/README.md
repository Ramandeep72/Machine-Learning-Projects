# Porosity Feasibility Assessment

Can non-destructive plasma-material interaction measurements (optical emission
spectroscopy, thermal imaging, voltage/current waveforms) predict electrode porosity,
which is currently only measured offline?

**Primary notebook (submitted pipeline):** [`porosity_pipeline.ipynb`](porosity_pipeline.ipynb) —
EDA → baseline (all features + ridge) → test-by-test (each measurement type alone) →
a refinement narrowing the winner down to its most important pixels → honest,
leakage-free weighted combination of all four measurement types.
Customer-facing summary: [`REPORT.md`](REPORT.md).

**Companion notebook:** [`porosity_explainability_attempt.ipynb`](porosity_explainability_attempt.ipynb) —
a direct, honest attempt to meet the customer's explainability requirement: named
physical features tried and found short of the winning model's accuracy, plus an
interpretation of what the winning model itself actually relies on (which pixels, how
stable, whether they cluster spatially).

A more exhaustive, earlier exploratory notebook — [`porosity_feasibility.ipynb`](porosity_feasibility.ipynb) —
is also included for reference (data-quality audit, additional engineered features,
residual analysis in more depth). `porosity_pipeline.ipynb` is the one to run for the
core result; the exploratory notebook is supplementary.

## Result, in one line

Of the three measurement types tested (OES, electrical, thermal), only **thermal
imaging** is the best-performing tested sensor representation, beating a naive baseline
consistently where the others did not. Three complementary kinds of evidence agree (not
statistically independent — the descriptive check draws on the same 20 samples as the
model, per Section 6): cross-validated predictive performance (Section 5), a model-free
descriptive correlation (Section 6), and a physical hypothesis consistent with known
materials science, not an established mechanism (also Section 6). The full-pixel thermal
reference model — `IR_pix` / ridge, unstandardized, LOO, all 1,024 pixels — achieved
**MAE 2.02, MAPE 7.7%**, against a baseline of MAE 2.50. An exploratory sweep (Section 7)
found that restricting to ~15-20 of its most important pixels scores somewhat lower (MAE
~1.89-1.94, MAPE ~7.4-7.5%), but the specific pixel count was chosen after examining that
sweep, so it is not an independently validated result — see `porosity_pipeline.ipynb`
Sections 5-7 and 10 for the full reasoning, the "Customer clarifications, assumptions,
and scope" section near the top of that notebook for assumptions and scope, and
`REPORT.md` for the customer-facing framing.

## Environment / setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Tested with Python 3.11, pandas 3.0, numpy 2.4, scikit-learn 1.9, plotly 6.x. All data
loading, modeling, metric computation, and interactive-HTML figure generation run with
just `requirements.txt` installed — no browser required for the analysis itself.

**Optional:** each notebook also embeds a static PNG snapshot of every figure directly in
its own cell output (rendered via a headless-browser screenshot of the interactive Plotly
HTML), so the notebook displays correctly on GitHub without needing to open the
companion `.html` files. This step needs Playwright with a Chromium browser installed
(`pip install playwright && playwright install chromium`) and is skipped automatically,
with a printed notice, if that isn't available — it never aborts the run. Pass
`enable_screenshot=False` to `show_figure_as_image(...)` calls to skip it deliberately;
the underlying interactive `.html` file is always written regardless. This was tested
against a local Chromium install at a fixed path; set the `PLAYWRIGHT_CHROMIUM_PATH`
environment variable if your Chromium binary lives elsewhere and isn't on Playwright's
default resolution path. No GPU or external services required; everything runs locally.

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
`thermal_correlation.html` (standalone interactive versions of the same figures embedded
in the notebook) in place.

To reproduce the companion explainability notebook:

```bash
jupyter nbconvert --to notebook --execute --inplace porosity_explainability_attempt.ipynb
```

To reproduce the earlier, more exhaustive exploratory notebook instead:

```bash
jupyter nbconvert --to notebook --execute --inplace porosity_feasibility.ipynb
```

## Structure

- `porosity_pipeline.ipynb` — **primary/submitted notebook.** Customer clarifications and
  assumptions (near the top), EDA, baseline, test-by-test, a pixel-restriction refinement
  of the winning result, honest weighted combination, complementary correlation +
  physical hypothesis, actual-vs-predicted, and summary. Figures embed as static PNGs in
  the notebook's own output when Playwright/Chromium is available (optional — see
  Environment/setup); interactive `.html` versions are always written regardless.
- `porosity_explainability_attempt.ipynb` — **companion notebook.** Tests named,
  physically-interpretable features (OES wavelengths, waveform statistics) against the
  same rigor as the primary pipeline; none match the winning model's accuracy. Also
  interprets the winning model directly — which pixels it relies on, their stability
  across leave-one-out refits, whether they cluster spatially, and whether restricting to
  them changes accuracy (feeding the refinement in the primary notebook's Section 7).
- `porosity_feasibility.ipynb` — earlier, more exhaustive exploratory notebook (data
  quality audit, engineered features, deeper residual analysis). Supplementary.
- `REPORT.md` — short customer-facing summary of the findings.
- `eda_measurements_by_sample.html`, `actual_vs_predicted.html`, `thermal_correlation.html`,
  `pixel_importance.html`, `pixel_importance_grid.html` —
  standalone interactive Plotly figures (open directly in a browser for hover/zoom/legend
  isolate) — the same figures embedded as static images in the notebooks, kept here in
  interactive form as a convenience.
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
