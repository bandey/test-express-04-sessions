var conf = require('./config/config.js');
var debug = require('debug')('serv:app');
var express = require('express');
var path = require('path');
var logger = require('morgan');
// var cookieParser = require('cookie-parser'); // may result in issues if the secret is not the same as for express-session
var bodyParser = require('body-parser');
var expressLayouts = require('express-ejs-layouts');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
// var favicon = require('serve-favicon');

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

// Models
var Visitor = require('./models/Visitor.js');

// Middleware: init object var, shared between routes handlers of one request
var initVar = function (req, res, next) {
  // debug('initVar');
  req.var = { 
    title: 'Sessions Test', // can be reference to string from internationalisation table
    visitor: null,
    msgText: '',
    msgStyle: ''
  };
  return next();
}
// Register initVar before other routes handlers
app.use(initVar);

// Middleware: take visitor_id from session and load visitor from DB 
var loadVisitor = function (req, res, next) {
  // debug('loadVisitor');
  if (req.session && req.session.visitor_id) {
    debug('VisitorId: ' + req.session.visitor_id);
    Visitor.findById(req.session.visitor_id, function (err, visitor) {
      if (err) {
        debug(String(err));
      } else if (visitor) {
        req.var.visitor = visitor; // for next routes handlers
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
  if (req.var && req.var.visitor) { // set by loadVisitor
    return next(); // auth OK
  } else {
    res.render('pages/blank.ejs', Object.assign({}, req.var, { 
      msgText: 'Forbidden', 
      msgStyle: 'danger'
    }));
  }
}

// Routers
app.use('/auth', require('./routes/auth'));

app.get('/', function (req, res) {
  res.render('pages/home.ejs', req.var);
});

app.get('/about', function (req, res) {
  res.render('pages/about.ejs', req.var);
});

app.get('/private', checkAuth, function (req, res) {
  // pass checkAuth to protect area from non authentificated visitors
  res.render('pages/private.ejs', req.var);
});

app.post('/private', checkAuth, bodyParser.urlencoded({ extended: false }), function (req, res, next) {
  // pass checkAuth to protect area from non authentificated visitors
  var inData = req.body.somedata;
  if (typeof inData !== 'string') {
    return next(new Error('Data is not string'));
  }
  inData = inData.replace(/\W/g, '');

  res.render('pages/private.ejs', Object.assign({}, req.var, { 
    msgText: 'Accepted data: ' + inData,
    msgStyle: 'success'
  }));
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  return next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (conf.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    console.error(err);
    res.status(err.status || 500);
    res.render('error', {
      layout: 'layout_err',
      title: (req.var && req.var.title) ? req.var.title : 'Error',
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
  res.render('error', {
    layout: 'layout_err',
    title: (req.var && req.var.title) ? req.var.title : 'Error',
    message: err.message,
    error: {}
  });
});

module.exports = app;
