var test = require('tape-catch'); // use tape-catch in common test cases
// var test = require('tape'); // use pure tape in case of unexpected exeption to locate it source

// 'npm test' in package.json pipes output to tap-notify and tap-dot => output must be raw tap
// 'node tests/test.js' => output can be decorated by tap-diff
if (!process.env.npm_package_name) { // was launched not from 'npm run'
  var tapDiff = require('tap-diff');
  test.createStream().pipe(tapDiff()).pipe(process.stdout);
}

var sinon = require('sinon');

var Visitor = require('../models/Visitor.js');

test('Visitor', function (troot) {

  troot.test('model validations', function (t) {
    t.plan(2);

    var visitor;

    visitor = new Visitor();
    visitor.validate(function (err) {
      t.ok(err, 'return err on empty input');
    });

    visitor = new Visitor({ email: 'test@mail.com', password: '12345' });
    visitor.validate(function (err) {
      t.error(err, 'return no err on normal input');
    });
  });

  troot.test('visitorCheckSchema', function (t) {
    t.plan(5);

    Visitor.validateCheckSchema(null, function (errs) {
      t.ok(errs, 'return err on null input');
    });

    Visitor.validateCheckSchema({}, function (errs) {
      t.ok(errs, 'return err on empty object input');
    });

    Visitor.validateCheckSchema({ email: 'test', password: '12345' }, function (errs) {
      t.ok(errs, 'return err on invalid email input');
    });

    Visitor.validateCheckSchema({ email: 'test@mail.com', password: '123' }, function (errs) {
      t.ok(errs, 'return err on invalid password input');
    });

    Visitor.validateCheckSchema({ email: 'test@mail.com', password: '12345' }, function (errs) {
      t.notOk(errs, 'return no err on valid input');
    });
  });

  troot.test('createInstance', function (t) {
    var visitor = Visitor.createInstance({ email: 'test@mail.com', password: '12345' });
    t.ok(visitor, 'return not null');
    t.equal(typeof visitor, 'object', 'return object');
    t.ok(visitor.schema, 'schema defined');
    t.equal(visitor.email, 'test@mail.com', 'email correct');
    t.equal(visitor.password, '12345', 'password correct');
    t.end();
  });

  troot.test('encryptPassword', function (t) {
    t.plan(4);

    Visitor.encryptPassword('12345', function (err, hash) { 
      t.error(err, 'return no err');
      t.ok(hash, 'return something');
      t.equal(typeof hash, 'string', 'return string');
      t.equal(hash.length, 60, 'return string[60]');
    });
  });

  troot.test('trySave', function (t) {

    t.test('mongo save err', function (t) { // stub written by hand
      t.plan(2);

      var visitor = new Visitor({ email: 'test@mail.com', password: '12345' });
      visitor.save = function (callback) {
        t.pass('call mongo save');
        callback(new Error('ValidationError'));
      };

      visitor.trySave(function (err) {
        t.ok(err, 'return err');
      });
    });

    t.test('mongo save ok', function (t) { // stub by sinonjs
      t.plan(3);

      var visitor = new Visitor({ email: 'test@mail.com', password: '12345' });
      var stubSave = sinon.stub(visitor, 'save', function (callback) { callback(null); });
      // sinon.stub was made on local variable - removing is not required

      visitor.trySave(function (err, vis) {
        t.ok(visitor.save.calledOnce, 'call mongo save');
        t.error(err, 'return no err');
        t.equal(vis, visitor, 'return current visitor');
      });
    });
  });

  troot.test('registerNew', function (t) {

    t.test('empty input', function (t) {
      t.plan(2);
      
      Visitor.registerNew({}, function (err, visitor) { 
        t.ok(err, 'return err on empty input');
        t.equal(err.visitorErr, 'Validation', 'return Validation err');
      });
    });

    t.test('valid input', function (t) {
      t.plan(9);

      var newVis = {};
      var stubCreate = sinon.stub(Visitor, 'createInstance', function (candidate) {
        t.pass('call createInstance');
        newVis.email = candidate.email;
        newVis.password = candidate.password;
        newVis.trySave = function (callback) {
          t.pass('call trySave');
          callback(null, newVis);
        }
        return newVis;
      });
      // sinon.stub was made on global variable - removing is required

      Visitor.registerNew({ email: 'test@mail.com', password: '12345' }, function (err, visitor) { 
        t.error(err, 'return no err');
        t.ok(visitor, 'return not null');
        t.equal(typeof visitor, 'object', 'return object');
        t.equal(visitor.email, 'test@mail.com', 'email correct');
        t.comment('hash: ' + visitor.password);
        t.ok(visitor.password, 'hash not null');
        t.equal(typeof visitor.password, 'string', 'hash is string');
        t.equal(visitor.password.length, 60, 'hash is string[60]');

        Visitor.createInstance.restore(); // remove sinon.stub - can be passed in case of error
      });
    });

    t.test('crush encryptPassword', function (t) {
      t.plan(3);

      var stubEncrypt = sinon.stub(Visitor, 'encryptPassword', function (password, callback) {
        t.pass('call encryptPassword');
        callback(new Error('TestError'));
      });
      // sinon.stub was made on global variable - removing is required
      
      Visitor.registerNew({ email: 'test@mail.com', password: '12345' }, function (err, visitor) { 
        t.ok(err, 'return err');
        t.equal(err.visitorErr, 'Encryption', 'return Encryption err');

        // Visitor.encryptPassword.restore(); // remove sinon.stub - can be passed in case of error
      });
    });

    t.test('teardown', function (t) { // runs serially after test 'crush encryptPassword' - can be used for teardown
      Visitor.encryptPassword.restore(); // remove sinon.stub - alternate way, can not be passed
      t.end();
    });

  });

});