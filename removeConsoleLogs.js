'use strict';

const parser = require('@babel/parser');

const CONSOLE_LOG = 'console.log';
const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;
const ONLY_WHITESPACE = /^[ \t]*$/;
const ONLY_WHITESPACE_OR_CR = /^[ \t\r]*$/;

const SKIP_KEYS = new Set([
  'loc',
  'start',
  'end',
  'extra',
  'leadingComments',
  'trailingComments',
  'innerComments',
  'comments',
  'tokens',
  'errors',
]);

// Nodes that wrap an expression without changing its statement context.
const WRAPPER_TYPES = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSInstantiationExpression',
  'ParenthesizedExpression',
  'TypeCastExpression',
]);

const CONTROL_BODY_PARENTS = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'WithStatement',
  'LabeledStatement',
]);

const CONSOLE_OBJECTS = new Set(['window', 'globalThis', 'self', 'global']);

function parseSource(source, languageId) {
  const tsx = ['jsx', 'typescript', 'decorators-legacy'];
  const ts = ['typescript', 'decorators-legacy'];
  const jsx = ['jsx', 'decorators-legacy'];
  const plain = ['decorators-legacy'];

  let attempts = [tsx, ts, jsx, plain];
  if (languageId === 'typescript') attempts = [ts, tsx, jsx, plain];
  if (languageId === 'typescriptreact') attempts = [tsx, ts, jsx, plain];
  if (languageId === 'javascript' || languageId === 'javascriptreact') {
    attempts = [jsx, tsx, ts, plain];
  }

  for (const plugins of attempts) {
    try {
      return parser.parse(source, {
        sourceType: 'unambiguous',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
        plugins,
      });
    } catch (error) {
      // Try the next dialect; if all fail the conservative scanner is used.
    }
  }
  return null;
}

function memberNameEquals(property, name, computed) {
  if (!property) return false;
  if (!computed) return property.type === 'Identifier' && property.name === name;
  return property.type === 'StringLiteral' && property.value === name;
}

function isConsoleObject(node) {
  if (!node) return false;
  if (node.type === 'Identifier') return node.name === 'console';
  if (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression') {
    return false;
  }
  if (!memberNameEquals(node.property, 'console', node.computed)) return false;
  return (
    node.object.type === 'Identifier' && CONSOLE_OBJECTS.has(node.object.name)
  );
}

function isConsoleLogCall(node) {
  if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') {
    return false;
  }
  const callee = node.callee;
  if (!callee) return false;
  if (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression') {
    return false;
  }
  return (
    memberNameEquals(callee.property, 'log', callee.computed) &&
    isConsoleObject(callee.object)
  );
}

function collectConsoleLogCalls(ast) {
  const calls = [];
  const parents = new Map();

  function walk(node, parent, key) {
    if (!node || typeof node.type !== 'string') return;
    if (parent) parents.set(node, { parent, key });
    if (isConsoleLogCall(node)) calls.push(node);

    for (const childKey of Object.keys(node)) {
      if (SKIP_KEYS.has(childKey)) continue;
      const value = node[childKey];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && typeof child.type === 'string') {
            walk(child, node, childKey);
          }
        }
      } else if (value && typeof value === 'object' && typeof value.type === 'string') {
        walk(value, node, childKey);
      }
    }
  }

  walk(ast, null, null);
  return { calls, parents };
}

function isControlBody(parent, key) {
  if (!parent) return false;
  if (parent.type === 'IfStatement') {
    return key === 'consequent' || key === 'alternate';
  }
  return CONTROL_BODY_PARENTS.has(parent.type) && key === 'body';
}

function buildStatementRemoval(source, start, end) {
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  const newlineIndex = source.indexOf('\n', end);
  const endOfLine = newlineIndex === -1 ? source.length : newlineIndex;
  const prefix = source.slice(lineStart, start);
  const suffix = source.slice(end, endOfLine);
  const prefixIsWhitespace = ONLY_WHITESPACE.test(prefix);
  const suffixIsWhitespace = ONLY_WHITESPACE_OR_CR.test(suffix);

  if (prefixIsWhitespace && suffixIsWhitespace) {
    return {
      start: lineStart,
      end: newlineIndex === -1 ? source.length : newlineIndex + 1,
      text: '',
    };
  }

  let from = start;
  let to = end;

  if (prefixIsWhitespace) {
    from = lineStart;
  }

  while (to < endOfLine && (source[to] === ' ' || source[to] === '\t')) {
    to += 1;
  }

  if (suffixIsWhitespace) {
    // Nothing follows on this line, so drop the separating whitespace too.
    while (from > lineStart && (source[from - 1] === ' ' || source[from - 1] === '\t')) {
      from -= 1;
    }
  }

  return { start: from, end: to, text: '' };
}

