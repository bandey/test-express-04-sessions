var express = require('express');
var conf = require('./config/config.js');
var debug = require('debug')('serv:app');
var logger = require('morgan');
var path = require('path');
// var cookieParser = require('cookie-parser'); // may result in issues if the secret is not the same as for express-session
var bodyParser = require('body-parser');
var expressLayouts = require('express-ejs-layouts');
// var favicon = require('serve-favicon');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var csurf = require('csurf'); // protection from CSRF
var hpp = require('hpp'); // protection from HTTP Parameter Pollution attacks

var i18next = require('i18next');
var i18nMiddleware = require('i18next-express-middleware');
var i18nFSBackend = require('i18next-node-fs-backend');

// Models
var Visitor = require('./models/Visitor.js');

// DB connect
var mongoose = require('mongoose');
if (conf.get('dbDebug')) {
  mongoose.set('debug', true);
}
mongoose.connection.on('error', function (err) {
  console.error('Mongo connection ERR', err);
  process.exit();
});
mongoose.connection.once('open', function () {
  debug('Mongo connection OK');
});
// options.server.socketOptions = options.replset.socketOptions = { keepAlive: 120 };
mongoose.connect(conf.get('dbConnect'), { autoIndex: conf.get('dbAutoIndex') });

var app = express();

// Security setup
app.disable('x-powered-by');

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout'); // defaults to 'layout'

// Middlewares
if (conf.get('log') !== 'none') {
  app.use(logger(conf.get('log')));
}
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);

app.use(session({
  name: 'session_id',
  // cookie: { secure: true, maxAge: 60000 },
  secret: 'secretkey',
  store: new MongoStore({ 
    mongooseConnection: mongoose.connection,
    collection: 'visitor_sessions',
    ttl: 10*60 // automatically remove expired sessions (sec)
  }),
  rolling: false,
  resave: false, 
  saveUninitialized: false
}));

// app.use(cookieParser());
// app.use(bodyParser.json());
// app.use(favicon(__dirname + '/public/favicon.png'));

i18next.use(i18nMiddleware.LanguageDetector).use(i18nFSBackend).init({
  debug: conf.get('i18nDebug'),
  whitelist: ['en', 'ru'], // allowed languages
  detection: { // settings for LanguageDetector
    order: ['path', 'header'], // order and from where user language should be detected
    lookupFromPathIndex: 0, // index of chunk from path
  },
  ns: [ // namespaces - separate json files
    'common',
    'auth'
  ],
  defaultNS: 'common',
  backend: { // settings for FSBackend
    loadPath: './locales/{{lng}}/{{ns}}.json',
    jsonIndent: 2
  },
}, function (err, t) { // callback after init
  if (err) {
    debug(String(err));
    process.exit();
  }
  debug('i18next init OK');
});
app.use(i18nMiddleware.handle(i18next, {
  // ignoreRoutes: ["/foo"],
  removeLngFromUrl: true, // remove language chunk from path for next middlewares
}), function (req, res, next) { // my middleware after i18next
  debug('Lang: ' + req.language + ' ' + req.i18nextLookupName);
  if (req.language != 'dev') { // allowed language detected
    if (req.i18nextLookupName == 'path') { // taken from path => ok
      return next();
    } else { // taken from header => redirect
      return res.redirect(307, '/' + req.language + req.originalUrl);
    }
  } else { // allowed language not detected
    return res.redirect(307, '/en' + req.originalUrl);
  }
});

// Middleware: init object res.locals, shared between routes handlers of one request
var initLocals = function (req, res, next) {
  // debug('initLocals');
  res.locals.title = i18next.t('Title');
  res.locals.urlPrefix = '/' + req.language;
  res.locals.urlPath = req.path;
  res.locals.visitor = null;
  res.locals.msgText = '';
  res.locals.msgStyle = '';
  return next();
}
// Register initLocals before other routes handlers
app.use(initLocals);

// Middleware: take visitor_id from session and load visitor from DB 
var loadVisitor = function (req, res, next) {
  // debug('loadVisitor');
  if (req.session && req.session.visitor_id) {
    debug('VisitorId: ' + req.session.visitor_id);
    Visitor.findById(req.session.visitor_id, function (err, visitor) {
      if (err) {
        debug(String(err));
      } else if (visitor) {
        res.locals.visitor = visitor; // for next routes handlers
      }
      return next();
    });
  } else {
    return next();
  }
}
// Register loadVisitor before other routes handlers
app.use(loadVisitor);

// Middleware: prohibit access without authentification
var checkAuth = function (req, res, next) {
  // debug('checkAuth');
  if (res.locals && res.locals.visitor) { // set by loadVisitor
    return next(); // auth OK
  } else {
    return res.render('pages/blank.ejs', Object.assign({}, res.locals, { 
      msgText: i18next.t('auth:AccessDenied'), 
      msgStyle: 'danger'
    }));
  }
}

// Middleware: protect from CSRF
var protectCSRF = csurf(); // default options are optimal - look at npmjs

// Routers
app.use('/auth', require('./routes/auth'));

app.get('/', function (req, res) {
  return res.render('pages/home.ejs'); // res.locals passed automaticaly
});

app.get('/about', function (req, res) {
  return res.render('pages/about.ejs'); // res.locals passed automaticaly
});

app.get('/private', checkAuth, protectCSRF, function (req, res) {
  // pass checkAuth to protect area from non authentificated visitors
  return res.render('pages/private.ejs', { csrfToken: req.csrfToken() }); // res.locals passed automaticaly
});

app.post('/private', checkAuth, bodyParser.urlencoded({ extended: false }), hpp(), protectCSRF, function (req, res, next) {
  // pass checkAuth to protect area from non authentificated visitors
  var inData = req.body.somedata;
  if (typeof inData !== 'string') {
    return next(new Error('Data is not string'));
  }
  inData = inData.replace(/\W/g, '');

  return res.render('pages/private.ejs', Object.assign({}, res.locals, {
    csrfToken: req.csrfToken(),
    msgText: i18next.t('AcceptedData') + ': ' + inData,
    msgStyle: 'success'
  }));
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  return next(err);
});

// handle error thrown by CSRF protection middleware
app.use(function (err, req, res, next) { // by default it throw 403 with err.code='EBADCSRFTOKEN'
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  // console.error(err);
  return res.render('pages/blank.ejs', Object.assign({}, res.locals, { 
    msgText: i18next.t('auth:RequestDenied'), 
    msgStyle: 'danger'
  }));
});

// error handlers

// development error handler
// will print stacktrace
if (conf.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    console.error(err);
    res.status(err.status || 500);
    return res.render('error', {
      layout: 'layout_err',
      title: (res.locals && res.locals.title) ? res.locals.title : 'Error',
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500);
  return res.render('error', {
    layout: 'layout_err',
    title: (res.locals && res.locals.title) ? res.locals.title : 'Error',
    message: err.message,
    error: {}
  });
});

module.exports = app;
