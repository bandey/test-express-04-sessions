var conf = require('./config/config.js');
var debug = require('debug')('serv:app');
var express = require('express');
var path = require('path');
var logger = require('morgan');
// var cookieParser = require('cookie-parser'); // may result in issues if the secret is not the same as for express-session
var bodyParser = require('body-parser');
var expressLayouts = require('express-ejs-layouts');
var session = require('express-session'); // SESSION
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
app.use(session({
  name: 'session_id',
  // cookie: { secure: true, maxAge: 60000 },
  secret: 'secretkey',
  rolling: false,
  resave: false, 
  saveUninitialized: false
})); // SESSION
// app.use(cookieParser());
// app.use(bodyParser.json());
// app.use(favicon(__dirname + '/public/favicon.png'));
app.use(expressLayouts);

// Params for EJS templates
var viewParams = { 
  title: 'Sessions Test',
  msgText: '',
  msgStyle: '',
  currentUser: ''
};

// Models
var Visitor = require('./models/Visitor.js');

// Routers
// var routes = require('./routes/index');

app.get('/', function (req, res) {
  res.render('pages/home.ejs', viewParams);
});

app.get('/about', function (req, res) {
  res.render('pages/about.ejs', viewParams);
});

app.post('/register', bodyParser.urlencoded({ extended: false }), function (req, res, next) {
  // debug(req.get('Content-Type'));
  // debug(req.body);
  // var visitor = new Visitor({ email: req.body.login, password: req.body.passw });
  // visitor.registerNew(function (err, data) {
  Visitor.registerNew({ email: req.body.login, password: req.body.passw }, function (err, visitor) {
    if (err) {
      debug(String(err));
      if (err.visitorErr === 'Validation') {
        res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
          msgText: 'Wrong email or password', 
          msgStyle: 'danger'
        }));
      } else if (err.visitorErr === 'Uniqueness') {
        res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
          msgText: 'User with this email already exists', 
          msgStyle: 'danger'
        }));
      } else {
        next(new Error('Can not save data to DB'));
      }
    } else {
      debug('Registered new visitor: ' + visitor.email);
      res.render('pages/blank.ejs', Object.assign({}, viewParams, { 
        msgText: 'Registration done', 
        msgStyle: 'success'
      }));
    }
  });
});


function loadVisitor(req, res, next) { // Error handling
  if (req.session.user_id) {
    Visitor.findById(req.session.user_id, function(user) {
      if (user) {
        req.currentUser = user;
        next();
      } else {
        res.redirect('/sessions/new');
      }
    });
  } else {
    res.redirect('/sessions/new');
  }
}

// Users
// app.get('/users/new', function(req, res) {
//   res.render('users/new.jade', {
//     locals: { user: new User() }
//   });
// });

// app.post('/users.:format?', function(req, res) {
// var user = new User(req.body.user);
//   function userSaved() {
//     switch (req.params.format) {
//       case 'json':
//         res.send(user.__doc);
//       break;

//       default:
//         req.session.user_id = user.id;
//         res.redirect('/documents');
//     }
//   }

//   function userSaveFailed() {
//     // TODO: Show error messages
//     res.render('users/new.jade', {
//       locals: { user: user }
//     });
//   }

//   user.save(userSaved, userSaveFailed);
// });

// Sessions
// app.get('/sessions/new', function(req, res) {
//   res.render('sessions/new.ejs', {
//     // locals: { user: new User() },
//     title: 'Sessions Test'
//   });
// });

// app.post('/sessions', function(req, res) {
//   User.find({ email: req.body.user.email }).first(function(user) {
//     if (user && user.authenticate(req.body.user.password)) {
//       req.session.user_id = user.id;
//       res.redirect('/documents');
//     } else {
//       // TODO: Show error
//       res.redirect('/sessions/new');
//     }
//   }); 
// });

var sess; // SESSION
// app.use('/', routes);
// app.use('/articles', articles);
// app.get('/', loadVisitor, function (req, res) {
app.get('/main', function (req, res) {
    // sess = req.session; // SESSION
    // if (sess.email) {
        // res.redirect('/admin');
    // } else {
        res.render('pages/home.ejs', { title: pageTitle, currentUser: currentUser });
    // }
});

app.get('/private', function (req, res) {
    res.render('pages/private.ejs', { title: pageTitle, currentUser: currentUser });
});

app.post('/login', function (req, res) {
    // sess = req.session;
    // In this we are assigning email to sess.email variable.
    // email comes from HTML page.
    // sess.email = req.body.email;
    // debug('LOGIN: ' + req.body.email + ' + ' + req.body.pass);
    // res.end('done');
    res.render('pages/private.ejs', { title: pageTitle, currentUser: currentUser });
});

app.get('/admin', function (req,res) {
    sess = req.session;
    if (sess.email) {
        res.write('<h1>Hello '+sess.email+'</h1>');
        // var visitor = new Visitor({email: 'test@mail.ru', password: '12345'});
        // visitor.save();
        // res.write(Visitor.encryptPassword('test'));
        res.end('<a href="+">Logout</a>');
    } else {
        res.write('<h1>Please login first.</h1>');
        res.end('<a href="+">Login</a>');
    }
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
  next(err);
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