function buildEdit(source, call, parents) {
  let current = call;
  let info = parents.get(current);

  // `console.log(...) as X;` is still an expression statement.
  while (
    info &&
    WRAPPER_TYPES.has(info.parent.type) &&
    info.key === 'expression'
  ) {
    current = info.parent;
    info = parents.get(current);
  }

  if (info && info.parent.type === 'ExpressionStatement' && info.key === 'expression') {
    const statement = info.parent;
    const statementInfo = parents.get(statement);

    if (statementInfo && isControlBody(statementInfo.parent, statementInfo.key)) {
      // `if (x) console.log(y);` -> `if (x) {}` keeps the next statement
      // outside the branch.
      return { start: statement.start, end: statement.end, text: '{}' };
    }

    return buildStatementRemoval(source, statement.start, statement.end);
  }

  // Any other position: console.log returns undefined, so keep the
  // surrounding expression valid without changing its value.
  return { start: call.start, end: call.end, text: 'undefined' };
}

function mergeEdits(edits) {
  edits.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged = [];
  for (const edit of edits) {
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({ start: edit.start, end: edit.end, text: edit.text });
      continue;
    }

    if (edit.start >= last.start && edit.end <= last.end) {
      // Covered by an outer statement/expression removal.
      continue;
    }

    if (edit.start < last.end) {
      // Adjacent statement removals can overlap in whitespace after trimming.
      // Other overlaps should not occur; keep the earlier edit rather than
      // deleting code that was not matched.
      if (last.text === '' && edit.text === '') {
        last.end = Math.max(last.end, edit.end);
      }
      continue;
    }

    merged.push({ start: edit.start, end: edit.end, text: edit.text });
  }

  return merged;
}

function applyEdits(source, edits) {
  let text = '';
  let cursor = 0;

  for (const edit of edits) {
    if (edit.start < cursor) continue;
    text += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }

  text += source.slice(cursor);
  return text;
}

function extendRemovalsToWholeLines(source, edits) {
  for (const edit of edits) {
    if (edit.text !== '') continue;

    const lineStart = source.lastIndexOf('\n', edit.start - 1) + 1;
    const newlineIndex = source.indexOf('\n', edit.end);
    const endOfLine = newlineIndex === -1 ? source.length : newlineIndex;

    const before = source.slice(lineStart, edit.start);
    const after = source.slice(edit.end, endOfLine);
    if (!ONLY_WHITESPACE.test(before) || !ONLY_WHITESPACE_OR_CR.test(after)) {
      continue;
    }

    edit.start = lineStart;
    edit.end = newlineIndex === -1 ? source.length : newlineIndex + 1;
  }

  return edits;
}

function removeWithAst(source, ast) {
  const { calls, parents } = collectConsoleLogCalls(ast);
  if (calls.length === 0) {
    return { text: source, count: 0, skipped: 0 };
  }

  const edits = calls.map((call) => buildEdit(source, call, parents));
  const merged = extendRemovalsToWholeLines(source, mergeEdits(edits));

  return {
    text: applyEdits(source, merged),
    count: calls.length,
    skipped: 0,
  };
}

function isIdentifierChar(ch) {
  return IDENTIFIER_CHAR.test(ch);
}

function skipString(source, start, quote) {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === quote) return i + 1;
    if (ch === '\n' || ch === '\r') return i;
    i += 1;
  }
  return i;
}

function skipLineComment(source, start) {
  let i = start;
  while (i < source.length && source[i] !== '\n' && source[i] !== '\r') i += 1;
  return i;
}

function skipBlockComment(source, start) {
  const end = source.indexOf('*/', start + 2);
  return end === -1 ? source.length : end + 2;
}

function skipTemplateExpression(source, start) {
  let i = start;
  let depth = 1;

  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      i = skipString(source, i, ch);
      continue;
    }
    if (ch === '`') {
      i = skipTemplate(source, i);
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      i = skipLineComment(source, i);
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i = skipBlockComment(source, i);
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }

  return i;
}

