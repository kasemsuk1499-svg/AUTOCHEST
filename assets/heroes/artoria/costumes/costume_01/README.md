# Artoria Costume 01

Place `art.png`, `idle.png`, `attack.png` in this folder. Each slot may use `.gif` instead (PNG takes precedence). All three must load before the costume can be equipped. This first costume is free for players who own Artoria. Reload after publishing the images.

Future costumes: create a sibling folder with a unique ID and register it in `src/characters/heroes/artoria.js` under `costumes`. Use `unlock:'hero'` for free costumes, or omit it and grant with the core ownership API for future rewards/shop systems. Original images are not modified.
