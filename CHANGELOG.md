# Change Log

## [1.2.0]

Version 1.0 released

## [1.3.0]

Removed unwanted async call

## [1.4.0]

Made README file easier to understand

## [1.5.0]

fixed a major bug: remove all console log from entire jsx file

## [1.6.0]

- Fixed removal for nested and multi-line `console.log(...)` calls that previously left broken fragments such as `);`.
- Added AST-based detection for JavaScript, TypeScript, JSX, and TSX; strings, template text, comments, JSX text, and regular expressions are left untouched.
- Calls in expression positions are replaced with `undefined`; control-statement bodies become `{}` so surrounding statements keep their original flow.
- Added a conservative fallback for files that cannot be parsed, which removes only unambiguous standalone calls and reports the ones it skipped.
- Added support for optional chaining, bracket access, and `window`/`globalThis`/`self`/`global` receivers.
- Edits are applied through `WorkspaceEdit`, so unsaved, remote, and untitled files work and changes are undoable.
- Added GitHub Actions CI and automatic Marketplace publishing with OIDC Trusted Publishing, so no PAT is stored.
- Refreshed the README for the 1.6.0 release.
