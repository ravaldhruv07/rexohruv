# Pregnancy Plan

Static GitHub Pages planner for an anonymized Ontario/Canada pregnancy and newborn prep plan.

## Local Preview

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 3010
```

Then visit `http://127.0.0.1:3010/`.

## Passcode

Default client-side passcode: `family-plan`

This is only casual privacy. GitHub Pages is public static hosting, so the planner content and passcode hash are still present in the published source.

To change the passcode, generate a new SHA-256 hash and replace `passcodeHash` in `planner-data.js`:

```sh
python3 -c "import hashlib; print(hashlib.sha256(b'new-passcode').hexdigest())"
```

## Publishing On GitHub Pages

This repo is intentionally dependency-free. GitHub Pages can serve it directly from the repository root.

Recommended Pages settings:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

## Content Model

- `planner-data.js` contains normalized planner modules, timeline items, and reference cards.
- `app.js` handles passcode unlock, filtering, module navigation, and rendering.
- `styles.css` handles responsive layout and print styling.