function skipTemplate(source, start) {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '`') return i + 1;
    if (ch === '$' && source[i + 1] === '{') {
      i = skipTemplateExpression(source, i + 2);
      continue;
    }
    i += 1;
  }
  return i;
}

function findClosingParen(source, openIndex) {
  let depth = 0;
  let i = openIndex;

  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      i = skipString(source, i, ch);
      continue;
    }
    if (ch === '`') {
      i = skipTemplate(source, i);
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      i = skipLineComment(source, i);
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i = skipBlockComment(source, i);
      continue;
    }
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }

  return -1;
}

function previousSignificantIndex(source, index) {
  let i = index - 1;
  while (i >= 0 && /\s/.test(source[i])) i -= 1;
  return i;
}

function isStandaloneStatement(source, start, end) {
  const previous = previousSignificantIndex(source, start);
  if (
    previous >= 0 &&
    source[previous] !== ';' &&
    source[previous] !== '{' &&
    source[previous] !== '}'
  ) {
    return false;
  }

  let next = end;
  while (next < source.length && (source[next] === ' ' || source[next] === '\t')) {
    next += 1;
  }
  if (next >= source.length) return true;

  const ch = source[next];
  if (ch === '\n' || ch === '\r' || ch === '}' || ch === ';') return true;
  if (ch === '/' && (source[next + 1] === '/' || source[next + 1] === '*')) {
    return true;
  }
  return false;
}

/**
 * Conservative fallback for sources the parser cannot understand. Only
 * removes calls that clearly form a complete statement, so an unparsable
 * file is never corrupted.
 */
function removeWithScanner(source) {
  let out = '';
  let copiedUpTo = 0;
  let count = 0;
  let skipped = 0;
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    // Skip non-code regions entirely so call-like text inside them is never
    // treated as a statement (the AST path cannot help here: parsing failed).
    if (ch === '/' && source[i + 1] === '/') {
      i = skipLineComment(source, i);
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i = skipBlockComment(source, i);
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipString(source, i, ch);
      continue;
    }
    if (ch === '`') {
      i = skipTemplate(source, i);
      continue;
    }

    const isCandidate =
      source.startsWith(CONSOLE_LOG, i) && !isIdentifierChar(source[i - 1] || '');
    if (!isCandidate) {
      i += 1;
      continue;
    }

    let open = i + CONSOLE_LOG.length;
    while (open < source.length && /\s/.test(source[open])) open += 1;
    if (source[open] !== '(') {
      i += 1;
      continue;
    }

    const close = findClosingParen(source, open);
    if (close === -1) {
      i += 1;
      continue;
    }

    let end = close + 1;
    if (source[end] === ';') end += 1;

    if (!isStandaloneStatement(source, i, end)) {
      const previous = previousSignificantIndex(source, i);
      const previousChar = previous >= 0 ? source[previous] : '';
      const insideText =
        previousChar === '"' ||
        previousChar === "'" ||
        previousChar === '`' ||
        previousChar === '/' ||
        previousChar === '*';
      if (!insideText) skipped += 1;
      i += 1;
      continue;
    }

    const edit = buildStatementRemoval(source, i, end);
    out += source.slice(copiedUpTo, edit.start);
    copiedUpTo = edit.end;
    i = Math.max(edit.end, i + 1);
    count += 1;
  }

  out += source.slice(copiedUpTo);
  return { text: out, count, skipped };
}

/**
 * Remove every `console.log(...)` call from `source` without damaging the
 * surrounding code.
 *
 * Tries to parse the source as JavaScript/TypeScript/JSX first and removes
 * based on the AST: expression statements are deleted, control-statement
 * bodies become `{}`, and calls used as expressions become `undefined`
 * (their return value). If parsing fails, a conservative scanner removes
 * only calls that form a standalone statement.
 *
 * @param {string} source
 * @param {string} [languageId] VS Code language id, used to pick parser plugins.
 * @returns {{ text: string, count: number, skipped: number }}
 */
function removeConsoleLogs(source, languageId) {
  const ast = parseSource(source, languageId);
  if (ast) {
    return removeWithAst(source, ast);
  }
  return removeWithScanner(source);
}

module.exports = { removeConsoleLogs };
