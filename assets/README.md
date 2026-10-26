# Touchline asset library

Source artwork. Static portrait and coach derivatives are used by the game from dist/assets/library. Run node scripts/promote-artwork.mjs after rebuilding this library. Motion studies and the direct-control prototype remain separate.

Generated 22 October 2026 from the player lists already in the game.

| Folder | Contents |
| --- | --- |
| `players/` | One stylized squad figure per person. 2087 files. |
| `cards/` | One card per roster entry. 2262 files. |
| `animations/` | A nine-second match cycle per person: idle, jog, sprint, dribble, pass, shoot, receive, tackle or keeper save, then a celebration. |
| `celebrations/` | A four-second celebration per person: signature, jump, slide, and point. |
| `moments/` | Goal, half-time, full-time, substitution, and kickoff boards. |
| `coaches/` | The three coach identities. |
| `ui/` | Shared controls: navigation, buttons, pitch, match bar, table, panel. |
| `screens/` | Office, squad, transfer and match boards showing the new layout. |
| `manifest.json` | Index of every card, figure, animation, and celebration. |
| `gallery.html` | Local browser for the cards. Open the file directly. |
| `animation-gallery.html` | Local browser for the moving figures. Open the file directly. |
| `on-pitch/` | A separate 3D match you play yourself, against bots. Hand-authored, so regeneration leaves it alone. |

Counts: legends 628, English 647, Super League world 969, founding 18.

Figures are original geometric kit pieces. Skin, hair and build come from the existing player id hash. They are not photographs and not personal likenesses. Ratings, clubs and roles are the game's own authored values.

Card frames change with rating: 90+ Elite, 80–89 Established, 70–79 Squad, below 70 Prospect.

Motion names follow the game's visual sampler: idle, jog, sprint, dribble, pass, shoot, receive, tackle, keeper-save, and celebrate. Keepers dive instead of tackling. The celebration signature depends on role: goalkeepers raise their gloves, defenders point, midfielders open their arms, and forwards slide or jump. None of these files change a match.

Run `node assets/build-library.mjs` from the project root to regenerate the cards, figures and motion files. The `on-pitch` folder is a playable match and is not part of that regeneration.
