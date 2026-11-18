# AGENTS.md

VS Code extension (plain CommonJS JavaScript, no build step) with a single command that strips `console.log(...)` from the active file. Detection is AST-based; a conservative scanner takes over when the file cannot be parsed.

## Run / verify

- No build, transpile, or codegen: root `extension.js` is both source and the shipped artifact (`main` in `package.json`). Edit it directly.
- `npm run lint` — ESLint via `.eslintrc.json`; fails on warnings (`--max-warnings 0`).
- `npm run test:unit` — fast, runs `test/unit/**/*.test.js` through `test/runUnitTests.js` (Mocha API, not the `mocha` CLI, whose old yargs breaks on current Node). Use this for the removal logic.
- `npm test` — `pretest` runs lint, then `test/runTest.js` downloads VS Code and launches a real Electron instance with `@vscode/test-electron` (needs network; headless machines need `xvfb`). Slow, not a unit-test runner.
- `.github/workflows/ci.yml` — GitHub Actions on pushes to `main` and PRs: `npm ci`, lint, unit tests, package VSIX, upload artifact.
- `.github/workflows/publish.yml` — GitHub Actions on a published GitHub Release (or manual dispatch): checks the tag matches `package.json`, runs lint/unit tests, packages, then publishes with `vsce publish --oidc` and Marketplace Trusted Publishing. No `VSCE_PAT` secret.
- Test files are `test/**/*.test.js` using Mocha's `tdd` UI (`suite` / `test`). `vsc-extension-quickstart.md` claims `**.test.ts` — that doc is stale; the glob is `.js`.
- There is no per-test CLI filter. To focus a test, temporarily use `suite.only` / `test.only`, or press F5 with the "Extension Tests" launch config (`.vscode/launch.json`) to debug interactively.
- No typecheck script exists; `jsconfig.json` (`checkJs: true`) only feeds editor IntelliSense.

## Gotchas

- The command ID is the legacy `remove-console-log.helloWorld`. It must stay identical in `package.json` `contributes.commands` and `vscode.commands.registerCommand`; don't rename it casually.
- Removal logic is the pure `removeConsoleLogs(source, languageId)` in `removeConsoleLogs.js`; keep it free of `vscode` imports so `test/unit` runs without an editor. It returns `{ text, count, skipped }`. `extension.js` is a thin wrapper.
- Primary path parses with `@babel/parser` (JS/TS/JSX/TSX attempts chosen by `languageId`) and edits by AST:
  - standalone expression statements are deleted (whole line when the call is alone on it, CRLF-aware);
  - calls that are a direct control-statement body (`if`/`else`/`for`/`while`/`do`/label) become `{}` so the following statement does not get absorbed;
  - calls in any other expression position become `undefined` (the value `console.log` returned), which keeps assignments, arrows, ternaries, JSX, `void`, etc. valid.
- Because of AST matching, strings, template text, comments, JSX text, and regex literals are never treated as calls. `console?.log(...)`, `console['log'](...)`, `window.console.log(...)`, and `globalThis.console.log(...)` are supported.
- When parsing fails (Markdown, Vue/Svelte components, exotic syntax), the fallback scanner first skips strings, templates, and comments, then removes only calls whose previous significant char is `;`, `{`, `}`, or start-of-file and which end the statement. Any other candidate call in code is left in place and reported through `skipped`; do not loosen this, it is what prevents silent corruption of unparsable files.
- Keep `@babel/parser` on 7.x. v8 requires Node 22.18+, but `engines.vscode` is `^1.79` (Node 16). It is a runtime dependency, so it is packaged into the `.vsix`.
- The command reads `document.getText()` and applies one full-document `WorkspaceEdit`, so unsaved content is honored, edits are undoable, and remote/untitled files work. It does **not** save the file; don't swap this for `fs.writeFile`, which caused stale-buffer conflicts.
- Only `console.log` is targeted, not `console.warn`/`error`/`debug`. That is intentional unless the product scope changes.
- Version bumps require both `package.json` and `CHANGELOG.md`; both are currently `1.6.0` (Marketplace already has `1.5.0`). `npx @vscode/vsce@4.1.1 package` builds the VSIX (Node 22+).
- Publishing uses GitHub OIDC Trusted Publishing, not a PAT. The Marketplace policy must target repository owner `dev-himel-0o0`, repository `remove-console-log`, workflow `publish.yml`, no environment. Create a GitHub Release with tag `v<version>`; the workflow rejects a tag that does not match `package.json`.
- `.vscodeignore` decides what ships in the `.vsix` (tests, `.github`, `jsconfig.json`, `.eslintrc.json`, `AGENTS.md`, `package-lock.json` are excluded). Add any new dev-only file there.
- Verification is local (lint, `npm run test:unit`, F5 run, `npm test`) plus the GitHub Actions workflows.
