# Machine-Learning-Projects

This repository contains coursework notebooks and related experiments.

## NFL therapy / combine prototype (2023)

**This is a prototype from 2023.** It is not production software, not medical advice, and not affiliated with the NFL. Use for learning and demos only.

Included builds:

| Folder | What it is |
|--------|------------|
| `nfl_therapy_web3d/` | **Recommended:** React + Three.js frontend, FastAPI backend — 3D body picking, combine comparison, local RAG-style exercise suggestions. See `nfl_therapy_web3d/README.md`. |
| `nfl_therapy_app/` | Earlier Streamlit single-app version. See `nfl_therapy_app/README.md`. |

### Quick run (web3d)

**Backend**

```bash
cd nfl_therapy_web3d/backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

**Frontend** (second terminal)

```bash
cd nfl_therapy_web3d/frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Place optional `football_player.glb` in `nfl_therapy_web3d/frontend/public/models/` if you have a licensed player mesh; otherwise the demo asset in that folder is used when present.
