# Fun & Relax — Playable Expo SDK 57 Game Collection

This project implements the first four deliverables requested by the specification: a real home screen, Card Match, Watermelon Pop and Nut & Bolt. The games use actual player input, real scoring, win/lose states, levels, randomized layouts/objects and AsyncStorage persistence.

## Run

1. Install Node.js LTS.
2. In this folder run `npm install`.
3. Run `npx expo start`.
4. Press `a` for Android emulator or scan the Expo QR with Expo Go / a development build.
5. `npm run typecheck` checks TypeScript.

## Controls

- Card Match: tap cards to flip and match pairs.
- Watermelon Pop: tap flying fruit; bombs cost lives and break the combo.
- Nut & Bolt: physically drag each colored nut onto its matching bolt.

## Progress

Game high scores, unlocked level, current level and stars are saved in AsyncStorage under `@fun_relax/game_progress`.

## Next games

The source specification asks to build the remaining games incrementally rather than fake all 15. This baseline intentionally contains fully playable games instead of placeholder routes.
