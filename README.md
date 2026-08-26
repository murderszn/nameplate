# Nameplate marketing site

Plain HTML/CSS/JS, no build step. Preview locally with `python3 -m http.server`
from this directory (then open `http://localhost:8000`), or just open
`index.html` directly in a browser.

## Deployment

Pushes to `main` that touch anything under `website/` trigger
`.github/workflows/deploy-website.yml`, which uploads this directory as a
Pages artifact and deploys it via `actions/deploy-pages` — no `gh-pages`
branch involved. Enable GitHub Pages for the repo with source set to
"GitHub Actions" for the workflow to publish successfully.
