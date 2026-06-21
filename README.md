# Pregnancy Plan

Static GitHub Pages planner for an anonymized Ontario/Canada pregnancy and newborn prep plan.

## Local Preview

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 3010
```

Then visit `http://127.0.0.1:3010/`.

## Passcode

Client-side passcode: `tdog`

Entry is normalized (case- and punctuation-insensitive), so `tdog`, `TDog`, and ` tdog ` all unlock it.

This is only casual privacy. GitHub Pages is public static hosting, so the planner content is still present in the published source.

To change the passcode, edit `passcodeNormalized` in `app.js`. Use the lowercased, alphanumeric-only form of your phrase — for example the passcode `our-baby` is stored as `ourbaby`.

## Publishing On GitHub Pages

This repo is intentionally dependency-free. `.github/workflows/pages.yml` deploys it on every push to `main` using the GitHub Actions Pages build (`actions/upload-pages-artifact` + `actions/deploy-pages`).

Required repo settings, both one-time:

- Settings → Pages → Source: `GitHub Actions` (not "Deploy from a branch").
- Settings → Environments → `github-pages` → Deployment branches: must include `main`, or the workflow fails with an environment-protection error.

## Content Model

- `planner-data.js` holds the structured content: `categories`, `kinds`, and `statuses` lookup maps (each with a human label, and an accent colour for categories), the `modules`, a phased `timeline`, and `reference` cards. Every timeline item references a category/kind/status by key, so labels and colours stay consistent.
- `app.js` handles passcode unlock, search/category/type filtering, module navigation, and rendering.
- `styles.css` handles the responsive layout, theme, and print styling.

## Typography

Headings use Fraunces and UI text uses Inter, loaded from Google Fonts with system serif/sans fallbacks so the planner still reads well offline.
