# Electrode Porosity Feasibility Assessment

*A short summary of findings — full technical detail in `porosity_feasibility.ipynb`.*

---

## 1. The question

Can in-process, non-destructive measurements — optical emission spectroscopy (OES),
thermal imaging, and electrical (voltage/current) signals — predict electrode porosity
well enough to reduce or replace offline characterization?

## 2. The data

- **20 electrode samples**, each with a reference porosity value (19.96-32.34%) and
  thickness.
- **100 repeated measurements per sample** (2,000 measurement snapshots total), each
  capturing a 256-bin OES spectrum, a 512-point voltage waveform, a 512-point current
  waveform, and a 1,024-pixel thermal image — 2,304 sensor readings per snapshot.
- Data quality is good: no missing values, no duplicate records, every sample has the
  same 100-repeat structure. No samples were excluded from the analysis.
- **The constraint that drives everything below:** porosity is only known once per
  sample. Twenty independent target values is a small dataset for 2,304 candidate
  features — the central analytical challenge here is not fitting a model, it's
  telling a real signal apart from chance.

## 3. How we tested for a real signal (not just a fitted line)

Every result below had to clear two bars:

1. **Beat a do-nothing baseline** — a model that just predicts the average porosity.
   If a model can't beat guessing the mean, it isn't using the sensor data.
2. **Agree across two independent validation schemes** — 5-fold cross-validation and
   leave-one-out cross-validation. With only 20 samples, either scheme alone can be
   swayed by which samples happen to land in which fold; a real effect should survive
   both.

We compared two modeling approaches throughout: **ridge regression** (all features,
regularization strength tuned automatically) and **PCR** (principal-component
regression — compress the features first, then fit a simple linear model on the
compressed representation).

## 4. Pass 1 — all sensors together: no signal found

Throwing all 2,304 features at ridge or PCR did **not** beat the baseline consistently:

| | 5-fold MAE | LOO MAE |
|---|---|---|
| **Baseline (predict the mean)** | 2.45 | 2.50 |
| Ridge (all sensors) | 2.51 | 2.37 |
| PCR (all sensors) | 3.19 | 2.77 |

Ridge edges out baseline under one scheme but not the other; PCR underperforms in
both. With 2,304 mostly-irrelevant features and 20 samples, this is the expected
outcome when signal — if present — is concentrated in a subset of the sensors rather
than spread evenly across all of them.

## 5. Pass 2 — testing each sensor type alone: the thermal signal stands out

Splitting the 2,304 features into their four physical sources (OES spectrum, voltage
waveform, current waveform, thermal image) and testing each alone:

| sensor block | best result vs. baseline |
|---|---|
| OES spectrum | no consistent improvement |
| Current waveform | no improvement in either scheme |
| Voltage waveform | one marginal, single-scheme win — not a reliable signal |
| **Thermal image** | **ridge beats baseline in both schemes** (2.31 vs. 2.45 five-fold; 2.05 vs. 2.50 LOO) |

**The thermal-image block is the only one where a model beat the baseline under both
validation schemes** — the single consistent result across the whole analysis.

## 6. Pass 3 — physically-motivated thermal/voltage features

Guided by Pass 2, we reduced the 2,304 raw features to 3 physically interpretable
summaries: **thermal mean level**, **thermal spatial contrast (amplitude)**, and
**voltage amplitude**. These also show the strongest simple correlations with porosity
found anywhere in this analysis (thermal mean: r ≈ 0.41).

Run through the same two-scheme rigor, this set of 3 features beats baseline under
leave-one-out but not under 5-fold — a promising but still inconclusive result, and one
built on features selected using the same 20 samples they're tested on (see caveats).

## 7. Bottom line

- **We cannot yet claim that porosity is predictable from these sensors.** No model
  passes the bar we set (both baseline and both validation schemes) using the full
  sensor set.
- **The thermal-imaging signal is a specific, credible, falsifiable lead**, not a
  vague "worth exploring" — it is the one configuration that consistently outperformed
  a naive baseline, and it has a plausible physical rationale (process heat /
  thermal contrast relating to material consolidation and therefore porosity).
- Everything above was checked against a **multiple-comparisons risk**: roughly 10+
  feature-set/model combinations were tried, and with n=20, finding *some*
  configuration that looks good by chance is the statistically expected outcome of
  trying that many combinations — which is exactly why we required agreement across
  both baseline and both CV schemes before calling anything a finding, rather than
  reporting the single best number found.

## 8. Recommended next steps for a POC

1. **Collect more samples.** This is the single highest-leverage next step — n=20
   limits confidence in every result above; even 40-60 samples would materially
   change what can be claimed.
2. **Quantify the measurement noise floor** for the thermal signal specifically
   (replicate measurements under fixed conditions), to separate real sample-to-sample
   variation from instrument/process noise.
3. **Validate the thermal-feature hypothesis on new samples** not used to select the
   features, to confirm Pass 3's result is a real relationship and not an artifact of
   feature selection on the same 20 samples.
4. **Confirm the voltage/current time-axis interpretation** with the process
   engineering team — we inferred it from the data shape, not a labeled timestamp.

---

*AI-use disclosure: this analysis was built with Claude Code (Anthropic) for data
processing, modeling code, plotting, and drafting. The validation methodology and the
interpretation of what the results do and don't support reflect the author's own
review, not an unreviewed model output.*
