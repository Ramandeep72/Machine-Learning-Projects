import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";
import { listMeshNameInventory, resolveMeshToRegion } from "./meshRegionMap.js";

/** Layer 0 = character mesh (per-muscle picking). Layer 1 = fallback hit orbs. */
const LAYER_BODY = 0;
const LAYER_ORBS = 1;

/**
 * Saves material names, applies clay materials while preserving material.name for rule matching.
 */
function normalizeAndStyleScene(scene) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const targetHeight = 2.15;
  const s = targetHeight / Math.max(size.y, 0.001);
  scene.scale.setScalar(s);
  scene.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  scene.updateMatrixWorld(true);

  const baseMat = new THREE.MeshStandardMaterial({
    color: "#bdbdbd",
    metalness: 0.06,
    roughness: 0.8
  });

  scene.traverse((child) => {
    if (!child.isMesh) return;
    const prev = Array.isArray(child.material) ? child.material : [child.material];
    child.userData._therapyMaterialNames = prev.map((m) => m?.name || "");
    const next = prev.map((old) => {
      const nm = baseMat.clone();
      if (old?.name) nm.name = old.name;
      return nm;
    });
    prev.forEach((m) => m?.dispose?.());
    child.material = next.length === 1 ? next[0] : next;
    child.castShadow = true;
    child.receiveShadow = true;
    child.layers.set(LAYER_BODY);
  });
}

