const assert = require('assert');
const { removeConsoleLogs } = require('../../removeConsoleLogs');

suite('removeConsoleLogs', () => {
  suite('basic removal', () => {
    test('removes a simple call', () => {
      const result = removeConsoleLogs("console.log('hello');\n");
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 1);
    });

    test('removes a call with a nested call argument', () => {
      const result = removeConsoleLogs(
        "console.log('filteredFbeProducts', filteredFbeProducts());\n"
      );
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 1);
    });

    test('removes a call whose only argument is a call', () => {
      const result = removeConsoleLogs('console.log(filteredFbeProduct());\n');
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 1);
    });

    test('removes a multi-line call', () => {
      const source = [
        'console.log(',
        "'filteredFbeProducts',",
        'filteredFbeProducts(),',
        "'firstBillAmount',",
        'firstBillAmount',
        ');',
        '',
      ].join('\n');

      const result = removeConsoleLogs(source);
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 1);
    });

    test('removes a multi-line call and keeps surrounding code', () => {
      const source = [
        'function demo() {',
        '  console.log(',
        "    'a',",
        '    b()',
        '  );',
        '  return 1;',
        '}',
        '',
      ].join('\n');

      const expected = ['function demo() {', '  return 1;', '}', ''].join('\n');

      const result = removeConsoleLogs(source);
      assert.strictEqual(result.text, expected);
      assert.strictEqual(result.count, 1);
    });

    test('handles nested arrow functions and deeper nesting', () => {
      const result = removeConsoleLogs(
        'console.log(items.map((item) => item.id));\n'
      );
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 1);
    });

    test('ignores parentheses inside strings and templates in arguments', () => {
      const source = [
        "console.log(')');",
        'console.log(`value: ${value}`);',
        'console.log(`sum: ${add(1, 2)}`);',
        "console.log(fn('a)'), 'b');",
        '',
      ].join('\n');

      const result = removeConsoleLogs(source);
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 4);
    });

    test('ignores parentheses inside comments in the argument list', () => {
      const result = removeConsoleLogs('console.log(a /* ) */, b);\n');
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 1);
    });

    test('removes a call that is not alone on its line without merging code', () => {
      const result = removeConsoleLogs(
        'const a = 1; console.log(a); const b = 2;\n'
      );
      assert.strictEqual(result.text, 'const a = 1; const b = 2;\n');
      assert.strictEqual(result.count, 1);
    });

    test('trims the trailing line when a call ends the line', () => {
      const result = removeConsoleLogs('foo(); console.log(x);\n');
      assert.strictEqual(result.text, 'foo();\n');
      assert.strictEqual(result.count, 1);
    });

    test('removes multiple calls and counts them', () => {
      const result = removeConsoleLogs('console.log(1);\nconsole.log(2);\n');
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 2);
    });

    test('removes multiple calls that share a line', () => {
      const result = removeConsoleLogs('console.log(1); console.log(2);\n');
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 2);
    });

    test('counts nested calls that are removed with their statement', () => {
      const result = removeConsoleLogs('console.log(console.log(x));\n');
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 2);
    });

    test('handles CRLF line endings', () => {
      const result = removeConsoleLogs('console.log(1);\r\nfoo();\r\n');
      assert.strictEqual(result.text, 'foo();\r\n');
      assert.strictEqual(result.count, 1);
    });

    test('removes a final line without a trailing newline', () => {
      const result = removeConsoleLogs('const x = 1;\nconsole.log(x);');
      assert.strictEqual(result.text, 'const x = 1;\n');
      assert.strictEqual(result.count, 1);
    });

    test('leaves code without console.log untouched', () => {
      const source = 'function add(a, b) {\n  return a + b;\n}\n';
      const result = removeConsoleLogs(source);
      assert.strictEqual(result.text, source);
      assert.strictEqual(result.count, 0);
    });

    test('does not match identifiers that merely end with console.log', () => {
      const source = 'console.logger(1);\nmyconsole.log(2);\n';
      const result = removeConsoleLogs(source);
      assert.strictEqual(result.text, source);
      assert.strictEqual(result.count, 0);
    });

    test('removes alternative syntaxes', () => {
      const source = [
        'window.console.log(1);',
        'globalThis.console.log(2);',
        'console?.log(3);',
        "console['log'](4);",
        '',
      ].join('\n');

      const result = removeConsoleLogs(source);
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 4);
    });

    test('removes calls containing regex literals', () => {
      const result = removeConsoleLogs('console.log(/\\)/.test(s));\n');
      assert.strictEqual(result.text, '');
      assert.strictEqual(result.count, 1);
    });
  });

  suite('does not damage surrounding code', () => {
    test('keeps expression assignments valid', () => {
      const result = removeConsoleLogs(
        'const y = console.log(x);\nnext();\n'
      );
      assert.strictEqual(result.text, 'const y = undefined;\nnext();\n');
      assert.strictEqual(result.count, 1);
    });

    test('keeps arrow function bodies valid', () => {
      const result = removeConsoleLogs('const f = () => console.log(x);\n');
      assert.strictEqual(result.text, 'const f = () => undefined;\n');
      assert.strictEqual(result.count, 1);
    });

    test('keeps ternaries valid', () => {
      const result = removeConsoleLogs('x ? console.log(y) : 0;\n');
      assert.strictEqual(result.text, 'x ? undefined : 0;\n');
      assert.strictEqual(result.count, 1);
    });

    test('keeps object properties valid', () => {
      const result = removeConsoleLogs('const o = { a: console.log(x) };\n');
      assert.strictEqual(result.text, 'const o = { a: undefined };\n');
      assert.strictEqual(result.count, 1);
    });

    test('keeps call arguments valid', () => {
      const result = removeConsoleLogs('foo(console.log(x));\n');
      assert.strictEqual(result.text, 'foo(undefined);\n');
      assert.strictEqual(result.count, 1);
    });

    test('keeps void expressions valid', () => {
      const result = removeConsoleLogs('void console.log(x);\n');
      assert.strictEqual(result.text, 'void undefined;\n');
      assert.strictEqual(result.count, 1);
    });

    test('keeps template expressions valid', () => {
      const result = removeConsoleLogs('const s = `x ${console.log(y)}`;\n');
      assert.strictEqual(result.text, 'const s = `x ${undefined}`;\n');
      assert.strictEqual(result.count, 1);
    });

    test('keeps JSX expressions valid', () => {
      const source = [
        '<button onClick={() => console.log("x")}>go</button>',
        'const el = <div>{console.log(y)}</div>;',
        '',
      ].join('\n');

      const expected = [
        '<button onClick={() => undefined}>go</button>',
        'const el = <div>{undefined}</div>;',
        '',
      ].join('\n');

      const result = removeConsoleLogs(source, 'javascriptreact');
      assert.strictEqual(result.text, expected);
      assert.strictEqual(result.count, 2);
    });
  });

  suite('control-flow bodies keep their shape', () => {
    test('if body', () => {
      const result = removeConsoleLogs('if (cond) console.log(x);\nfoo();\n');
      assert.strictEqual(result.text, 'if (cond) {}\nfoo();\n');
      assert.strictEqual(result.count, 1);
    });

    test('else body on the same line', () => {
      const result = removeConsoleLogs('if (a) console.log(x); else b();\n');
      assert.strictEqual(result.text, 'if (a) {} else b();\n');
      assert.strictEqual(result.count, 1);
    });

    test('else body', () => {
      const result = removeConsoleLogs(
        'if (a) b(); else console.log(x);\nc();\n'
      );
      assert.strictEqual(result.text, 'if (a) b(); else {}\nc();\n');
      assert.strictEqual(result.count, 1);
    });

    test('for body', () => {
      const result = removeConsoleLogs(
        'for (let i = 0; i < n; i++) console.log(i);\nnext();\n'
      );
      assert.strictEqual(result.text, 'for (let i = 0; i < n; i++) {}\nnext();\n');
      assert.strictEqual(result.count, 1);
    });

    test('while body', () => {
      const result = removeConsoleLogs('while (x) console.log(y);\nnext();\n');
      assert.strictEqual(result.text, 'while (x) {}\nnext();\n');
      assert.strictEqual(result.count, 1);
    });

    test('do-while body', () => {
      const result = removeConsoleLogs('do console.log(x); while (cond);\n');
      assert.strictEqual(result.text, 'do {} while (cond);\n');
      assert.strictEqual(result.count, 1);
    });

    test('labeled statement body', () => {
      const result = removeConsoleLogs('retry: console.log(x);\n');
      assert.strictEqual(result.text, 'retry: {}\n');
      assert.strictEqual(result.count, 1);
    });
  });

  suite('leaves text that is not a call alone', () => {
    test('string literals', () => {
      const source = 'const s = "call console.log(x) here";\n';
      const result = removeConsoleLogs(source);
      assert.strictEqual(result.text, source);
      assert.strictEqual(result.count, 0);
    });

    test('template literal text', () => {
      const source = 'const s = `console.log(x)`;\n';
      const result = removeConsoleLogs(source);
      assert.strictEqual(result.text, source);
      assert.strictEqual(result.count, 0);
    });

    test('line and block comments', () => {
      const source = '// console.log(x)\n/* console.log(y) */\nfoo();\n';
      const result = removeConsoleLogs(source);
      assert.strictEqual(result.text, source);
      assert.strictEqual(result.count, 0);
    });

    test('markdown prose', () => {
      const source = 'Use `console.log(x)` to debug.\n';
      const result = removeConsoleLogs(source, 'markdown');
      assert.strictEqual(result.text, source);
      assert.strictEqual(result.count, 0);
      assert.strictEqual(result.skipped, 0);
    });

    test('JSX text keeps apostrophes', () => {
      const source = [
        'const App = () => (',
        "  <p>Don't worry</p>",
        ');',
        'console.log(App);',
        '',
      ].join('\n');

      const result = removeConsoleLogs(source, 'javascriptreact');
      assert.strictEqual(
        result.text,
        ['const App = () => (', "  <p>Don't worry</p>", ');', ''].join('\n')
      );
      assert.strictEqual(result.count, 1);
    });
  });

  suite('conservative fallback for unparsable sources', () => {
    test('removes only standalone statements and reports skipped calls', () => {
      const source = [
        'const = broken;',
        'console.log(a);',
        'if (cond) console.log(b);',
        'foo(console.log(c));',
        'const s = "console.log(d)";',
        '// console.log(e)',
        '',
      ].join('\n');

      const result = removeConsoleLogs(source, 'javascript');
      assert.strictEqual(result.count, 1);
      assert.strictEqual(result.skipped, 2);
      assert.strictEqual(
        result.text,
        [
          'const = broken;',
          'if (cond) console.log(b);',
          'foo(console.log(c));',
          'const s = "console.log(d)";',
          '// console.log(e)',
          '',
        ].join('\n')
      );
    });

    test('does not remove call-like text from strings, templates, or comments', () => {
      const source = [
        'const = broken;',
        'console.log(real);',
        'const s = `foo;',
        'console.log(templateText);',
        'bar`;',
        '/*',
        'foo();',
        'console.log(commentText);',
        '*/',
        '',
      ].join('\n');

      const result = removeConsoleLogs(source, 'javascript');
      assert.strictEqual(result.count, 1);
      assert.strictEqual(result.skipped, 0);
      assert.strictEqual(
        result.text,
        [
          'const = broken;',
          'const s = `foo;',
          'console.log(templateText);',
          'bar`;',
          '/*',
          'foo();',
          'console.log(commentText);',
          '*/',
          '',
        ].join('\n')
      );
    });

    test('handles single-file components with unparsable markup', () => {
      const source = [
        '<template><div>Hello</div></template>',
        '<script>',
        'export default {',
        '  mounted() {',
        "    console.log('mounted');",
        '  }',
        '}',
        '</script>',
        '',
      ].join('\n');

      const result = removeConsoleLogs(source, 'vue');
      assert.strictEqual(result.count, 1);
      assert.strictEqual(result.skipped, 0);
      assert.strictEqual(
        result.text,
        [
          '<template><div>Hello</div></template>',
          '<script>',
          'export default {',
          '  mounted() {',
          '  }',
          '}',
          '</script>',
          '',
        ].join('\n')
      );
    });
  });
});
