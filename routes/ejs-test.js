var debug = require('debug')('routes:ejs');

var express = require('express');
var router = express.Router();

var i18next = require('i18next');

// This tests have to be used separately for unauthorised and authorised users
// Authorisation have to be done traditionally through login-password form
// Display language can be changed also traditionally by changing url prefix

var hrefsList = []; // list of url sufixes for tested pages
var pagesList = []; // list of descriptions for tested pages

router.get('/', function (req, res) {
  return res.render('pages/blank', Object.assign({}, res.locals, { 
    layout: 'ejs-test', // look at this template for logic
    hrefsList: hrefsList,
    pagesList: pagesList
  }));
});

pagesList.push('Try to enter - success');
hrefsList.push('enter-success');
router.get('/enter-success', function (req, res) {
  return res.render('pages/blank.ejs', Object.assign({}, res.locals, { 
    msgText: i18next.t('auth:EnteringDone'), 
    msgStyle: 'success'
  }));
});

pagesList.push(''); // blank row
hrefsList.push('');

pagesList.push('Try to enter - incorrect email or password');
hrefsList.push('enter-incorrect');
router.get('/enter-incorrect', function (req, res) {
  return res.render('pages/blank.ejs', Object.assign({}, res.locals, {
    msgText: i18next.t('auth:IncorrectEmailOrPassword'), 
    msgStyle: 'danger'
  }));
});

pagesList.push('Try to enter - wrong email or password');
hrefsList.push('enter-wrong');
router.get('/enter-wrong', function (req, res) {
  return res.render('pages/blank.ejs', Object.assign({}, res.locals, {
    msgText: i18next.t('auth:WrongEmailOrPassword'), 
    msgStyle: 'danger'
  }));
});

module.exports = router;