const ZONE_SPECS = [
  { id: "neck_head", shortLabel: "Neck / head", yN: 0.94, xN: 0.5, zN: 0.55, r: 0.07 },
  { id: "shoulder", shortLabel: "Shoulder", yN: 0.86, xN: 0.28, zN: 0.52, r: 0.055, mirrorX: true },
  { id: "upper_back", shortLabel: "Upper back", yN: 0.78, xN: 0.5, zN: 0.22, r: 0.09 },
  { id: "elbow", shortLabel: "Elbow", yN: 0.62, xN: 0.12, zN: 0.55, r: 0.04, mirrorX: true },
  { id: "wrist", shortLabel: "Wrist", yN: 0.52, xN: 0.06, zN: 0.58, r: 0.035, mirrorX: true },
  { id: "core", shortLabel: "Core", yN: 0.58, xN: 0.5, zN: 0.52, r: 0.075 },
  { id: "low_back", shortLabel: "Low back", yN: 0.48, xN: 0.5, zN: 0.25, r: 0.07 },
  { id: "hip", shortLabel: "Hip", yN: 0.4, xN: 0.5, zN: 0.52, r: 0.08 },
  { id: "groin", shortLabel: "Groin", yN: 0.34, xN: 0.5, zN: 0.55, r: 0.045 },
  { id: "thigh", shortLabel: "Quad / thigh", yN: 0.26, xN: 0.5, zN: 0.52, r: 0.08 },
  { id: "knee", shortLabel: "Knee", yN: 0.16, xN: 0.5, zN: 0.52, r: 0.055 },
  { id: "calf", shortLabel: "Calf", yN: 0.1, xN: 0.5, zN: 0.48, r: 0.055 },
  { id: "ankle", shortLabel: "Ankle", yN: 0.03, xN: 0.5, zN: 0.52, r: 0.045 }
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

function buildZonesFromBox(box) {
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxD = Math.max(size.x, size.y, size.z, 0.001);
  const built = [];
  for (const spec of ZONE_SPECS) {
    const add = (xN) => {
      const x = lerp(box.min.x, box.max.x, xN);
      const y = lerp(box.min.y, box.max.y, spec.yN);
      const z = lerp(box.min.z, box.max.z, spec.zN);
      built.push({
        id: spec.id,
        shortLabel: spec.shortLabel,
        position: [x, y, z],
        radius: maxD * spec.r,
        key: `${spec.id}-${xN.toFixed(3)}`
      });
    };
    if (spec.mirrorX) {
      add(spec.xN);
      add(1 - spec.xN);
    } else {
      add(spec.xN);
    }
  }
  return built;
}

/**
 * Auto-align Y positions for orbs using geometry width in Y slices.
 * This helps when the mesh bbox includes different proportions (helmet spikes, cleats, etc).
 */
function buildZonesFromMesh(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxD = Math.max(size.x, size.y, size.z, 0.001);

  // Sample vertices (cap for perf)
  const ySamples = [];
  const verts = [];
  const tmp = new THREE.Vector3();
  const world = new THREE.Vector3();

  let meshCount = 0;
  root.traverse((child) => {
    if (!child.isMesh) return;
    if (!child.geometry?.attributes?.position) return;
    const posAttr = child.geometry.attributes.position;
    const count = posAttr.count || 0;
    if (count <= 0) return;
    meshCount += 1;

    // Downsample to at most ~3500 points
    const stride = Math.max(1, Math.ceil(count / 3500));
    for (let i = 0; i < count; i += stride) {
      tmp.fromBufferAttribute(posAttr, i);
      world.copy(tmp).applyMatrix4(child.matrixWorld);
      root.worldToLocal(world);
      // copy to verts
      const v = { x: world.x, y: world.y, z: world.z };
      verts.push(v);
      ySamples.push(v.y);
    }
  });

  if (verts.length < 200 || meshCount === 0) {
    // Fall back to bbox mapping
    return buildZonesFromBox(box);
  }

  const ySorted = [...ySamples].sort((a, b) => a - b);
  const yAnkle = quantile(ySorted, 0.01);
  const yHead = quantile(ySorted, 0.99);
  const height = Math.max(0.001, yHead - yAnkle);

  // Slice widths along X
  const slices = 24;
  const sliceWidth = new Array(slices).fill(0);
  const sliceCount = new Array(slices).fill(0);
  const sliceMinX = new Array(slices).fill(Infinity);
  const sliceMaxX = new Array(slices).fill(-Infinity);

  for (const v of verts) {
    const t = (v.y - yAnkle) / height;
    if (t < 0 || t > 1) continue;
    const idx = Math.min(slices - 1, Math.floor(t * slices));
    sliceCount[idx] += 1;
    sliceMinX[idx] = Math.min(sliceMinX[idx], v.x);
    sliceMaxX[idx] = Math.max(sliceMaxX[idx], v.x);
  }

  for (let i = 0; i < slices; i++) {
    if (!sliceCount[i]) continue;
    sliceWidth[i] = sliceMaxX[i] - sliceMinX[i];
  }

  // Find shoulder width peak near top half; hip width peak near lower-middle
  let shoulderSlice = Math.floor(slices * 0.55);
  let hipSlice = Math.floor(slices * 0.25);
  let shoulderBestW = -Infinity;
  let hipBestW = -Infinity;

  for (let i = Math.floor(slices * 0.55); i < slices; i++) {
    if (sliceWidth[i] > shoulderBestW) {
      shoulderBestW = sliceWidth[i];
      shoulderSlice = i;
    }
  }
  for (let i = Math.floor(slices * 0.18); i < Math.floor(slices * 0.52); i++) {
    if (sliceWidth[i] > hipBestW) {
      hipBestW = sliceWidth[i];
      hipSlice = i;
    }
  }

  const shoulderY = yAnkle + ((shoulderSlice + 0.5) / slices) * height;
  const hipY = yAnkle + ((hipSlice + 0.5) / slices) * height;

  // Map old ZONE_SPECS yN through new anchors:
  // old anchors: head=1.0, shoulder=0.86, hip=0.4, ankle=0.03
  const oldHead = 1.0;
  const oldShoulder = 0.86;
  const oldHip = 0.4;
  const oldAnkle = 0.03;

  const yForOldY = (oldY) => {
    if (oldY >= oldShoulder) {
      const t = (oldY - oldShoulder) / Math.max(0.0001, oldHead - oldShoulder);
      return lerp(shoulderY, yHead, t);
    }
    if (oldY >= oldHip) {
      const f = (oldY - oldHip) / Math.max(0.0001, oldShoulder - oldHip);
      return lerp(hipY, shoulderY, f);
    }
    // below hip
    const g = (oldY - oldAnkle) / Math.max(0.0001, oldHip - oldAnkle);
    return lerp(yAnkle, hipY, g);
  };

  const built = [];
  for (const spec of ZONE_SPECS) {
    const add = (xN) => {
      const x = lerp(box.min.x, box.max.x, xN);
      const z = lerp(box.min.z, box.max.z, spec.zN);
      const y = yForOldY(spec.yN);
      built.push({
        id: spec.id,
        shortLabel: spec.shortLabel,
        position: [x, y, z],
        radius: maxD * spec.r,
        key: `${spec.id}-${xN.toFixed(3)}`
      });
    };
    if (spec.mirrorX) {
      add(spec.xN);
      add(1 - spec.xN);
    } else {
      add(spec.xN);
    }
  }
  return built;
}

function HitOrb({
  id,
  shortLabel,
  position,
  radius,
  selected,
  hoveredId,
  onHover,
  showOrbVisual
}) {
  const isHot = hoveredId === id;
  const active = selected || isHot;
  return (
    <group position={position}>
      <mesh
        userData={{ __therapyOrb: true, regionId: id, orbLabel: shortLabel }}
        onUpdate={(self) => self.layers.set(LAYER_ORBS)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(id);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          onHover(null);
        }}
      >
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial
          color={selected ? "#e63946" : isHot ? "#7dd3fc" : "#38bdf8"}
          transparent
          opacity={showOrbVisual ? (active ? 0.45 : 0.12) : 0.001}
          depthWrite={false}
          emissive={selected ? "#440000" : "#001a22"}
          emissiveIntensity={selected ? 0.4 : isHot ? 0.2 : 0}
        />
      </mesh>
      {showOrbVisual && active && (
        <Html center style={{ pointerEvents: "none" }}>
          <div className="region-tag">{shortLabel}</div>
        </Html>
      )}
    </group>
  );
}

/**
 * @typedef {'mesh_first' | 'orbs_only' | 'mesh_only'} PickingMode
 */

/**
 * NFL-style GLB + optional per-mesh muscle picking when submesh / material names match rules in `meshRegionMap.js`.
 */
