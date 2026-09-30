# GLITCHBOUND

A 60-second illustrated robot adventure where you repair a collapsing digital network, built in vanilla HTML/JS Canvas. You are the Network Keeper: diagnose failures, repair systems, stabilize the CORE, and save the network before time runs out.

## Play

Open `index.html` in a modern desktop browser, then select **START**. No build step, package manager, or external assets are required.

## Controls

- **WASD** / **Arrow keys** — move
- **E** — interact
- **M** — toggle sound
- **Esc** — close a repair panel

## Gameplay

Randomized server, cable, data, Glitch, and router incidents appear across the village. Complete the diagnostic panels, then stabilize the CORE before the countdown or its stability reaches zero.

## Implementation

Everything is drawn procedurally with Canvas and styled with HTML/CSS. Web Audio supplies synthesized music and sound effects; no external art or audio assets are used.

Key source files: `js/game.js` (loop and state), `js/world.js` (map and ambient world), `js/robot.js` (characters), `js/minigames.js` (repairs), `js/audio.js` (sound), and `style.css` (UI).
