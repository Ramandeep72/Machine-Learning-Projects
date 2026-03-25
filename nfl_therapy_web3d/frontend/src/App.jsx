import { Component, Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { getRecommendations } from "./api";
import { aggregateMusclesForRegions, getAtlasEntry, MUSCLE_ATLAS } from "./muscleData.js";
import { FootballPlayerMesh } from "./FootballPlayerMesh.jsx";
import { publicAssetUrl, urlLooksLikeBinaryGlb } from "./glbUtils.js";

/** Centerline parts + left arm; right arm mirrored in BodyModel */
const REGION_PARTS = [
  { id: "shoulder", kind: "sphere", pos: [0, 1.52, 0], scale: [0.22, 0.14, 0.2], shortLabel: "Shoulder" },
  { id: "upper_back", kind: "rounded", pos: [0, 1.18, -0.02], scale: [0.4, 0.32, 0.22], shortLabel: "Upper back" },
  { id: "core", kind: "rounded", pos: [0, 0.88, 0.02], scale: [0.36, 0.28, 0.22], shortLabel: "Core" },
  { id: "low_back", kind: "rounded", pos: [0, 0.58, -0.02], scale: [0.36, 0.18, 0.2], shortLabel: "Low back" },
  { id: "hip", kind: "rounded", pos: [0, 0.34, 0], scale: [0.4, 0.15, 0.26], shortLabel: "Hip" },
  { id: "groin", kind: "rounded", pos: [0, 0.16, 0.04], scale: [0.14, 0.08, 0.14], shortLabel: "Groin" },
  { id: "thigh", kind: "rounded", pos: [0, -0.08, 0.02], scale: [0.24, 0.36, 0.2], shortLabel: "Quad / thigh" },
  { id: "knee", kind: "rounded", pos: [0, -0.42, 0], scale: [0.22, 0.1, 0.18], shortLabel: "Knee" },
  { id: "calf", kind: "rounded", pos: [0, -0.72, -0.02], scale: [0.18, 0.28, 0.16], shortLabel: "Calf" },
  { id: "ankle", kind: "rounded", pos: [0, -1.02, 0], scale: [0.2, 0.1, 0.16], shortLabel: "Ankle" },
  { id: "elbow", kind: "capsule", pos: [-0.52, 0.9, 0], scale: [0.14, 0.22, 0.14], shortLabel: "Elbow" },
  { id: "wrist", kind: "capsule", pos: [-0.74, 0.68, 0], scale: [0.1, 0.14, 0.1], shortLabel: "Wrist" }
];

function BodyPart({
  id,
  kind,
  pos,
  scale,
  shortLabel,
  selected,
  hoveredId,
  onToggle,
  onHover,
  onFocus
}) {
  const isHot = hoveredId === id;
  const color = selected ? "#e63946" : isHot ? "#a8dadc" : "#6b8cae";
  const emissive = selected ? "#330000" : "#000000";

  const mat = (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={selected ? 0.35 : 0}
      transparent
      opacity={0.92}
      roughness={0.45}
      metalness={0.15}
    />
  );

  const handlers = {
    onClick: (e) => {
      e.stopPropagation();
      onToggle(id);
      onFocus(id);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
      onHover(id);
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
      onHover(null);
    }
  };

  const labelVisible = isHot || selected;

  let body;
  if (kind === "sphere") {
    body = (
      <mesh position={pos} scale={scale} {...handlers}>
        <sphereGeometry args={[1, 28, 28]} />
        {mat}
      </mesh>
    );
  } else if (kind === "capsule") {
    body = (
      <mesh position={pos} scale={scale} rotation={[0, 0, Math.PI / 2]} {...handlers}>
        <capsuleGeometry args={[1, 1.2, 6, 12]} />
        {mat}
      </mesh>
    );
  } else {
    body = (
      <RoundedBox position={pos} scale={scale} radius={0.06} smoothness={3} {...handlers}>
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={selected ? 0.35 : 0}
          transparent
          opacity={0.92}
          roughness={0.45}
          metalness={0.1}
        />
      </RoundedBox>
    );
  }

  return (
    <group>
      {body}
      {labelVisible && (
        <Html position={[pos[0], pos[1] + (scale[1] * 0.55 + 0.08), pos[2]]} center style={{ pointerEvents: "none" }}>
          <div className="region-tag">{shortLabel}</div>
        </Html>
      )}
    </group>
  );
}

/** Fallback if GLB fails to parse */
function PrimitiveBodyModel({
  selectedRegions,
  setSelectedRegions,
  hoveredRegion,
  setHoveredRegion,
  setFocusedRegion
}) {
  const allParts = useMemo(() => {
    const arms = REGION_PARTS.filter((p) => p.id === "elbow" || p.id === "wrist");
    const base = REGION_PARTS.filter((p) => p.id !== "elbow" && p.id !== "wrist");
    const rightArms = arms.map((p) => ({
      ...p,
      pos: [Math.abs(p.pos[0]), p.pos[1], p.pos[2]]
    }));
    return [...base, ...arms, ...rightArms];
  }, []);

  const toggleRegion = (region) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  return (
    <>
      <mesh
        position={[0, 1.9, 0]}
        onClick={(e) => {
          e.stopPropagation();
          toggleRegion("neck_head");
          setFocusedRegion("neck_head");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          setHoveredRegion("neck_head");
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          setHoveredRegion(null);
        }}
      >
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial
          color={selectedRegions.includes("neck_head") ? "#e63946" : hoveredRegion === "neck_head" ? "#a8dadc" : "#6b8cae"}
          emissive={selectedRegions.includes("neck_head") ? "#330000" : "#000000"}
          emissiveIntensity={selectedRegions.includes("neck_head") ? 0.35 : 0}
          roughness={0.4}
        />
      </mesh>
      {(hoveredRegion === "neck_head" || selectedRegions.includes("neck_head")) && (
        <Html position={[0, 2.12, 0]} center style={{ pointerEvents: "none" }}>
          <div className="region-tag">Neck / head</div>
        </Html>
      )}
      {allParts.map((p, idx) => (
        <BodyPart
          key={`${p.id}-${idx}`}
          id={p.id}
          kind={p.kind}
          pos={p.pos}
          scale={p.scale}
          shortLabel={p.shortLabel}
          selected={selectedRegions.includes(p.id)}
          hoveredId={hoveredRegion}
          onToggle={toggleRegion}
          onHover={setHoveredRegion}
          onFocus={setFocusedRegion}
        />
      ))}
    </>
  );
}

class MeshErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error) {
    console.error("[GLB / 3D mesh]", error);
  }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error);
      return (
        <>
          <Html position={[0, 1.35, 0]} center>
            <div className="glb-error-box">
              <strong>GLB error</strong> — using primitive body
              <p className="glb-error-detail">{msg}</p>
              <p className="glb-error-hint">
                Put a real <strong>binary .glb</strong> in <code>frontend/public/models/</code>. If{" "}
                <code>football_player.glb</code> is an HTML page or corrupt, <strong>delete it</strong> — the app
                will use <code>demo_character.glb</code>. Restart <code>npm run dev</code> after fixing files.
              </p>
            </div>
          </Html>
          {this.props.fallbackChildren}
        </>
      );
    }
    return this.props.children;
  }
}

