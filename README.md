# J'écris en script

Letter tracing for adult literacy learners, on the iPad: lowercase a–z, capitals A–Z and numbers 0–9.

- The letter writes itself first (orange), then the learner traces it with a finger or Apple Pencil, starting at the green dot.
- A stroke only counts when it starts at the dot, goes the right way and reaches the end. Otherwise the ink fades in red and the dot pulses.
- Finished letters get a green check, remembered on the iPad.
- Buttons: hear the letter name, watch again, start over, previous / next.

## Files

- `js/glyphs.js` – the letter model: shape and stroke order of every character. Edit a line there to change how a letter is written.
- `js/app.js` – screens, finger checking, demo animation.
- `style.css`, `index.html`
- `manifest.webmanifest`, `sw.js`, `icons/` – home-screen icon and offline use.

## On the iPad

Put the folder online (any static hosting, e.g. GitHub Pages; it must be https). Open it in Safari → Share → "Sur l'écran d'accueil". It then opens full screen like an app and keeps working without internet.
