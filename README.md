# Je trace

Letter tracing for adult literacy learners, on the iPad: lowercase a–z, capitals A–Z, numbers 0–9 and 23 everyday Swiss symbols (+ − – × = % ° @ & # * / ( ) « » . , ' : ; ? !).

- The letter writes itself first (orange), then the learner traces it with a finger or Apple Pencil, starting at the green dot.
- A stroke only counts when it starts at the dot, goes the right way and reaches the end. Otherwise the ink fades in red and the dot pulses.
- Finished letters get a green check, remembered on the iPad.
- Buttons: festive mode on/off, hear the letter name, watch again, start over, previous / next.
- Festive mode (sparkle button, remembered on the iPad): flowing rainbow ink, sparkles while tracing and a burst at the end. Calm mode: plain ink.

## Test

The **Test** card on the home screen starts a test of 5 characters mixed from all four sets; the orange button at the top right of a list tests only that set. Characters not passed yet come first. For each one:

1. **Copy**: the model is on the left, the learner writes it in the empty space on the right, on the same lines.
2. **From memory**: the model fades away, the name is spoken, and the learner writes it again.

The writing is checked against the letter model: shape, number of strokes, direction of each stroke, and stroke order (symbols may be written in any order). Size and position may vary a little. If it is not right, the writing fades and the correct movement plays in the writing space; after 2 tries it moves on. The check happens when all strokes are there, or after a 3½ s pause.

At the end, a card shows the 5 characters with a check for each one written correctly from memory. Those get an orange star in the list, remembered on the iPad.

Teacher keys (with a keyboard, e.g. on the Mac): Cmd + → counts the current step as right, Cmd + ← as missed (Ctrl on Windows). Ten presses reach the result card.

## Files

- `js/glyphs.js` – the letter model: shape and stroke order of every character. Edit a line there to change how a letter is written.
- `js/app.js` – screens, finger checking, demo animation, test.
- `js/check.js` – checks free writing in the test; its tolerances are at the top.
- `planche.html` – review sheet of every character with numbered, coloured strokes (printable).
- `style.css`, `index.html`
- `manifest.webmanifest`, `sw.js`, `icons/` – home-screen icon and offline use.

## On the iPad

Put the folder online (any static hosting, e.g. GitHub Pages; it must be https). Open it in Safari → Share → "Sur l'écran d'accueil". It then opens full screen like an app and keeps working without internet.
