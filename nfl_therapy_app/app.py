from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import streamlit as st
from PIL import Image, ImageDraw
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
from streamlit_image_coordinates import streamlit_image_coordinates


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


def create_body_outline(view: str = "front", width: int = 420, height: int = 760) -> Image.Image:
    img = Image.new("RGB", (width, height), (250, 250, 252))
    draw = ImageDraw.Draw(img)
    line_color = (56, 56, 64)
    fill_skin = (224, 193, 170)
    muscle_tone = (205, 160, 136)
    center = width // 2

    # Head/neck
    draw.ellipse((center - 44, 20, center + 44, 110), fill=fill_skin, outline=line_color, width=3)
    draw.rounded_rectangle((center - 18, 108, center + 18, 145), radius=8, fill=fill_skin, outline=line_color, width=3)

    # Torso silhouette
    torso = [
        (center - 85, 145),
        (center - 120, 220),
        (center - 100, 350),
        (center - 68, 500),
        (center + 68, 500),
        (center + 100, 350),
        (center + 120, 220),
        (center + 85, 145),
    ]
    draw.polygon(torso, fill=fill_skin, outline=line_color)

    # Arms
    draw.rounded_rectangle((center - 170, 175, center - 122, 360), radius=24, fill=fill_skin, outline=line_color, width=3)
    draw.rounded_rectangle((center + 122, 175, center + 170, 360), radius=24, fill=fill_skin, outline=line_color, width=3)
    draw.rounded_rectangle((center - 170, 340, center - 124, 530), radius=22, fill=fill_skin, outline=line_color, width=3)
    draw.rounded_rectangle((center + 124, 340, center + 170, 530), radius=22, fill=fill_skin, outline=line_color, width=3)

    # Legs
    draw.rounded_rectangle((center - 78, 500, center - 18, 735), radius=30, fill=fill_skin, outline=line_color, width=3)
    draw.rounded_rectangle((center + 18, 500, center + 78, 735), radius=30, fill=fill_skin, outline=line_color, width=3)
    draw.ellipse((center - 82, 726, center - 10, 754), fill=fill_skin, outline=line_color, width=3)
    draw.ellipse((center + 10, 726, center + 82, 754), fill=fill_skin, outline=line_color, width=3)

    # Add "medical atlas" style guidance lines
    if view == "front":
        draw.line((center, 145, center, 500), fill=line_color, width=2)
        draw.arc((center - 58, 200, center + 58, 320), start=200, end=340, fill=muscle_tone, width=3)
        draw.arc((center - 52, 320, center + 52, 450), start=20, end=160, fill=muscle_tone, width=3)
    else:
        draw.line((center - 35, 190, center + 35, 190), fill=muscle_tone, width=3)
        draw.line((center - 45, 290, center + 45, 290), fill=muscle_tone, width=3)
        draw.line((center - 32, 405, center + 32, 405), fill=muscle_tone, width=3)
        draw.arc((center - 70, 225, center + 70, 470), start=80, end=100, fill=muscle_tone, width=3)

    return img


def point_to_region(x: float, y: float, width: int = 420, height: int = 760) -> str:
    center = width // 2
    if y < 120:
        return "neck_head"
    if 120 <= y < 210 and abs(x - center) <= 130:
        return "shoulder"
    if 210 <= y < 330 and abs(x - center) <= 95:
        return "upper_back"
    if 330 <= y < 465 and abs(x - center) <= 95:
        return "low_back"
    if 390 <= y < 530 and 60 < abs(x - center) <= 120:
        return "hip"
    if 470 <= y < 550 and abs(x - center) <= 115:
        return "groin"
    if 530 <= y < 640 and 20 <= abs(x - center) <= 95:
        return "knee"
    if 640 <= y < 760 and 20 <= abs(x - center) <= 95:
        return "ankle"
    if 160 <= y < 360 and 120 < abs(x - center) <= 175:
        return "elbow"
    if 360 <= y < 560 and 120 < abs(x - center) <= 175:
        return "wrist"
    return "core"


def draw_points(base: Image.Image, points: List[Tuple[int, int]]) -> Image.Image:
    img = base.copy()
    draw = ImageDraw.Draw(img)
    for x, y in points:
        draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=(220, 0, 0), outline=(120, 0, 0), width=1)
    return img


@st.cache_data
def load_combine_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    for col in COMBINE_FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    return df


@st.cache_data
def load_kb(path: Path) -> List[Dict]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def nearest_players(user_metrics: Dict[str, float], combine_df: pd.DataFrame, k: int = 5) -> pd.DataFrame:
    valid_df = combine_df.copy()
    X = valid_df[COMBINE_FEATURES].values.astype(float)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    user_vec = np.array([user_metrics.get(col, 0.0) for col in COMBINE_FEATURES], dtype=float).reshape(1, -1)
    user_scaled = scaler.transform(user_vec)
    dists = np.linalg.norm(X_scaled - user_scaled, axis=1)
    valid_df["distance"] = dists
    return valid_df.sort_values("distance", ascending=True).head(k)


