# NFL Therapy Web3D (React + Three.js + FastAPI)

Real web 3D stack version of the app:

- Frontend: React + Vite + Three.js (`@react-three/fiber`)
- Backend: FastAPI + local RAG retrieval over exercise knowledge base

## 1) Start backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

## 2) Start frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Notes

- Loads a **real GLB mesh** (neutral gray “clay” look). Bundled demo: `public/models/demo_character.glb`. For **NFL helmet/pads/cleats**, add `public/models/football_player.glb` — the app auto-switches when that file exists.
- **Per-mesh picking:** if submeshes/materials are named (e.g. `deltoid_L`), rules in `frontend/src/meshRegionMap.js` map them to therapy regions before fallback orbs. Use the UI **Show mesh / material names** to align rules with your asset.
- Click **muscle zones** (semi-transparent orbs aligned to the mesh bbox) to select pain/injury regions. Side panel lists **muscles in that zone**, why they relate to pain, and typical rehab focus.
- After recommendations, each exercise shows **which muscles it loads** (`target_muscles` in the knowledge base).
- Enter medical history context fields; they are injected into retrieval query context for recommendations.
- This is educational software, not medical diagnosis.
