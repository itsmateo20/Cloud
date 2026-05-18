# Comment Stripper GitHub Action

Automatically removes inline comments from code files except the top-of-file path headers and required build-tool annotations like `/*turbopackIgnore: true*/`.

## What it does

- Runs on every push/PR to `new` and `main` branches
- Preserves header comments like:
  - `// components/app/FileList.js`
  - `/* public/styles/globals.css */`
  - `// lib/auth.js`
- Removes all other comments:
  - Block comments `/* ... */`
  - Single-line comments `//`
  - Trailing comments after code

  Required annotations such as `/*turbopackIgnore: true*/` are preserved.

## Files processed

- `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`
- `.css`, `.scss`

## Excluded directories

- `node_modules/`
- `.next/`, `dist/`, `build/`
- `.git/`
- Minified files (`*.min.js`, `*.min.css`)

## Manual run

To test locally before committing:

```bash
node .github/scripts/strip-comments.js
```

## Disable

To disable the action, either:

1. Delete `.github/workflows/strip-comments.yml`
2. Or comment out the `on:` triggers in the workflow file
