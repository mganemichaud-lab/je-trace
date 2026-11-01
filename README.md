# Je trace

Letter tracing for adult literacy learners, on the iPad: lowercase a–z, capitals A–Z, numbers 0–9 and 19 everyday symbols (+ − × = % @ & # * / ( ) . , ' : ; ? !).

- The letter writes itself first (orange), then the learner traces it with a finger or Apple Pencil, starting at the green dot.
- A stroke only counts when it starts at the dot, goes the right way and reaches the end. Otherwise the ink fades in red and the dot pulses.
- Finished letters get a green check, remembered on the iPad.
- Buttons: festive mode on/off, hear the letter name, watch again, start over, previous / next.
- Festive mode (sparkle button, remembered on the iPad): flowing rainbow ink, sparkles while tracing and a burst at the end. Calm mode: plain ink.

## Files

- `js/glyphs.js` – the letter model: shape and stroke order of every character. Edit a line there to change how a letter is written.
- `js/app.js` – screens, finger checking, demo animation.
- `planche.html` – review sheet of every character with numbered, coloured strokes (printable).
- `style.css`, `index.html`
- `manifest.webmanifest`, `sw.js`, `icons/` – home-screen icon and offline use.

## On the iPad

Put the folder online (any static hosting, e.g. GitHub Pages; it must be https). Open it in Safari → Share → "Sur l'écran d'accueil". It then opens full screen like an app and keeps working without internet.
