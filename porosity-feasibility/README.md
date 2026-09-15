# Porosity Feasibility Assessment

Can non-destructive plasma-material interaction measurements (optical emission
spectroscopy, thermal imaging, voltage/current waveforms) predict electrode porosity,
which is currently only measured offline?

Full analysis: [`porosity_feasibility.ipynb`](porosity_feasibility.ipynb).
Customer-facing summary: [`REPORT.md`](REPORT.md).

## Result, in one line

On this 20-sample dataset, no model reliably beats a constant baseline across both
validation schemes — except ridge regression on the thermal image block alone, which is
the one consistent lead worth a follow-up data collection round. See the notebook's
Section 11 ("Conclusions and recommendations") for the full reasoning and caveats.

## Environment / setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Tested with Python 3.11, pandas 3.0, numpy 2.4, scikit-learn 1.9. No GPU or external
services required; everything runs locally.

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
known at the sample level (n=20), which is the central constraint the notebook works
around.

## How to reproduce

```bash
cd porosity-feasibility
jupyter nbconvert --to notebook --execute --inplace porosity_feasibility.ipynb
```

or open `porosity_feasibility.ipynb` in Jupyter/JupyterLab and run all cells top to
bottom. Runtime is a few minutes (nested cross-validation over ~2,300 features across
2 CV schemes x multiple models x 4 sensor blocks). A fixed `RANDOM_STATE = 42` makes
the 5-fold CV splits (and PCA/GridSearchCV internals) reproducible run to run.

## Structure

- `porosity_feasibility.ipynb` — the full analysis: data quality checks, sample-level
  aggregation, EDA, modeling framework, three modeling passes (full sensor set, each
  sensor block alone, engineered features), residual analysis, and conclusions.
- `REPORT.md` — a short (customer-facing) summary of the same findings.
- `data/` — the raw input files described above.
- `requirements.txt` — pinned-loose Python dependencies.

## AI-use disclosure

This analysis and notebook were built with Claude Code (Anthropic), used for data
loading/aggregation code, the cross-validation framework, exploratory and final
plotting code, and drafting of the written interpretation. The choice of validation
scheme (5-fold + LOO agreement required), the decision to test sensor blocks
separately, and the read of what the results do/don't support were reviewed and are
represented here as the author's own judgment, not taken uncritically from the tool.
