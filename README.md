# Adams Family Life Histories

Static, accessible HTML versions of two Adams family life-history PDFs:

- William Henry Adams Life History
- Frances Ann Otten Adams Life History

The site is designed for GitHub Pages at:

```text
https://joeywilkes12.github.io/4amj-genealogy/
```

The root `index.html` redirects back to the main 4AMJ landing page:

```text
https://joeywilkes12.github.io/4AMJ/
```

The intended public biography links are:

```text
https://joeywilkes12.github.io/4amj-genealogy/william-henry-adams.html
https://joeywilkes12.github.io/4amj-genealogy/frances-otten-adams.html
```

## Repository layout

```text
/
index.html
william-henry-adams.html
frances-otten-adams.html
styles.css
agents.md
README.md
.nojekyll
assets/
tests/
```

## Local preview

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/
```

## Run tests

```bash
bash tests/run-regression.sh
```

The regression suite installs a pinned Playwright Test runner into `.test-results/runner`, starts a local static server, and checks the site across mobile, tablet, and desktop viewport widths.
