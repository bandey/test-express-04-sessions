var debug = require('debug')('routes:auth');

var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');

var mongoose = require('mongoose');
var Visitor = require('../models/Visitor.js');

router.post('/register', bodyParser.urlencoded({ extended: false }), function (req, res, next) {
  // debug(req.get('Content-Type'));
  // debug(req.body);
  Visitor.registerNew({ email: req.body.login, password: req.body.passw }, function (err, visitor) {
    if (err) {
      debug(String(err));
      if (err.visitorErr === 'Validation') {
        return res.render('pages/blank.ejs', Object.assign({}, req.var, { 
          msgText: 'Invalid email or password', 
          msgStyle: 'danger'
        }));
      } else if (err.visitorErr === 'Uniqueness') {
        return res.render('pages/blank.ejs', Object.assign({}, req.var, { 
          msgText: 'User with this email already exists', 
          msgStyle: 'danger'
        }));
      } else {
        return next(new Error('Can not register user'));
      }
    } else {
      debug('Registered new visitor: ' + visitor._id + ' ' + visitor.email);
      req.session.visitor_id = visitor._id;
      req.var.visitor = visitor;
      return res.render('pages/blank.ejs', Object.assign({}, req.var, { 
        msgText: 'Registration done', 
        msgStyle: 'success'
      })); // Can use res.redirect
    }
  });
});

router.post('/enter', bodyParser.urlencoded({ extended: false }), function (req, res, next) {
  // debug(req.get('Content-Type'));
  // debug(req.body);
  Visitor.checkAuth({ email: req.body.login, password: req.body.passw }, function (err, visitor) {
    if (err) {
      debug(String(err));
      if (err.visitorErr === 'Validation') {
        return res.render('pages/blank.ejs', Object.assign({}, req.var, { 
          msgText: 'Incorrect email or password', 
          msgStyle: 'danger'
        }));
      } else if ((err.visitorErr === 'WrongEmail') || (err.visitorErr === 'WrongPassw')) {
        return res.render('pages/blank.ejs', Object.assign({}, req.var, { 
          msgText: 'Wrong email or password', 
          msgStyle: 'danger'
        }));
      } else {
        return next(new Error('Can not check user'));
      }
    } else {
      debug('Entered visitor: ' + visitor._id + ' ' + visitor.email);
      req.session.visitor_id = visitor._id;
      req.var.visitor = visitor;
      return res.render('pages/blank.ejs', Object.assign({}, req.var, { 
        msgText: 'Entering done', 
        msgStyle: 'success'
      })); // Can use res.redirect
    }
  });
});

router.get('/exit', function (req, res, next) {
  req.var.visitor = null;
  req.session.destroy(function (err) {
    if (err) {
      debug(String(err));
      return next(new Error('Can not exit'));
    } else {
      return res.redirect(req.var.urlPrefix + '/');
    }
  });
});

module.exports = router;