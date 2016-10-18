var test = require('tape-catch'); // use tape-catch in common test cases
// var test = require('tape'); // use pure tape in case of unexpected exeption to locate it source

// 'npm test' in package.json pipes output to tap-notify and tap-dot => output must be raw tap
// 'node tests/test.js' => output can be decorated by tap-diff
if (!process.env.npm_package_name) { // was launched not from 'npm run'
  var tapDiff = require('tap-diff');
  test.createStream().pipe(tapDiff()).pipe(process.stdout);
}

var agent = require('supertest');
// var sinon = require('sinon');

var conf = require('../config/config.js');
conf.set('log', 'none');

var app = require('../serv');
app.set('port', conf.get('port'));

var server = app.listen(app.get('port'), function() { // run server

  test('get root without lang header', function (t) {
    agent(app).get('/')
      .expect(307)
      .expect('Location', '/en/')
      .end(function (err, res) {
        t.error(err, 'redirect to default lang');
        t.end();
      });
  });

  test('get root with lang header', function (t) {
    agent(app).get('/')
      .set('Accept-Language', 'ru')
      .expect(307)
      .expect('Location', '/ru/')
      .end(function (err, res) {
        t.error(err, 'redirect to detected lang');
        t.end();
      });
  });

  test('get home', function (t) {
    agent(app).get('/en/')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .expect(/Home page/)
      .end(function (err, res) {
        t.error(err, 'show home page');
        t.end();
      });
  });

  // Next tests deal with real user stored in db, the better way is to stub operations with db
  test('post auth/enter', function (t) {
    agent(app).post('/en/auth/enter')
      .type('form')
      .send({ login: 'test@mail.com', passw: '12345' })
      .expect(200)
      .expect('set-cookie', /session_id\=[^;]/)
      .expect('Content-Type', /text\/html/)
      .expect(/Entering done/)
      .end(function (err, res) {
        t.error(err, 'done enter and show message');
        t.end();
      });
  });

  test('get auth/exit', function (t) {
    agent(app).get('/en/auth/exit')
      .expect(302)
      .expect('Location', '/en/')
      .end(function (err, res) {
        t.error(err, 'done exit and redirect to root');
        t.end();
      });
  });

  test('teardown', function (t) {
    // stub.restore(); // remove sinon.stub
    t.end();
    server.close(function () { // shutdown server
      process.exit();
    });
  });

});