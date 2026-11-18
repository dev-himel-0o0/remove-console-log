# Remove Console Log

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/c0der-himel.remove-console-log?label=marketplace&color=1f6feb)](https://marketplace.visualstudio.com/items?itemName=c0der-himel.remove-console-log)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/c0der-himel.remove-console-log)](https://marketplace.visualstudio.com/items?itemName=c0der-himel.remove-console-log)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/c0der-himel.remove-console-log)](https://marketplace.visualstudio.com/items?itemName=c0der-himel.remove-console-log&ssr=false#review-details)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![CI](https://github.com/dev-himel-0o0/remove-console-log/actions/workflows/ci.yml/badge.svg)](https://github.com/dev-himel-0o0/remove-console-log/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/dev-himel-0o0/remove-console-log?style=social)](https://github.com/dev-himel-0o0/remove-console-log)

**Delete every `console.log(...)` from the current file with one command — safely.**

## Overview

**Remove Console Log** is a VS Code extension that removes all `console.log(...)` calls from the active file in a single step. Unlike a find-and-replace regex, it understands JavaScript, TypeScript, JSX, and TSX, so nested calls, multi-line arguments, JSX expressions, and template literals are handled correctly.

The edit is applied through VS Code's `WorkspaceEdit` API: it works on unsaved buffers, works in remote and untitled files, and can be undone with <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Cmd</kbd>+<kbd>Z</kbd>.

<p align="center">
  <img src="./img/shoot4.png" alt="Remove Console Log removes both console.log calls in a React component and reports the count" width="900">
  <br>
  <em>One command removes the logs and confirms how many were deleted.</em>
</p>

### Before / after

```js
// Before
import { memo } from 'react';

console.log('hello');

export default function Title() {
  console.log('world');

  return (
    <div>
      <h2>useCallback Hook</h2>
    </div>
  );
}

// After
import { memo } from 'react';

export default function Title() {
  return (
    <div>
      <h2>useCallback Hook</h2>
    </div>
  );
}
```

## Usage

1. Open any JavaScript, TypeScript, JSX, or TSX file.
2. Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> / <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> to open the Command Palette.
3. Run **Remove Console Log**.
4. Save the file. The removal itself is already on the undo stack.

<p align="center">
  <img src="./img/shoot2.png" alt="The Remove Console Log command in the VS Code Command Palette" width="700">
</p>

## Key Features

- **Removes every `console.log` in the active file** — not just the first match or the current line.
- **Nested and multi-line calls** — `console.log('x', getValue())` and arguments spread across lines are handled.
- **Never leaves broken syntax** — calls in expression positions become `undefined` (the value `console.log` returned); control-statement bodies become `{}` so following statements stay outside the branch.
- **Language-aware** — parses JavaScript, TypeScript, JSX, and TSX with Babel.
- **Leaves non-code text alone** — strings, template text, comments, JSX text, and regular expressions are not modified.
- **Broad call syntax support** — `console.log(...)`, `console?.log(...)`, `console['log'](...)`, `window.console.log(...)`, and `globalThis.console.log(...)`.
- **Safe fallback** — if a file cannot be parsed (Markdown, Vue/Svelte components, unusual syntax), only unambiguous standalone calls are removed and other calls it finds are reported instead of silently corrupted.
- **Works on dirty and remote files** — edits use the editor buffer, not the file on disk.
- **Undo-friendly** — the whole change is a single undoable edit.
- **Clear feedback** — tells you how many logs were removed, or that there was nothing to remove.
- **Zero configuration** — no settings, no telemetry, no runtime network access.

> **Scope:** this extension targets `console.log` only. It does not remove `console.warn`, `console.error`, `console.info`, or `console.debug`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | JavaScript (CommonJS, ES2020) — no build or transpile step |
| Runtime | Node.js inside the VS Code Extension Host |
| Parser | [`@babel/parser`](https://babeljs.io/docs/babel-parser) |
| Editor integration | [VS Code Extension API](https://code.visualstudio.com/api) (`commands`, `WorkspaceEdit`) |
| Tests | Mocha (`tdd` UI), Node `assert`, `@vscode/test-electron` |
| Linting | ESLint |
| CI/CD | GitHub Actions + Marketplace Trusted Publishing (OIDC) |
| Packaging | `@vscode/vsce` (via `npx`) |

## Dependencies

### Runtime

| Package | Version | Why |
| --- | --- | --- |
| [`@babel/parser`](https://www.npmjs.com/package/@babel/parser) | `^7.29.14` | Parses JavaScript, TypeScript, JSX, and TSX into an AST so removal is syntax-aware. |

`@babel/parser` is pinned to **7.x** because 8.x requires Node.js 22.18+, while this extension supports VS Code 1.79, whose extension host runs an older Node.js.

### Development

| Package | Version | Why |
| --- | --- | --- |
| `@types/glob` | `^8.1.0` | Type definitions for `glob` in the test runner. |
| `@types/mocha` | `^10.0.1` | Type definitions for Mocha. |
| `@types/node` | `20.2.5` | Node.js type definitions. |
| `@types/vscode` | `^1.79.0` | VS Code API type definitions. |
| `@vscode/test-electron` | `^2.3.2` | Downloads and launches a VS Code instance for integration tests. |
| `eslint` | `^8.41.0` | Static analysis. |
| `glob` | `^8.1.0` | Finds `*.test.js` files for the test runners. |
| `mocha` | `^10.2.0` | Unit and integration test framework. |
| `typescript` | `^5.1.3` | Type tooling available to editors; the shipped source is plain JavaScript. |

**Platform requirement:** VS Code **1.79.0** or newer. Node.js **22+** and npm are recommended for development and required by `@vscode/vsce` 4.x.

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/dev-himel-0o0/remove-console-log.git
cd remove-console-log
npm install
```

### 2. Run the extension locally

```bash
code .
```

Press <kbd>F5</kbd> (or select **Run Extension** in the Run and Debug view). A new **Extension Development Host** window opens with the extension loaded.

### 3. Try it

In the new window, open a JavaScript/TypeScript file containing `console.log` calls and run **Remove Console Log** from the Command Palette.

### 4. Run the checks

```bash
npm run lint        # ESLint
npm run test:unit   # 42 fast tests, no VS Code instance required
npm test            # lint + VS Code integration tests
```

`npm test` downloads VS Code and launches a real Electron window. On a headless Linux machine, use:

```bash
xvfb-run -a npm test
```

> The unit tests use a small programmatic Mocha runner (`test/runUnitTests.js`) because Mocha 10's CLI has a `yargs` incompatibility on current Node.js versions.

### 5. Package a VSIX

```bash
npx @vscode/vsce@4.1.1 package --githubBranch main
code --install-extension remove-console-log-1.6.0.vsix
```

### 6. Publish

Publishing is automated by GitHub Actions using [Marketplace Trusted Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publish-with-github-actions-and-trusted-publishing). No Personal Access Token or other long-lived credential is stored. The workflow requests a short-lived OIDC token with `id-token: write`; do not add a `VSCE_PAT` repository secret.

**One-time setup:** in the [Marketplace publisher management page](https://marketplace.visualstudio.com/manage), open the `c0der-himel` publisher, select **Trusted Publishing**, and create a policy with:

| Field | Value |
| --- | --- |
| Policy name | `Release workflow` |
| Repository owner | `dev-himel-0o0` |
| Repository | `remove-console-log` |
| Workflow | `publish.yml` |
| Environment | *(leave blank)* |

**Release:** bump the version in `package.json` and `CHANGELOG.md`, commit, then publish a GitHub Release whose tag matches the version (for example `v1.6.0`). The [`publish.yml`](./.github/workflows/publish.yml) workflow runs lint and unit tests, packages the VSIX, and publishes with `vsce publish --oidc`.

A maintainer can also start the workflow manually from the **Actions** tab. The version in `package.json` must not already exist on the Marketplace.

## How It Works

1. The active document's text is parsed with `@babel/parser` using plugins appropriate to its language.
2. The extension walks the AST for calls whose callee is `console.log` (including optional chaining, bracket access, and `window`/`globalThis` receivers).
3. Each call is classified:
   - a standalone statement is deleted;
   - a direct `if`/`else`/`for`/`while`/`do`/label body is replaced with `{}`;
   - any other expression is replaced with `undefined`.
4. Edits are merged, applied as one `WorkspaceEdit`, and the number of removed calls is reported.
5. If parsing fails, a conservative text scanner removes only calls that clearly form a complete statement and reports any calls it skipped.

This design is why the extension can remove calls like these without leaving a stray `);` or changing program behavior:

```js
console.log('filteredFbeProducts', filteredFbeProducts());
console.log(filteredFbeProduct());
console.log(
  'filteredFbeProducts',
  filteredFbeProducts(),
  'firstBillAmount',
  firstBillAmount
);
```

## Challenges Faced

- **Regex could not balance parentheses.** The original `console\.log\([^)]+\);?` stopped at the first `)`, so nested calls and multi-line calls left broken fragments. The fix required real parsing.
- **Removing a call is not always safe.** A log can be a function argument, an arrow body, a ternary branch, a JSX expression, or a control-statement body. Deleting it blindly changed behavior or produced invalid code.
- **Control flow was the worst case.** In `if (cond) console.log(x);` followed by `foo();`, deleting the log made `foo()` run only when `cond` was true. Replacing the body with `{}` preserves the original flow.
- **Strings and comments look like code.** A text scanner cannot reliably distinguish a real call from `"console.log(x)"` or `// console.log(x)`. AST-based detection fixes this.
- **Not every file is parseable.** Markdown, Vue, Svelte, and files with experimental syntax fail to parse. A conservative fallback avoids corrupting them, at the cost of leaving some calls in place.
- **Tooling compatibility.** Mocha 10's CLI breaks on Node.js 26 through an old `yargs` dependency, so the project uses a programmatic runner. Babel 8 requires Node.js 22.18+, so the extension pins Babel 7 to keep VS Code 1.79 compatibility.
- **PAT retirement.** Azure DevOps global Personal Access Tokens retire on December 1, 2026. Publishing now runs in GitHub Actions and exchanges a short-lived OIDC token through Marketplace Trusted Publishing, so no long-lived secret is stored.
- **Extension integration tests are heavyweight.** They need an Electron window and a display, which is why the removal logic was extracted into a pure module with fast unit tests.

## Why These Technologies?

- **JavaScript + CommonJS, no build step.** The extension is small; avoiding a bundler keeps the VSIX simple, activation fast, and debugging direct (F5 runs the same files that ship).
- **`@babel/parser`.** It supports modern JavaScript, TypeScript, JSX, and TSX with a mature parser while remaining parse-only — no code generator, transformer, or large compiler toolchain. It replaced a fragile regex with an AST for a small dependency cost.
- **`WorkspaceEdit`.** The native editing API gives undo support, honors unsaved buffers, and works with remote and untitled documents. Direct `fs` writes could overwrite unsaved work and bypass the undo stack.
- **Mocha + `@vscode/test-electron`.** This is the standard way to test VS Code extensions, and Mocha was already part of the generated extension scaffold.
- **ESLint.** A lightweight safety net for a plain-JavaScript codebase without a type checker.
- **GitHub Actions + OIDC.** Trusted Publishing removes stored Marketplace credentials and makes releases reproducible from a version tag.
- **`vsce`.** The official Microsoft packaging and publishing tool for the Marketplace.

## Problems This Project Solves

- Removes **all** `console.log` calls from a file in one action, including nested and multi-line calls.
- Avoids the classic regex failure that leaves trailing `);` and broken builds.
- Prevents edits from silently changing control flow or producing invalid syntax.
- Protects string contents, comments, JSX text, and regular expressions.
- Works on dirty editors and can be undone, so it is safe to try.
- Gives honest feedback when a call cannot be safely removed instead of claiming success.
- Runs entirely offline and collects no telemetry.

## Links

- **Live extension (Visual Studio Marketplace):** [c0der-himel.remove-console-log](https://marketplace.visualstudio.com/items?itemName=c0der-himel.remove-console-log)
- **Source code:** [github.com/dev-himel-0o0/remove-console-log](https://github.com/dev-himel-0o0/remove-console-log)
- **Issues and bug reports:** [GitHub Issues](https://github.com/dev-himel-0o0/remove-console-log/issues)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)
- **Releases:** [GitHub Releases](https://github.com/dev-himel-0o0/remove-console-log/releases)
- **VS Code Extension API documentation:** [code.visualstudio.com/api](https://code.visualstudio.com/api)
- **Babel parser documentation:** [babeljs.io/docs/babel-parser](https://babeljs.io/docs/babel-parser)
- **License:** [MIT](./LICENSE)

## Contributing

Issues and pull requests are welcome. Before opening a PR, run:

```bash
npm run lint
npm run test:unit
```

Please include a regression test for any removal bug you fix.

## License

[MIT](./LICENSE) © 2023 MD. Shahadat Hussain
