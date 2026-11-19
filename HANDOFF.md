# Lift — treatment demo: GitHub Pages handoff

## Goal
Publish this folder as a public GitHub Pages site so Henri can send a demo link to colleagues.

## What's here
- `index.html`: the full demo as a standalone page. It loads textures from `assets/` by relative path, and the fonts and dot-matrix display need no external files beyond jsdelivr/Google Fonts.
- `assets/*.webp`: wall, doors, ceiling and indicator plate textures.
- `readymag-embed.html`: the same code as a Readymag Code-widget snippet, with textures still pointing at Higgsfield CloudFront URLs. This is for reference; it is not part of the site.
- `.nojekyll`: skips Jekyll processing on Pages.

## Steps
1. Create a new **public** repo under Henri's account, e.g. `lift-demo`:
   `gh repo create lift-demo --public --source=. --remote=origin`
2. Commit everything in this folder to `main` and push.
3. Enable Pages from `main` / root:
   `gh api -X POST repos/{owner}/lift-demo/pages -f "source[branch]=main" -f "source[path]=/"`
   (If it already exists, use `-X PUT`.)
4. Wait for the build (`gh api repos/{owner}/lift-demo/pages/builds/latest`) and open `https://{owner}.github.io/lift-demo/`.
5. Check that:
   - the wood walls, steel doors and indicator plate textures load (the network tab shows no 404s on `assets/`);
   - scrolling opens and closes the doors and the floor name changes on the dot-matrix screen;
   - the button panel ride works.
6. Send Henri the Pages URL.

## Notes
- Public Pages URLs are guessable. If the treatment needs to stay private, use a Pages site from a private repo (needs a paid plan with private Pages) or add Cloudflare Access / a password gate instead.
- Optional: point `readymag-embed.html`'s CFG texture URLs at `https://{owner}.github.io/lift-demo/assets/...` so the Readymag version stops depending on Higgsfield hosting. That covers the `doorL`, `doorR`, `wallTex`, `ceilImg` and `indicatorImg` keys in `CFG`.
- Settings worth knowing (in `CFG` inside the script):
  - `indicator: 'classic'`
  - `screen: 'matrix'`, or `'lcd'` for clean type
  - `floors[]` holds the page content
