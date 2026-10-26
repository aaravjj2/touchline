# Touchline asset provenance

- `studio-pitch.svg`: original authored vector stadium illustration for the 2.8 studio relaunch. No external images or trademarks were incorporated.
- Player portrait SVGs in `ui-kit.js`, pitch textures, goal nets, stadium geometry and instanced crowds in `studio-stadium.js` are original procedural artwork. Identity is derived from existing player identifiers with safe fallback metadata; these stylized portraits are not photographic likenesses.
- The 2.8 athlete silhouette, kit details and motion refinements extend the existing CC0 rig. Broadcast/Tactical cameras, lighting and soft contact textures are original presentation code. No additional paid assets were acquired.

- `europe-night.webp`: original stadium/trophy background generated with the built-in imagegen tool on 19 October 2026. Prompt: “Premium original stylized 3D football management game background; European stadium at blue-hour night, lime pitch, cool blue floodlights, original silver trophy on the right, dark uncluttered left for HTML overlay; no text, logos or identifiable real stadium.” Converted to WebP for delivery; original retained in the user's generated_images folder.
- `athlete/characterMedium.fbx`, `idle.fbx`, `run.fbx`: Kenney, Animated Characters Protagonists 1.1, CC0. Source: https://kenney.nl/assets/animated-characters-protagonists . Original license included alongside the files. Touchline adds vertex-color kits, skin variations, hair, body variants, jersey numbers and original football action clips.
- Football action clips in `athletes.js` are original authored keyframes, blended over the shared humanoid rig. The renderer uses the physical world positions; animation does not determine match results.
- Crowd bed, ball contacts and whistles in `match-audio.js` are generated procedurally through Web Audio after the user enables sound. No external audio recordings are used.
- Three.js and its FBX/Skeleton utilities: version 0.186.1, MIT, vendored from the official npm package. License retained in `vendor/`.

The older Quaternius pack was evaluated but not imported because its free download uses a separate Drive distribution and the evaluated older pack provides FBX/Blend rather than a ready web bundle. No paid asset service is required.


- 3.16 animated opening: original Touchline choreography, lighting, ball, close-up skinned mesh and weighted continuous limbs. The existing Kenney CC0 FBX skeleton and idle/run clips remain credited in `athlete/License.txt`. The title athlete is an original character, not a scan or likeness of a real player. Detailed match geometry is optional; the standard match mesh remains unchanged. The WebGL scene is composited directly to a display canvas for transparent native-dialog compatibility; no encoded frame images are created.

- Public edition 3.17.0-preview.3 omits the user-supplied cinematic photograph and photographic portraits. Launcher/fallback use the existing original studio-pitch.svg; player cards use existing original generated figures. No simulation or save-format changes.

- 3.18: original human-proportioned head mesh, inset eyes, facial planes, articulated hand geometry, connected wrist/ankle weights, revised athletic proportions and hair. Existing CC0 skeleton/idle/run clips are retained. New portraits are original 192×240 WebP studio renders of this mesh: 2,135 catalog identities plus 48 original variants, covering all 2,310 entries. They are fictional visual identities, not photographs or accurate likenesses of real people. Neutral kits retain their appearance after transfers. See player-portraits/coverage.json and scripts/build-player-portraits.mjs.

- 3.18.0-preview.2: Draft & Europe uses real Wikimedia Commons photographs, with individual source, author, license, verification date and thumbnail/framing notes in portraits/credits.json and credits.html. Photo coverage and remaining gaps are recorded in portraits/coverage.json. Unavailable photos show a labelled initials placeholder, never a generated likeness. Original 3D portraits remain in other modes.
