# Player 3D mesh (GLB)

## What you want (NFL player in pads)

Add your own file:

`football_player.glb`

Place it in this folder (`public/models/`).

The app checks for `football_player.glb` first. If present, it loads **your** helmet / shoulder pads / pants / cleats mesh (like your reference image). Use a **single GLB** in **T-pose or neutral stance**, Y-up, for best hit-zone alignment.

**Licensing:** Only use models you have rights to (purchase, CC license, or your own scan).

## Bundled demo

`demo_character.glb` — Three.js example **Soldier** (~2 MB). **Required** for the default app load. If you see *“GLB error — using primitive body”*, this file is missing from this folder — re-download from  
`https://threejs.org/examples/models/gltf/Soldier.glb`  
and save as `demo_character.glb` here, then restart Vite.

### `football_player.glb` must be a real binary GLB

If that file is actually an **HTML page** (browser “Save as…”, Sketchfab error page, 404 page, etc.), the loader fails with *“Unexpected token '<' … not valid JSON”*. **Delete the bad file** or replace it with a real `.glb` export. The app checks the file starts with the `glTF` binary magic; fakes are ignored and the demo is used instead.

## Tuning hit zones

If your mesh proportions differ a lot, edit zone fractions in:

`src/FootballPlayerMesh.jsx` → `ZONE_SPECS` (`yN`, `xN`, `zN`, `r`).

## Per-muscle / per-submesh picking (named GLB parts)

If your GLB splits **delts, quads, calves**, etc. into separate meshes or materials:

1. Run the app → **Show mesh / material names** (or **Log names to console**).
2. Edit **`src/meshRegionMap.js`** → `DEFAULT_MESH_REGION_RULES`: add substrings that appear in your object/material names.
3. Use picking mode **Mesh names first, then orbs** (default). The app raycasts **layer 0 (body)** first, then **layer 1 (orbs)**.

Patterns can be plain substrings or `regex:<source>` for a case-insensitive regex against the combined name string.

Material **names** from the file are copied onto the clay materials so they still match after shading.
