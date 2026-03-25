# NFL Combine + Therapy RAG App

This is a Streamlit prototype that:

1. Loads first-round NFL combine history (sample dataset).
2. Lets a user input current combine + physical measurements.
3. Lets a user mark body pain/injury points on a body map.
4. Uses a local RAG-style retrieval pipeline to recommend exercises and explain why each helps.

## Run locally

From `nfl_therapy_app/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

## Notes

- Data is a starter sample and should be expanded with complete first-round combine records.
- Exercise recommendations are educational only and not medical advice.
- RAG is local TF-IDF retrieval over a structured exercise knowledge base in `data/exercise_knowledge_base.json`.
