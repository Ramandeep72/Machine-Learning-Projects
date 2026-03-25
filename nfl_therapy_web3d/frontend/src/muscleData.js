/**
 * Educational muscle mapping per clickable 3D region.
 * Not for diagnosis — helps users understand what tissues exercises typically load.
 */
export const MUSCLE_ATLAS = {
  neck_head: {
    title: "Neck & suboccipital region",
    muscles: [
      "Sternocleidomastoid (SCM)",
      "Upper trapezius",
      "Levator scapulae",
      "Suboccipitals (rectus capitis, obliques)"
    ],
    alsoInvolved: ["Deep cervical flexors (longus colli/capitis)"],
    painContext:
      "Neck pain often involves a mix of muscle guarding, posture-driven overload, and sometimes nerve irritation. Strengthening deep neck flexors and improving shoulder blade control often supports the neck.",
    typicalFocus: "Chin tucks, upper trap / levator mobility, scapular stability, graded loading"
  },
  shoulder: {
    title: "Shoulder (glenohumeral)",
    muscles: [
      "Deltoids (anterior, lateral, posterior)",
      "Rotator cuff — supraspinatus, infraspinatus, teres minor, subscapularis"
    ],
    alsoInvolved: ["Serratus anterior", "Lower/mid trapezius"],
    painContext:
      "Shoulder pain frequently ties to rotator cuff tolerance and how the shoulder blade moves. Exercises often progress from isometrics → controlled range → sport-specific loading.",
    typicalFocus: "External rotation, serratus punches, Y/T/W, gradual overhead loading"
  },
  upper_back: {
    title: "Upper / mid back (thoracic)",
    muscles: [
      "Rhomboids",
      "Middle & lower trapezius",
      "Thoracic erector spinae",
      "Latissimus dorsi (upper attachment region)"
    ],
    alsoInvolved: ["Thoracic facet joints / ribs (non-muscular)"],
    painContext:
      "Stiffness here can make the neck and shoulders work harder. Improving thoracic rotation and extension often reduces compensatory strain overhead and in sprint posture.",
    typicalFocus: "Thoracic extension/rotation drills, rowing patterns, scapular retraction endurance"
  },
  core: {
    title: "Core / abdominal wall",
    muscles: [
      "Transverse abdominis",
      "Internal / external obliques",
      "Rectus abdominis"
    ],
    alsoInvolved: ["Pelvic floor (with pelvic pain)", "Diaphragm (breathing)"],
    painContext:
      "A stable core shares load between hips and spine. The goal is usually coordinated bracing with breathing, not maximal crunching.",
    typicalFocus: "Dead bug, side plank, Pallof press, anti-extension / anti-rotation work"
  },
  low_back: {
    title: "Low back (lumbar)",
    muscles: [
      "Lumbar erector spinae",
      "Multifidus",
      "Quadratus lumborum (QL)"
    ],
    alsoInvolved: ["Glutes & hamstrings (often weak → back overload)"],
    painContext:
      "Many athletes feel low-back irritation when hips/glutes don’t share load during hinge/sprint. Training often pairs spine-sparing hinges with hip strength.",
    typicalFocus: "Hip hinge patterning, glute bridge / hip thrust progressions, carries, gradual extension tolerance"
  },
  hip: {
    title: "Hip (glute / lateral hip)",
    muscles: [
      "Gluteus maximus",
      "Gluteus medius & minimus",
      "Deep hip rotators (piriformis, gemelli, obturators)"
    ],
    alsoInvolved: ["Tensor fascia lata (TFL)", "Iliopsoas (front of hip)"],
    painContext:
      "Hip pain with cutting/sprinting often involves how well the hip abductors and rotators control the knee. Lateral hip strength is a common rehab target.",
    typicalFocus: "Side plank hip abduction, clamshells → Copenhagen progressions, single-leg RDL"
  },
  groin: {
    title: "Groin / inner thigh",
    muscles: [
      "Adductor longus, brevis, magnus",
      "Gracilis",
      "Proximal hamstring / adductor junction tissues"
    ],
    alsoInvolved: ["Hip flexors (if anterior groin)"],
    painContext:
      "Groin symptoms in field sports often relate to adductor strength and tolerance for rapid lateral pushes. Progress from isometrics → lengthened strength → cutting.",
    typicalFocus: "Adductor isometrics, Copenhagen side plank line, lateral lunges, graded agility"
  },
  thigh: {
    title: "Thigh (quadriceps)",
    muscles: [
      "Rectus femoris",
      "Vastus lateralis, medialis (VMO), intermedius"
    ],
    alsoInvolved: ["Hamstrings (posterior thigh — separate loading)", "Patellar tendon (tissue, not muscle)"],
    painContext:
      "Anterior thigh / knee pain often involves how the quads tolerate load — especially deceleration and deep knee flexion. Isometrics can calm sensitivity before heavy strength.",
    typicalFocus: "Split squat isometrics, Spanish squat / wall sit, step-downs, progressive squat depth"
  },
  knee: {
    title: "Knee (joint line & patellofemoral)",
    muscles: [
      "Quadriceps (patellar tracking)",
      "Hamstrings (posterior stability)",
      "Popliteus / gastroc (rotation control)"
    ],
    alsoInvolved: ["IT band / lateral quad (lateral knee symptoms)"],
    painContext:
      "Knee pain rehab usually balances quad loading with hip control and sometimes calf/ankle mechanics. After surgery, follow surgeon/PT clearance for depth and speed.",
    typicalFocus: "Quad sets → split squats, step-downs, hamstring eccentrics, return-to-run criteria"
  },
  calf: {
    title: "Calf & Achilles region",
    muscles: ["Gastrocnemius (knee bent vs straight matters)", "Soleus"],
    alsoInvolved: ["Achilles tendon", "Posterior tibialis (medial ankle support)"],
    painContext:
      "Calf/Achilles issues need graded tendon loading — often isometrics first, then slow eccentrics, then plyometrics for return to sprint.",
    typicalFocus: "Single-leg calf raises, seated soleus raises, progressive plyometrics"
  },
  ankle: {
    title: "Ankle / foot",
    muscles: [
      "Tibialis anterior",
      "Peroneals (fibularis longus/brevis)",
      "Tibialis posterior"
    ],
    alsoInvolved: ["Intrinsic foot muscles"],
    painContext:
      "Ankle sprains and chronic instability need both strength and proprioception. Calf-ankle strength is inseparable from push-off in sprinting.",
    typicalFocus: "Balance drills, resisted inversion/eversion, calf complex loading, hopping progressions"
  },
  elbow: {
    title: "Elbow",
    muscles: [
      "Biceps brachii",
      "Brachialis",
      "Triceps",
      "Wrist flexors / extensors (common tendons at elbow)"
    ],
    alsoInvolved: ["Annular ligament / joint capsule"],
    painContext:
      "Throwing and lifting athletes often see medial elbow (flexor-pronator) or lateral elbow (extensor) tendon overload. Load management plus gradual strengthening is typical.",
    typicalFocus: "Eccentric wrist ext/flex progressions, forearm rotation control, gradual throwing/press volume"
  },
  wrist: {
    title: "Forearm & wrist",
    muscles: [
      "Wrist flexors (flexor carpi radialis/ulnaris)",
      "Wrist extensors (extensor carpi radialis longus/brevis, ECU)"
    ],
    alsoInvolved: ["Finger flexors/extensors"],
    painContext:
      "Grip-heavy training can overload tendons at the wrist and elbow. Rehab often starts with pain-limited isometrics and builds capacity.",
    typicalFocus: "Isometric wrist holds, gradual loaded wrist extension/flexion, grip endurance"
  }
};

export function getAtlasEntry(regionId) {
  return MUSCLE_ATLAS[regionId] || null;
}

export function aggregateMusclesForRegions(regionIds) {
  const seen = new Set();
  const list = [];
  for (const id of regionIds) {
    const e = MUSCLE_ATLAS[id];
    if (!e) continue;
    for (const m of e.muscles) {
      if (!seen.has(m)) {
        seen.add(m);
        list.push(m);
      }
    }
  }
  return list;
}
