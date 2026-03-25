/**
 * Map GLTF mesh / material / parent names → therapy region IDs (same keys as muscleData.js).
 *
 * Add or edit rules to match YOUR asset’s naming (Blender object names, Maya shape names, etc.).
 * Matching is case-insensitive. We concatenate mesh name + parent names + saved material names.
 *
 * `patterns`: substring match unless a string starts with `regex:` then the rest is a RegExp source.
 * Higher `priority` wins first when multiple rules match.
 */

export const DEFAULT_MESH_REGION_RULES = [
  { regionId: "neck_head", label: "Neck / head", priority: 30, patterns: ["head", "neck", "skull", "cervical", "helmet", "face_mask", "facemask", "chinstrap"] },
  { regionId: "shoulder", label: "Shoulder", priority: 28, patterns: ["deltoid", "delt", "shoulder", "clavicle", "scapula", "trap", "trapezius", "shoulder_pad", "shoulderpad"] },
  { regionId: "upper_back", label: "Upper back", priority: 26, patterns: ["rhomboid", "upper_back", "upperback", "thoracic", "lat", "lats", "latissimus", "mid_back", "midback", "scapula"] },
  { regionId: "elbow", label: "Elbow", priority: 24, patterns: ["elbow", "olecranon", "brachialis", "forearm_prox"] },
  { regionId: "wrist", label: "Wrist", priority: 22, patterns: ["wrist", "hand", "carpal", "forearm_dist", "glove"] },
  { regionId: "core", label: "Core", priority: 25, patterns: ["rectus_ab", "rectusab", "oblique", "abs", "abdominal", "core", "transverse", "six_pack", "torso_front"] },
  { regionId: "low_back", label: "Low back", priority: 25, patterns: ["lumbar", "low_back", "lowback", "erector", "multifidus", "ql", "quadratus", "psoas"] },
  { regionId: "hip", label: "Hip", priority: 24, patterns: ["glute", "gluteus", "hip", "piriformis", "trochanter", "ilium"] },
  { regionId: "groin", label: "Groin", priority: 23, patterns: ["adductor", "groin", "gracilis", "sartorius_inner", "inner_thigh"] },
  { regionId: "thigh", label: "Quad / thigh", priority: 22, patterns: ["quad", "quadriceps", "vastus", "vmo", "rectus_fem", "rectusfem", "thigh", "femur_shaft", "hamstring", "biceps_fem"] },
  { regionId: "knee", label: "Knee", priority: 24, patterns: ["knee", "patella", "patellar", "meniscus", "ligament_collateral", "acl", "pcl"] },
  { regionId: "calf", label: "Calf", priority: 22, patterns: ["calf", "soleus", "gastroc", "gastrocnemius"] },
  { regionId: "ankle", label: "Ankle", priority: 22, patterns: ["ankle", "achilles", "tibia_dist", "fibula_dist", "malleolus", "foot", "cleat", "shoe"] }
];

function compilePattern(p) {
  if (typeof p !== "string") return { type: "regex", re: p };
  if (p.startsWith("regex:")) {
    try {
      return { type: "regex", re: new RegExp(p.slice(6), "i") };
    } catch {
      return { type: "substr", s: p.toLowerCase() };
    }
  }
  return { type: "substr", s: p.toLowerCase() };
}

function collectNameTokens(object3d) {
  const tokens = [];
  let o = object3d;
  let depth = 0;
  while (o && depth < 24) {
    if (o.name && String(o.name).trim()) {
      tokens.push(String(o.name).toLowerCase());
    }
    if (o.userData?._therapyMaterialNames?.length) {
      for (const n of o.userData._therapyMaterialNames) {
        if (n && String(n).trim()) tokens.push(String(n).toLowerCase());
      }
    }
    o = o.parent;
    depth += 1;
  }
  return tokens;
}

/**
 * @param {import('three').Object3D} object3d - usually the raycast hit mesh
 * @param {typeof DEFAULT_MESH_REGION_RULES} rules
 * @returns {{ id: string, label?: string } | null}
 */
export function resolveMeshToRegion(object3d, rules = DEFAULT_MESH_REGION_RULES) {
  if (!object3d) return null;
  const tokens = collectNameTokens(object3d);
  if (tokens.length === 0) return null;
  const haystack = tokens.join(" ");

  const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of sorted) {
    for (const raw of rule.patterns) {
      const pat = compilePattern(raw);
      if (pat.type === "regex") {
        if (pat.re.test(haystack)) {
          return { id: rule.regionId, label: rule.label };
        }
      } else if (haystack.includes(pat.s)) {
        return { id: rule.regionId, label: rule.label };
      }
    }
  }
  return null;
}

/**
 * For debug UI: list unique mesh paths in a scene.
 * @param {import('three').Object3D} root
 */
export function listMeshNameInventory(root) {
  const rows = [];
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    if (!child.isMesh) return;
    const path = [];
    let o = child;
    while (o && o !== root && o.parent) {
      path.unshift(o.name || "(unnamed)");
      o = o.parent;
    }
    const matNames = child.userData?._therapyMaterialNames ?? [];
    rows.push({
      meshName: child.name || "(unnamed)",
      path: path.join(" / "),
      materialNames: [...matNames]
    });
  });
  return rows;
}
