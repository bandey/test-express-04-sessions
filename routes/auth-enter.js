var debug = require('debug')('routes:auth:enter');

var i18next = require('i18next');

var Visitor = require('../models/Visitor.js');

var authEnter = function (req, res, next) {
  // debug(req.get('Content-Type'));
  // debug(req.body);
  Visitor.checkAuth({ email: req.body.login, password: req.body.passw }, function (err, visitor) {
    if (err) {
      debug(String(err));
      if (err.visitorErr === 'Validation') {
        return res.render('pages/blank.ejs', Object.assign({}, res.locals, { 
          msgText: i18next.t('auth:IncorrectEmailOrPassword'), 
          msgStyle: 'danger'
        }));
      } else if ((err.visitorErr === 'WrongEmail') || (err.visitorErr === 'WrongPassw')) {
        return res.render('pages/blank.ejs', Object.assign({}, res.locals, { 
          msgText: i18next.t('auth:WrongEmailOrPassword'), 
          msgStyle: 'danger'
        }));
      } else {
        return next(new Error('Can not check user'));
      }
    } else {
      debug('Entered visitor: ' + visitor._id + ' ' + visitor.email);
      req.session.visitor_id = visitor._id;
      res.locals.visitor = visitor;
      return res.render('pages/blank.ejs', Object.assign({}, res.locals, { 
        msgText: i18next.t('auth:EnteringDone'), 
        msgStyle: 'success'
      })); // Can use res.redirect
    }
  });
};

module.exports = authEnter;