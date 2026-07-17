# Agent Notes

- Target public repository: `4amj-genealogy`.
- Deployment destination: GitHub Pages at `https://joeywilkes12.github.io/4amj-genealogy/`.
- GitHub Pages should publish the repository root from the `main` branch.
- The root `index.html` intentionally redirects to `https://joeywilkes12.github.io/4AMJ/`.
- Keep the site lightweight and static: plain HTML/CSS, no JavaScript runtime, no analytics, no external fonts, no CDN dependencies, and no package manager files.
- Preserve the original PDFs in `assets/` as source downloads.
- Preserve the source wording in the HTML pages unless the user explicitly asks for editorial cleanup.
- When changing visible content, links, colors, or page structure, update `tests/regression.spec.mjs`.
