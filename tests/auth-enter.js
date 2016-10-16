var test = require('tape-catch'); // use tape-catch in common test cases
// var test = require('tape'); // use pure tape in case of unexpected exeption to locate it source

// 'npm test' in package.json pipes output to tap-notify and tap-dot => output must be raw tap
// 'node tests/test.js' => output can be decorated by tap-diff
if (!process.env.npm_package_name) { // was launched not from 'npm run'
  var tapDiff = require('tap-diff');
  test.createStream().pipe(tapDiff()).pipe(process.stdout);
}

var sinon = require('sinon');

var authEnter = require('../routes/auth-enter.js');

var Visitor = require('../models/Visitor.js');
var i18next = require('i18next');

test('authEnter', function (t) {
  t.plan(10);

  var req = { 
    body: { 
      login: 'test@mail.com',
      passw: '12345'
    },
    session: {}
  };

  var visitor = Visitor.createInstance({ email: req.body.login, password: '666HASH999' });

  var res = {
    locals: {},
    render: function (template, params) {
      t.pass('res.render called');
      t.equal(template, 'pages/blank.ejs', 'template blank');
      t.equal(params.msgStyle, 'success', 'style success');
      t.equal(params.msgText, i18next.t('auth:EnteringDone'), 'message correct');
      t.equal(params.visitor, visitor, 'pass visitor')
      t.equal(req.session.visitor_id, visitor._id, 'set session visitor id');
    }
  };

  var next = function (err) {
    t.fail('callback next called');
  };

  // we can make stub for global module Visitor, and this stub will work inside module auth-enter too - cool!
  var stubCheck = sinon.stub(Visitor, 'checkAuth', function (candidate, callback) {
    t.pass('call checkAuth');
    t.equal(typeof candidate, 'object', 'pass object');
    t.equal(candidate.email, req.body.login, 'pass correct login')
    t.equal(candidate.password, req.body.passw, 'pass correct password')
    callback(null, visitor);
  });
  // sinon.stub was made on global variable - removing is required

  authEnter(req, res, next);
});

test('teardown', function (t) {
  Visitor.checkAuth.restore(); // remove sinon.stub
  t.end();
});