function BodyModel({
  glbUrl,
  pickingMode,
  onMeshInventoryReady,
  selectedRegions,
  setSelectedRegions,
  hoveredRegion,
  setHoveredRegion,
  setFocusedRegion
}) {
  const shared = {
    selectedRegions,
    setSelectedRegions,
    hoveredRegion,
    setHoveredRegion,
    setFocusedRegion,
    pickingMode,
    onMeshInventoryReady
  };

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 6, 4]} intensity={1.15} />
      <directionalLight position={[-2, 3, -3]} intensity={0.4} />
      <hemisphereLight args={["#8a9ab0", "#1a1a1a", 0.35]} />
      <MeshErrorBoundary key={glbUrl} fallbackChildren={<PrimitiveBodyModel {...shared} />}>
        <Suspense
          fallback={
            <Html position={[0, 1.1, 0]} center>
              <div className="region-tag">Loading player mesh…</div>
            </Html>
          }
        >
          <FootballPlayerMesh url={glbUrl} skeletonView={true} {...shared} />
        </Suspense>
      </MeshErrorBoundary>
      <OrbitControls makeDefault enablePan={false} minDistance={1.8} maxDistance={5.5} target={[0, 1.05, 0]} />
    </>
  );
}

function MuscleGuidePanel({ focusedRegion, selectedRegions }) {
  const showId = focusedRegion || (selectedRegions.length === 1 ? selectedRegions[0] : null);
  const entry = showId ? getAtlasEntry(showId) : null;
  const combinedMuscles = aggregateMusclesForRegions(selectedRegions);

  return (
    <div className="muscle-panel">
      <h3>Muscles & pain context</h3>
      <p className="muscle-hint">
        Click or hover a body area. If your GLB uses named submeshes/materials, we map those to regions (see{" "}
        <code>meshRegionMap.js</code>). Selected areas feed the exercise matcher below.
      </p>
      {entry ? (
        <div className="muscle-detail">
          <h4>{entry.title}</h4>
          <p className="muscle-sub">Primary muscles in this zone</p>
          <ul>
            {entry.muscles.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          {entry.alsoInvolved?.length > 0 && (
            <>
              <p className="muscle-sub">Also commonly involved</p>
              <ul className="also">
                {entry.alsoInvolved.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          )}
          <p className="muscle-sub">Why this matters for pain</p>
          <p className="muscle-context">{entry.painContext}</p>
          <p className="muscle-sub">Typical rehab / strength focus</p>
          <p className="muscle-focus">{entry.typicalFocus}</p>
        </div>
      ) : selectedRegions.length > 1 ? (
        <div className="muscle-detail">
          <h4>Multiple areas selected</h4>
          <p className="muscle-context">Combined muscle targets we’ll emphasize in retrieval:</p>
          <ul>
            {combinedMuscles.slice(0, 12).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          {combinedMuscles.length > 12 && <p className="muscle-hint">…and more. Click one region to see full detail.</p>}
        </div>
      ) : (
        <div className="muscle-placeholder">
          <p>Select a region on the model to see which muscles you’re addressing and how that relates to pain.</p>
          <p className="muscle-hint">Regions: {Object.keys(MUSCLE_ATLAS).length} zones with muscle-level copy.</p>
        </div>
      )}
    </div>
  );
}

const defaultMeasurements = {
  height_in: 73,
  weight_lb: 210,
  forty_yd: 4.75,
  bench_reps: 12,
  vertical_in: 32,
  broad_in: 115,
  shuttle_20: 4.4,
  cone_3: 7.2
};

const defaultHistory = {
  diagnoses: "",
  surgeries: "",
  aggravators: "",
  prior_therapy_response: "",
  timeline_status: ""
};

export default function App() {
  /** Resolved after we verify bytes (avoids loading a fake .glb that is actually HTML). */
  const [glbUrl, setGlbUrl] = useState(/** @type {string | null} */ (null));
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [focusedRegion, setFocusedRegion] = useState(null);
  const [measurements, setMeasurements] = useState(defaultMeasurements);
  const [concerns, setConcerns] = useState("");
  const [history, setHistory] = useState(defaultHistory);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pickingMode, setPickingMode] = useState(
    /** @type {'mesh_first' | 'orbs_only' | 'mesh_only'} */ ("mesh_first")
  );
  const [meshInventory, setMeshInventory] = useState(
    /** @type {{ meshName: string; path: string; materialNames: string[] }[]} */ ([])
  );
  const [showMeshDebug, setShowMeshDebug] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const custom = publicAssetUrl("models/football_player.glb");
      const demo = publicAssetUrl("models/demo_character.glb");
      if (!cancelled && (await urlLooksLikeBinaryGlb(custom))) {
        setGlbUrl(custom);
        return;
      }
      if (!cancelled) {
        setGlbUrl(demo);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = { measurements, body_regions: selectedRegions, concerns, history };
      const data = await getRecommendations(payload);
      setResult(data);
    } catch (e) {
      setError(e.message || "Failed to fetch recommendations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>NFL Combine + 3D Therapy RAG</h1>
      <p className="note">
        Full <strong>GLB mesh</strong> (helmet/gear when you add <code>public/models/football_player.glb</code>) with a neutral clay look.{" "}
        <strong>Per-muscle picking:</strong> raycast hits named submeshes/materials first (rules in <code>src/meshRegionMap.js</code>), then fallback orbs — drag to orbit.
      </p>
      <p className="model-path">
        Active mesh:{" "}
        <code>
          {!glbUrl
            ? "checking…"
            : glbUrl.includes("football_player")
              ? "football_player.glb (yours)"
              : "demo_character.glb (replace with your NFL player GLB)"}
        </code>
      </p>
      <div className="layout">
        <section className="card card-body">
          <h2>Interactive body — muscle-aware</h2>
          <div className="picking-toolbar">
            <label>
              Picking mode{" "}
              <select value={pickingMode} onChange={(e) => setPickingMode(e.target.value)}>
                <option value="mesh_first">Mesh names first, then orbs</option>
                <option value="orbs_only">Orbs only (opaque mesh blocks rays)</option>
                <option value="mesh_only">Mesh names only (hide orbs)</option>
              </select>
            </label>
            <button type="button" className="btn-secondary" onClick={() => setShowMeshDebug((v) => !v)}>
              {showMeshDebug ? "Hide" : "Show"} mesh / material names
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                console.table(meshInventory);
              }}
            >
              Log names to console
            </button>
          </div>
          {showMeshDebug && (
            <div className="mesh-debug">
              <p className="muscle-hint">
                Use these names to extend <code>DEFAULT_MESH_REGION_RULES</code> in <code>meshRegionMap.js</code>. Material names are preserved on the clay shader.
              </p>
              <div className="mesh-debug-scroll">
                <table className="mesh-debug-table">
                  <thead>
                    <tr>
                      <th>Mesh</th>
                      <th>Path</th>
                      <th>Materials</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meshInventory.map((row, i) => (
                      <tr key={`${row.path}-${i}`}>
                        <td>{row.meshName}</td>
                        <td className="mono">{row.path}</td>
                        <td className="mono">{row.materialNames.filter(Boolean).join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {meshInventory.length === 0 && <p className="muscle-hint">Load a GLB to populate this list.</p>}
              </div>
            </div>
          )}
          <div className="body-split">
            <div className="canvas-wrap canvas-wrap--loading">
              {glbUrl ? (
                <Canvas camera={{ position: [0, 0.85, 3.25], fov: 42 }} gl={{ antialias: true }}>
                  <BodyModel
                    glbUrl={glbUrl}
                    pickingMode={pickingMode}
                    onMeshInventoryReady={setMeshInventory}
                    selectedRegions={selectedRegions}
                    setSelectedRegions={setSelectedRegions}
                    hoveredRegion={hoveredRegion}
                    setHoveredRegion={setHoveredRegion}
                    setFocusedRegion={setFocusedRegion}
                  />
                </Canvas>
              ) : (
                <div className="canvas-placeholder">Checking model files…</div>
              )}
            </div>
            <MuscleGuidePanel focusedRegion={focusedRegion} selectedRegions={selectedRegions} />
          </div>
          <p className="selection-line">
            <strong>Selected for RAG:</strong> {selectedRegions.length ? selectedRegions.join(", ") : "none"}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedRegions([]);
              setFocusedRegion(null);
            }}
          >
            Clear regions
          </button>
        </section>

        <section className="card">
          <h2>Inputs</h2>
          <div className="grid">
            {Object.keys(measurements).map((k) => (
              <label key={k}>
                {k}
                <input
                  type="number"
                  step="0.01"
                  value={measurements[k]}
                  onChange={(e) => setMeasurements({ ...measurements, [k]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
          <label>
            Concerns
            <textarea value={concerns} onChange={(e) => setConcerns(e.target.value)} />
          </label>
          <h3>Medical History Context</h3>
          {Object.keys(history).map((k) => (
            <label key={k}>
              {k}
              <textarea value={history[k]} onChange={(e) => setHistory({ ...history, [k]: e.target.value })} />
            </label>
          ))}
          <button className="primary" onClick={submit} disabled={loading}>
            {loading ? "Generating..." : "Generate Recommendations"}
          </button>
          {error && <p className="error">{error}</p>}
        </section>
      </div>

      {result && (
        <div className="results">
          <section className="card">
            <h2>Closest First-Round Combine Profiles</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Player</th><th>Year</th><th>Pos</th><th>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.nearest_players.map((p) => (
                    <tr key={`${p.player}-${p.year}`}>
                      <td>{p.player}</td><td>{p.year}</td><td>{p.position}</td><td>{p.distance.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card">
            <h2>Therapy Recommendations</h2>
            {result.therapy_recommendations.map((r) => (
              <article key={r.name} className="rec">
                <h3>{r.name}</h3>
                <p><strong>Match:</strong> {r.score.toFixed(3)}</p>
                <p><strong>Why:</strong> {r.why}</p>
                <p><strong>Instructions:</strong> {r.instructions}</p>
                <p><strong>Dosage:</strong> {r.dosage}</p>
                <p><strong>Body regions:</strong> {r.regions.join(", ")}</p>
                {r.target_muscles?.length > 0 && (
                  <p>
                    <strong>Muscles this exercise loads:</strong> {r.target_muscles.join(", ")}
                  </p>
                )}
                <p><strong>Caution:</strong> {r.caution}</p>
              </article>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
