var conf = require('./config/config.js');
var debug = require('debug')('serv:app');
var express = require('express');
var path = require('path');
var logger = require('morgan');
// var cookieParser = require('cookie-parser'); // may result in issues if the secret is not the same as for express-session
var bodyParser = require('body-parser');
var expressLayouts = require('express-ejs-layouts');
var session = require('express-session');
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

// Params for EJS templates
var viewParams = { 
  title: 'Sessions Test',
  msgText: '',
  msgStyle: '',
  currentUser: ''
};

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
  rolling: false,
  resave: false, 
  saveUninitialized: false
}));
// app.use(cookieParser());
// app.use(bodyParser.json());
// app.use(favicon(__dirname + '/public/favicon.png'));

// Models
var Visitor = require('./models/Visitor.js');

// Middleware: take visitor_id from session and load visitor from DB 
function loadVisitor(req, res, next) {
  // debug('loadVisitor');
  if (req.session && req.session.visitor_id) {
    debug('VisitorId: ' + req.session.visitor_id);
    Visitor.findById(req.session.visitor_id, function (err, visitor) {
      if (err) {
        debug(err);
      } else if (visitor) {
        req.visitor = visitor; // for next routes handlers
        viewParams.currentUser = visitor.email; // for EJS templates
      }
      return next();
    });
  } else {
    return next();
  }
}

// Register loadVisitor before any routes handlers
app.use(loadVisitor);

// Routers
// var routes = require('./routes/index');

app.get('/', function (req, res) {
  res.render('pages/home.ejs', viewParams);
});

app.get('/about', function (req, res) {
  res.render('pages/about.ejs', viewParams);
});

app.get('/private', function (req, res) {
  if (req.visitor) { // set by loadVisitor
    res.render('pages/private.ejs', viewParams);
  } else {
    res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
      msgText: 'Forbidden', 
      msgStyle: 'danger'
    }));
  }
});

app.post('/register', bodyParser.urlencoded({ extended: false }), function (req, res, next) {
  // debug(req.get('Content-Type'));
  // debug(req.body);
  Visitor.registerNew({ email: req.body.login, password: req.body.passw }, function (err, visitor) {
    if (err) {
      debug(String(err));
      if (err.visitorErr === 'Validation') {
        res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
          msgText: 'Invalid email or password', 
          msgStyle: 'danger'
        }));
      } else if (err.visitorErr === 'Uniqueness') {
        res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
          msgText: 'User with this email already exists', 
          msgStyle: 'danger'
        }));
      } else {
        return next(new Error('Can not register user'));
      }
    } else {
      debug('Registered new visitor: ' + visitor._id + ' ' + visitor.email);
      req.session.visitor_id = visitor._id;
      req.visitor = visitor;
      res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
        msgText: 'Registration done', 
        msgStyle: 'success',
        currentUser: visitor.email
      })); // Can use res.redirect
    }
  });
});

app.post('/enter', bodyParser.urlencoded({ extended: false }), function (req, res, next) {
  // debug(req.get('Content-Type'));
  // debug(req.body);
  Visitor.checkAuth({ email: req.body.login, password: req.body.passw }, function (err, visitor) {
    if (err) {
      debug(String(err));
      if (err.visitorErr === 'Validation') {
        res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
          msgText: 'Incorrect email or password', 
          msgStyle: 'danger'
        }));
      } else if ((err.visitorErr === 'WrongEmail') || (err.visitorErr === 'WrongPassw')) {
        res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
          msgText: 'Wrong email or password', 
          msgStyle: 'danger'
        }));
      } else {
        return next(new Error('Can not check user'));
      }
    } else {
      debug('Entered visitor: ' + visitor._id + ' ' + visitor.email);
      req.session.visitor_id = visitor._id;
      req.visitor = visitor;
      res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
        msgText: 'Entering done', 
        msgStyle: 'success',
        currentUser: visitor.email
      })); // Can use res.redirect
    }
  });
});


app.get('/logout', function (req,res) {
    req.session.destroy(function(err) {
        if (err) {
            debug(err);
        } else {
            res.redirect('/');
        }
    });
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
      title: viewParams.title,
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
    title: viewParams.title,
    message: err.message,
    error: {}
  });
});

module.exports = app;