export function FootballPlayerMesh({
  url,
  selectedRegions,
  setSelectedRegions,
  hoveredRegion,
  setHoveredRegion,
  setFocusedRegion,
  pickingMode = "mesh_first",
  skeletonView = true,
  onMeshInventoryReady,
  showFallbackOrbs = true
}) {
  const { scene: source } = useGLTF(url);
  const clone = useMemo(() => cloneSkinnedScene(source), [source]);
  const [zones, setZones] = useState([]);
  const cloneRef = useRef(null);
  const orbGroupRef = useRef(null);
  const skeletonHelperRef = useRef(null);
  const skeletonHelperBuiltRef = useRef(false);
  const inventoryCbRef = useRef(onMeshInventoryReady);
  inventoryCbRef.current = onMeshInventoryReady;
  const { camera } = useThree();

  useLayoutEffect(() => {
    camera.layers.enable(LAYER_ORBS);
  }, [camera]);

  useLayoutEffect(() => {
    normalizeAndStyleScene(clone);
    cloneRef.current = clone;
    clone.updateMatrixWorld(true);
    setZones(buildZonesFromMesh(clone));
    if (skeletonView && !skeletonHelperBuiltRef.current) {
      try {
        skeletonHelperRef.current = new THREE.SkeletonHelper(clone);
        skeletonHelperBuiltRef.current = true;
      } catch {
        skeletonHelperRef.current = null;
      }
    }
    inventoryCbRef.current?.(listMeshNameInventory(clone));
  }, [clone, url]);

  useLayoutEffect(() => {
    // Keep orbs clickable regardless of skeleton view.
    clone.traverse((child) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (!m) return;
        m.transparent = true;
        m.opacity = skeletonView ? 0.03 : 0.92;
      });
    });
  }, [clone, skeletonView]);

  useFrame(() => {
    skeletonHelperRef.current?.update?.();
  });

  const toggleRegion = useCallback(
    (region) => {
      setSelectedRegions((prev) =>
        prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
      );
    },
    [setSelectedRegions]
  );

  const raycastLayer = useCallback((pointer, cam, root, layer) => {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(pointer, cam);
    rc.layers.set(layer);
    if (!root) return [];
    return rc.intersectObject(root, true);
  }, []);

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      const pointer = e.pointer;
      const cam = e.camera;

      const tryBody = () => {
        const hits = raycastLayer(pointer, cam, cloneRef.current, LAYER_BODY);
        for (const h of hits) {
          const r = resolveMeshToRegion(h.object);
          if (r) {
            toggleRegion(r.id);
            setFocusedRegion(r.id);
            return true;
          }
        }
        return false;
      };

      const tryOrbs = () => {
        const hits = raycastLayer(pointer, cam, orbGroupRef.current, LAYER_ORBS);
        for (const h of hits) {
          const id = h.object.userData?.regionId;
          if (id) {
            toggleRegion(id);
            setFocusedRegion(id);
            return true;
          }
        }
        return false;
      };

      if (pickingMode === "mesh_only") {
        tryBody();
        return;
      }
      if (pickingMode === "orbs_only") {
        tryOrbs();
        return;
      }
      /* mesh_first */
      if (tryBody()) return;
      tryOrbs();
    },
    [pickingMode, raycastLayer, toggleRegion, setFocusedRegion]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const pointer = e.pointer;
      const cam = e.camera;

      if (pickingMode === "mesh_only" || pickingMode === "mesh_first") {
        const bodyHits = raycastLayer(pointer, cam, cloneRef.current, LAYER_BODY);
        for (const h of bodyHits) {
          const r = resolveMeshToRegion(h.object);
          if (r) {
            setHoveredRegion(r.id);
            return;
          }
        }
      }
      if (pickingMode === "orbs_only" || pickingMode === "mesh_first") {
        const orbHits = raycastLayer(pointer, cam, orbGroupRef.current, LAYER_ORBS);
        const id = orbHits[0]?.object?.userData?.regionId;
        if (id) {
          setHoveredRegion(id);
          return;
        }
      }
      setHoveredRegion(null);
    },
    [pickingMode, raycastLayer, setHoveredRegion]
  );

  const showOrbVisual = showFallbackOrbs && pickingMode !== "mesh_only";

  return (
    <group>
      {/* GLTF submeshes often need the handler on `primitive` to receive hits in R3F */}
      <primitive object={clone} onClick={handleClick} onPointerMove={handlePointerMove} />
      {skeletonView && skeletonHelperRef.current && <primitive object={skeletonHelperRef.current} />}
      <group
        ref={orbGroupRef}
        visible={pickingMode !== "mesh_only"}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
      >
        {showFallbackOrbs &&
          zones.map((z) => (
            <HitOrb
              key={z.key}
              id={z.id}
              shortLabel={z.shortLabel}
              position={z.position}
              radius={z.radius}
              selected={selectedRegions.includes(z.id)}
              hoveredId={hoveredRegion}
              onHover={setHoveredRegion}
              showOrbVisual={showOrbVisual}
            />
          ))}
      </group>
    </group>
  );
}

useGLTF.preload("/models/demo_character.glb");
