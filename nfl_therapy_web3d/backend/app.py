from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).parent
DATA_DIR = ROOT / "data"
COMBINE_PATH = DATA_DIR / "first_round_combine_sample.csv"
KB_PATH = DATA_DIR / "exercise_knowledge_base.json"

COMBINE_FEATURES = [
    "height_in",
    "weight_lb",
    "forty_yd",
    "bench_reps",
    "vertical_in",
    "broad_in",
    "shuttle_20",
    "cone_3",
]


class HistoryContext(BaseModel):
    diagnoses: str = ""
    surgeries: str = ""
    aggravators: str = ""
    prior_therapy_response: str = ""
    timeline_status: str = ""


class RecommendationRequest(BaseModel):
    measurements: Dict[str, float]
    body_regions: List[str] = Field(default_factory=list)
    concerns: str = ""
    history: HistoryContext


def load_combine_data() -> pd.DataFrame:
    df = pd.read_csv(COMBINE_PATH)
    for col in COMBINE_FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    return df


def load_kb() -> List[Dict]:
    with KB_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def nearest_players(user_metrics: Dict[str, float], combine_df: pd.DataFrame, k: int = 5) -> List[Dict]:
    valid_df = combine_df.copy()
    X = valid_df[COMBINE_FEATURES].values.astype(float)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    user_vec = np.array([user_metrics.get(col, 0.0) for col in COMBINE_FEATURES], dtype=float).reshape(1, -1)
    user_scaled = scaler.transform(user_vec)
    dists = np.linalg.norm(X_scaled - user_scaled, axis=1)
    valid_df["distance"] = dists
    cols = ["player", "year", "position", *COMBINE_FEATURES, "distance"]
    return valid_df.sort_values("distance", ascending=True).head(k)[cols].to_dict(orient="records")


def rag_recommend(kb: List[Dict], body_regions: List[str], concerns_text: str, history_context: str) -> List[Dict]:
    region_text = " ".join(body_regions)
    query = f"regions {region_text} concerns {concerns_text} history {history_context}"
    corpus = []
    for item in kb:
        corpus.append(
            " ".join(
                [
                    item.get("name", ""),
                    " ".join(item.get("body_regions", [])),
                    " ".join(item.get("target_muscles", [])),
                    " ".join(item.get("tags", [])),
                    item.get("why", ""),
                    item.get("instructions", ""),
                ]
            )
        )
    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(corpus)
    q = vectorizer.transform([query])
    sim = cosine_similarity(q, X)[0]
    for idx, item in enumerate(kb):
        overlaps = len(set(item.get("body_regions", [])) & set(body_regions))
        sim[idx] += overlaps * 0.12
        if "surgery" in history_context.lower() and "post_surgery" in item.get("tags", []):
            sim[idx] += 0.15

    top_idx = np.argsort(sim)[::-1][:4]
    out: List[Dict] = []
    for i in top_idx:
        if sim[i] <= 0:
            continue
        item = kb[i]
        out.append(
            {
                "name": item["name"],
                "score": float(sim[i]),
                "why": item["why"],
                "instructions": item["instructions"],
                "dosage": item["dosage"],
                "regions": item.get("body_regions", []),
                "target_muscles": item.get("target_muscles", []),
                "caution": item.get("contraindications", "N/A"),
            }
        )
    return out


app = FastAPI(title="NFL Therapy Web3D API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

COMBINE_DF = load_combine_data()
KB = load_kb()


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/recommend")
def recommend(payload: RecommendationRequest) -> Dict[str, List[Dict]]:
    history_text = " | ".join(
        [
            payload.history.diagnoses,
            payload.history.surgeries,
            payload.history.aggravators,
            payload.history.prior_therapy_response,
            payload.history.timeline_status,
        ]
    )
    return {
        "nearest_players": nearest_players(payload.measurements, COMBINE_DF),
        "therapy_recommendations": rag_recommend(KB, payload.body_regions, payload.concerns, history_text),
    }
