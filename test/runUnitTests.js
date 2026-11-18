const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

const mocha = new Mocha({
  ui: 'tdd',
  color: true,
});

const testsRoot = path.resolve(__dirname, 'unit');

const files = glob.sync('**/*.test.js', { cwd: testsRoot });
files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

mocha.run((failures) => {
  process.exitCode = failures > 0 ? 1 : 0;
});
