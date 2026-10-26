# On the pitch

A separate match inside the asset library. You control one player, the way a club match handles a person on the ball. Teammates and the opposition are bots. The manager career does not load this folder, and this match does not change a save.

Open it from the repository root so the page can reach the vendored 3D library:

`http://127.0.0.1:<port>/assets/on-pitch/`

The figures are original 3D kit pieces, with skin and hair varied from the player name. They are not photographs. The Kenney body used by the manager view is licensed in `dist/assets/athlete`, and those files are present in this workspace. This prototype does not depend on them.

The main game now offers direct play in new physical fixtures using its shared career engine and an original skinned footballer mesh. This folder remains a separate five-a-side design prototype.

## How a match works

- Kick off starts with the ball at your feet. The other team stays in their own half until you play it forward or pass. A pass sends a teammate onto the ball.
- With the ball, teammates spread into wide and forward lanes you can pass into. The ball runs ahead of a sprint. Ease off with a player near you and it tucks onto the far foot. While you hold the shot, a mark shows where it is aimed in the goal.
- Meeting the ball at pace knocks it on in front of you, and you run onto it. Hold a direction as it arrives and the first touch goes that way. A standing touch, with the stick free, keeps it at your feet. The player closing you down is the nearest opponent. The others hold goal-side lanes.
- First to three, or four minutes, with a half-time pause. Sprint spends stamina. It comes back when you ease off, and it refills at half-time.
- W, A, S and D move toward the goal you are attacking, across the pitch, and back. Shift sprints. Without sprint, you hold a spot in front of the opponent on the ball instead of running through him. Shift steps in, and reaching the ball wins it. He stumbles, so he cannot turn straight back onto it. Arrow keys do the same when you are the only person playing.
- The lime ring sits on the teammate the stick is pointing at, and a tap of J plays the ball there along the ground. Hold J and the pass lifts. Out wide, that hold is a cross into the box, and a teammate attacks it. If he meets the ball in the air, he heads it. The keeper comes off his line for that cross and claims it when he reaches the ball first. With the stick free, the ring follows the way you are facing. You keep running for a return, and he plays the ball back into that run. K uses that same aim for the ball in behind. Closed down, a teammate plays that same ball when someone is free in front. If it is yours, letting go of the stick sends you onto it. Hold L, then release, to shoot. The keeper steps toward that mark. Steer the other way as you let go and the shot goes away from him. C is a slide, and a slide that reaches the ball knocks it loose and stumbles him. Tab puts you on the player the pass is going to.
- A friend on this keyboard can take the other side: arrows to move, right Shift to sprint, N to pass, M for a through ball, semicolon to shoot, period to slide, Enter to change player.
- The ball out of play becomes a throw-in, a goal kick, or a corner, and you are moved onto it when it is yours. A shot at the keeper can be a save.
- Full time shows shots, shots on target, saves, passes and possession. The camera sits higher and further behind you.

The same body can later wear any person already drawn in `assets/cards`. This first match uses the original founding squad.
