var debug = require('debug')('routes:auth');

var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');

var hpp = require('hpp'); // protection from HTTP Parameter Pollution attacks

var i18next = require('i18next');

var Visitor = require('../models/Visitor.js');

var authEnter = require('./auth-enter.js');

router.post('/register', bodyParser.urlencoded({ extended: false }), hpp(), function (req, res, next) {
  // debug(req.get('Content-Type'));
  // debug(req.body);
  Visitor.registerNew({ email: req.body.login, password: req.body.passw }, function (err, visitor) {
    if (err) {
      debug(String(err));
      if (err.visitorErr === 'Validation') {
        return res.render('pages/blank.ejs', Object.assign({}, res.locals, { 
          msgText: i18next.t('auth:InvalidEmailOrPassword'), 
          msgStyle: 'danger'
        }));
      } else if (err.visitorErr === 'Uniqueness') {
        return res.render('pages/blank.ejs', Object.assign({}, res.locals, { 
          msgText: i18next.t('auth:UserWithThisEmailAlreadyExists'), 
          msgStyle: 'danger'
        }));
      } else {
        return next(new Error('Can not register user'));
      }
    } else {
      debug('Registered new visitor: ' + visitor._id + ' ' + visitor.email);
      req.session.visitor_id = visitor._id;
      res.locals.visitor = visitor;
      return res.render('pages/blank.ejs', Object.assign({}, res.locals, { 
        msgText: i18next.t('auth:RegistrationDone'), 
        msgStyle: 'success'
      })); // Can use res.redirect
    }
  });
});

router.get('/register', function (req, res) {
  return res.redirect(res.locals.urlPrefix + '/');
});

router.post('/enter', bodyParser.urlencoded({ extended: false }), hpp(), authEnter);

router.get('/enter', function (req, res) {
  return res.redirect(res.locals.urlPrefix + '/');
});

router.get('/exit', function (req, res, next) {
  res.locals.visitor = null;
  req.session.destroy(function (err) {
    if (err) {
      debug(String(err));
      return next(new Error('Can not exit'));
    } else {
      return res.redirect(res.locals.urlPrefix + '/');
    }
  });
});

module.exports = router;