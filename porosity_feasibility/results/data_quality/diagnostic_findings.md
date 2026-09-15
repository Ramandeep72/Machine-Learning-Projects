# Data Quality, Sample Coverage, and Difficult-Prediction Diagnostics — Findings

Generated 2026-09-15T17:14:31.115535+00:00 from `results/data_quality/*.csv` and the
protected `results/oof_predictions.csv`. This is an audit and explanation pass — no samples were
removed, no aggregation or modeling choices changed, and the original evaluation results
(hash-verified in Section 18.11) are unmodified.

## 1. What the checks found

Across all 20 sample IDs: 0 duplicate-ID issues, 0 missing-value issues, 0 label-completeness
issues, 0 join issues (`sample_quality_audit.csv`). 13 of 80
(sample, block) relative-spread z-scores exceed |z|=1; the samples involved are [2, 3, 4, 7, 9, 11, 12, 13, 15, 16].
Reference-label provenance (measurement method, timing, specimen co-location, batch relationships,
instrument/calibration metadata) is unknown from the supplied files for **all** samples, not just the
two examined in detail (`reference_provenance_status.csv`) — that is a dataset-wide limitation, not
a defect specific to any sample.

**No record-integrity defect was found by these checks.** That is a real finding, not an absence of
effort: it rules out one class of explanation (bad records) for the difficult predictions below.

## 2. What the checks suggest about samples 0 and 14

Observation and hypothesis are kept separate for each sample; the hypothesis lines are explicitly
unverified.

- **Sample 0** — *observed:* record checks: no issue detected; notable-spread blocks: none; ridge/PCR miss direction (five_fold: same direction; loo: same direction); ridge abs error five-fold=6.06, leave-one-out=3.57; training-target coverage: within range; nearest-porosity comparisons: [17, 1].
  *hypothesis (unverified):* No issue was identified by the available checks; this remains a valid difficult prediction.
- **Sample 14** — *observed:* record checks: no issue detected; notable-spread blocks: none; ridge/PCR miss direction (five_fold: same direction; loo: same direction); ridge abs error five-fold=4.38, leave-one-out=4.58; training-target coverage: within range; nearest-porosity comparisons: [6, 8].
  *hypothesis (unverified):* No issue was identified by the available checks; this remains a valid difficult prediction.

## 3. What remains unknown

- Reference porosity measurement method, timing, and specimen co-location (all samples).
- Whether the 100 repeated readings per sample represent different physical locations, repeated scans
  of one location, or something else, and whether they're ordered.
- Any parent-batch, sheet, or roll relationship between samples, including whether samples 0/14 share
  a batch with their high-error neighbors or with each other.
- Instrument, calibration, and acquisition-condition metadata for OES, electrical, and thermal sensors.
- Whether the relative-spread pattern found for [2, 3, 4, 7, 9, 11, 12, 13, 15, 16] reflects material heterogeneity,
  acquisition conditions, alignment issues, or something else — the files don't distinguish these.

## 4. What should happen next

1. **Clarify, don't assume:** the reference-label provenance and acquisition-condition questions in
   Section 18.7 are the highest-value next inputs — they would directly resolve several of the
   "hypothesis (unverified)" lines above.
2. **If parent-batch/sheet metadata becomes available,** check whether samples 0/14 and their
   high-relative-spread neighbors share a batch, before concluding anything about instrument behavior.
3. **A mean-vs-median aggregation comparison** is a plausible *future* exploratory sensitivity analysis,
   given the mean-median gaps observed in Section 18.6 — but it was not run automatically here, per
   scope, and any such change would need its own training-only re-evaluation, not a patch to these results.
4. **No sample should be removed or downweighted on the basis of this audit alone** — nothing found
   here rises to a demonstrated data defect for either focus sample.

## AI assistance disclosure

Claude Code implemented this diagnostic section (the audit tables, within-sample statistics, the
sample 0/14 investigation, the figures, and this findings file) from the raw data and the already-saved,
hash-verified out-of-fold predictions, per a written addendum brief. The candidate has not yet reviewed
this diagnostic output; the assumptions, findings, and conclusions above require that review before
being presented to a customer.
