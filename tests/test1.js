var test = require('tape-catch'); // use tape-catch in common test cases
// var test = require('tape'); // use pure tape in case of unexpected exeption to locate it source

// 'npm test' in package.json pipes output to tap-notify and tap-dot => output must be raw tap
// 'node tests/test.js' => output can be decorated by tap-diff
if (!process.env.npm_package_name) { // was launched not from 'npm run'
  var tapDiff = require('tap-diff');
  test.createStream().pipe(tapDiff()).pipe(process.stdout);
}

test('Seven', function (t) {
  var seven = 7;
  t.ok(seven, 'is not null');
  t.end();
});

test('Timer', function (t) {
  t.timeoutAfter(3000);
  setTimeout(function () {
    t.pass('interval end');
    t.end();
  }, 2000)
});

test('MyFunction', function (t) {
  var funk = function (val) {
    if (!val) {
      throw 'ERR';
    }
    return 'OK';
  };

  t.throws(function () { funk() }, 'without param throws');
  t.throws(function () { funk(0) }, 'with zero param throws');
  t.doesNotThrow(function () { funk(1) }, 'with nonzero param does not throws');
  t.end();
});