def rag_recommend(
    kb: List[Dict], body_regions: List[str], concerns_text: str, history_context: str, top_k: int = 4
) -> List[Tuple[Dict, float]]:
    region_text = " ".join(body_regions)
    query = f"body regions {region_text} concerns {concerns_text} medical history {history_context}"

    corpus = []
    for item in kb:
        corpus.append(
            " ".join(
                [
                    item.get("name", ""),
                    " ".join(item.get("body_regions", [])),
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

    top_idx = np.argsort(sim)[::-1][:top_k]
    return [(kb[i], float(sim[i])) for i in top_idx if sim[i] > 0]


def main() -> None:
    st.set_page_config(page_title="NFL Combine + Therapy Recommender", layout="wide")
    st.title("NFL First-Round Combine Comparator + Therapy RAG")
    st.caption(
        "Educational prototype. This does not replace medical evaluation. "
        "Use licensed sports medicine guidance for diagnosis and return-to-play decisions."
    )

    combine_df = load_combine_data(COMBINE_PATH)
    kb = load_kb(KB_PATH)

    st.subheader("1) Enter Your Measurements / Combine Metrics")
    c1, c2, c3, c4 = st.columns(4)
    user_metrics = {
        "height_in": c1.number_input("Height (in)", min_value=60.0, max_value=90.0, value=73.0),
        "weight_lb": c2.number_input("Weight (lb)", min_value=140.0, max_value=400.0, value=210.0),
        "forty_yd": c3.number_input("40-yard dash (sec)", min_value=3.9, max_value=7.0, value=4.75),
        "bench_reps": c4.number_input("Bench reps", min_value=0.0, max_value=60.0, value=12.0),
        "vertical_in": c1.number_input("Vertical jump (in)", min_value=0.0, max_value=50.0, value=32.0),
        "broad_in": c2.number_input("Broad jump (in)", min_value=0.0, max_value=150.0, value=115.0),
        "shuttle_20": c3.number_input("20-yard shuttle (sec)", min_value=0.0, max_value=6.0, value=4.4),
        "cone_3": c4.number_input("3-cone (sec)", min_value=0.0, max_value=9.5, value=7.2),
    }

    st.subheader("2) Mark Pain / Injury Points on the Body")
    st.write("Click points on the anatomical model where you feel pain, had surgery, or have movement issues.")
    body_view = st.radio("Body view", options=["front", "back"], horizontal=True)
    body_img = create_body_outline(view=body_view)

    if "body_points" not in st.session_state:
        st.session_state["body_points"] = []
    if "last_click" not in st.session_state:
        st.session_state["last_click"] = None

    display_img = draw_points(body_img, st.session_state["body_points"])
    click = streamlit_image_coordinates(display_img, key=f"body_click_map_{body_view}")
    if click and "x" in click and "y" in click:
        current = (int(click["x"]), int(click["y"]))
        if st.session_state["last_click"] != current:
            st.session_state["body_points"].append(current)
            st.session_state["last_click"] = current

    if st.button("Clear body points"):
        st.session_state["body_points"] = []
        st.session_state["last_click"] = None

    marked_regions: List[str] = []
    for x, y in st.session_state["body_points"]:
        marked_regions.append(point_to_region(float(x), float(y)))
    marked_regions = sorted(list(set(marked_regions)))

    st.write("Detected body regions:", ", ".join(marked_regions) if marked_regions else "None selected yet")

    concerns_text = st.text_area(
        "Describe pain/discrepancies",
        placeholder="Example: Right knee pain when decelerating, left hip stiffness in deep squat.",
    )
    st.subheader("3) Medical Injury History Context for RAG")
    hx1, hx2 = st.columns(2)
    diagnoses = hx1.text_area(
        "Diagnoses / known issues",
        placeholder="Example: Patellar tendinopathy, lumbar disc bulge, hip impingement.",
    )
    surgeries = hx2.text_area(
        "Surgeries and dates",
        placeholder="Example: Left ACL reconstruction (2023), right meniscus repair (2021).",
    )
    aggravators = hx1.text_area(
        "What movements aggravate symptoms?",
        placeholder="Example: Deep squat, sprint deceleration, cutting left.",
    )
    prior_pt = hx2.text_area(
        "Prior therapy/training response",
        placeholder="Example: Isometrics helped pain, plyos still flare symptoms.",
    )
    timeline = st.text_input(
        "Timeline / current status",
        placeholder="Example: 8 months post-op, in return-to-run phase.",
    )

    if st.button("Generate Comparison + Therapy Recommendations", type="primary"):
        st.subheader("Closest First-Round Combine Profiles")
        nearest = nearest_players(user_metrics, combine_df, k=5)
        st.dataframe(
            nearest[
                [
                    "player",
                    "year",
                    "position",
                    "height_in",
                    "weight_lb",
                    "forty_yd",
                    "bench_reps",
                    "vertical_in",
                    "broad_in",
                    "shuttle_20",
                    "cone_3",
                    "distance",
                ]
            ],
            use_container_width=True,
        )

        st.subheader("Therapy Recommendations (RAG)")
        history_context = " | ".join([diagnoses, surgeries, aggravators, prior_pt, timeline])
        recs = rag_recommend(kb, marked_regions, concerns_text, history_context, top_k=4)

        if not recs:
            st.info("No strong matches yet. Add body points and more detail in concerns for better retrieval.")
        else:
            for item, score in recs:
                st.markdown(f"### {item['name']}")
                st.write(f"**Match score:** {score:.3f}")
                st.write(f"**Why:** {item['why']}")
                st.write(f"**Instructions:** {item['instructions']}")
                st.write(f"**Dosage:** {item['dosage']}")
                st.write(f"**Use for regions:** {', '.join(item.get('body_regions', []))}")
                st.write(f"**Caution:** {item.get('contraindications', 'N/A')}")
                st.divider()


if __name__ == "__main__":
    main()
