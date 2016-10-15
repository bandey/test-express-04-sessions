/**
 * Модель посетителя.
 * @module models/Visitor
 */

var debug = require('debug')('models:Visitor');
var mongoose = require('mongoose');
var JaySchema = require('jayschema');
var bcrypt = require('bcryptjs');

// Схема для проверки корректности логина и пароля
var visitorCheckSchema = { 
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "minLength": 6,
      "maxLength": 50,
      "format": "email"
    },
    password: {
      "type": "string",
      "minLength": 5,
      "maxLength": 50,
      "pattern": "^[0-9a-zA-Z\-\_]+$"
    }
  },
  "required": ["email", "password"],
  "additionalProperties": false
};

// Схема посетителя
var VisitorSchema = new mongoose.Schema({
  email: { 
  	type: String, 
  	required: true, 
  	// minlength: 6, 
  	// maxlength: 50,
  	// match: /^[0-9a-z\_\.\-]+\@[0-9a-z\_\.\-]+\.[a-z]{2,6}$/i,
    lowercase: true, // special setter that convert value to lowercase
  	index: { unique: true },
  },
  password: { 
  	type: String, 
  	required: true, 
  	// minlength: 5, 
  	// maxlength: 60, // bcrypt hash size
  	// match: /^[0-9a-zA-Z\/\$\.]+$/, // bcrypt hash allowed symbols 
  }
});

/**
 * Метод объекта: асинхронно сохраняет посетителя в БД.
 * @param {Function(err,visitor)} callback - Параметр visitor: ссылка на самого посетителя
 */
VisitorSchema.methods.trySave = function (callback) {
  var that = this;
  this.save(function (err) {
    if (err) {
      debug(String(err));
      if (err.name === 'ValidationError') {
        err.visitorErr = 'Validation';
        return callback(err);
      } else if ((err.name === 'MongoError') && ((err.code === 11000) || (err.code === 11001))) {
        err.visitorErr = 'Uniqueness'; // нарушение уникальности индекса
        return callback(err);
      } else {
        return callback(err);
      }
    } else {
      debug('New visitor saved to DB');
      return callback(null, that);
    }
  });
};

/**
 * Метод класса: асинхронно проверяет корректность логина и пароля посетителя.
 * @param {Object} candidate - Параметры посетителя {email,password}
 * @param {Function(errs)} callback - Параметр errs: массив ошибок или undefined при успехе
 */
VisitorSchema.statics.validateCheckSchema = function (candidate, callback) {
  var jaySchema = new JaySchema();
  jaySchema.validate(candidate, visitorCheckSchema, callback);
};

/**
 * Метод класса: асинхронно регистрирует нового посетителя.
 * @param {Object} candidate - Параметры посетителя {email,password}
 * @param {Function(err,visitor)} callback - Параметр visitor: ссылка на созданного посетителя
 */
VisitorSchema.statics.registerNew = function (candidate, callback) {
  var that = this;
  that.validateCheckSchema(candidate, function (errs) {
    if (errs) { 
      debug(errs);
      var err = new Error('ValidationError');
      err.visitorErr = 'Validation';
      return callback(err);
    } else { 
      debug('Validation at registration OK');
      that.encryptPassword(candidate.password, function (err, hash) {
        if (err) {
          debug(String(err));
          err.visitorErr = 'Encryption';
          return callback(err);
        } else {
          var visitor = that.createVisitor({ email: candidate.email, password: hash });
          return visitor.trySave(callback);
        }
      });
    }
  });
};

/**
 * Метод класса: асинхронно проверяет посетителя.
 * @param {Object} candidate - Параметры посетителя {email,password}
 * @param {Function(err,visitor)} callback - Параметр visitor: ссылка на вошедшего посетителя
 */
VisitorSchema.statics.checkAuth = function (candidate, callback) {
  var that = this;
  that.validateCheckSchema(candidate, function (errs) {
    if (errs) { 
      debug(errs);
      var err = new Error('ValidationError');
      err.visitorErr = 'Validation';
      return callback(err);
    } else { 
      debug('Validation at entering OK');
      that.findOne({ email: candidate.email.toLowerCase() }).exec(function (err, visitor) {
        if (err) { 
          debug(String(err));
          err.visitorErr = 'Selection';
          return callback(err);
        } else { 
          debug('Found record: ', visitor);
          if (!visitor) {
            var err = new Error('WrongEmailError');
            err.visitorErr = 'WrongEmail';
            return callback(err);
          } else {
            that.checkPassword(candidate.password, visitor.password, function (err, res) {
              if (err) {
                debug(String(err));
                err.visitorErr = 'Encryption';
                return callback(err);
              } else if (!res) {
                debug('Password is not matched');
                var err = new Error('WrongPasswError');
                err.visitorErr = 'WrongPassw';
                return callback(err);
              } else {
                debug('Visitor entered');
                return callback(null, visitor);
              }
            });
          }
        }
      });
    }
  });
};

/**
 * Метод класса: асинхронно вычисляет хэш пароля.
 * @param {String} password - Пароль, max 72 байта (note that UTF8 encoded characters use up to 4 bytes) 
 * @param {Function(err,hash)} callback - Параметр hash: хэш пароля длиной 60 символов
 */
VisitorSchema.statics.encryptPassword = function (password, callback) {
  return bcrypt.hash(password, 8, callback);
};

/**
 * Метод класса: асинхронно проверяет пароль по хэшу.
 * @param {String} password - Пароль, max 72 байта (note that UTF8 encoded characters use up to 4 bytes) 
 * @param {String} hash - хэш пароля длиной 60 символов
 * @param {Function(err,res)} callback - Параметр res: true - верный пароль, false - нет
 */
VisitorSchema.statics.checkPassword = function (password, hash, callback) {
  return bcrypt.compare(password, hash, callback);
};

/**
 * Метод класса: создает объект класса Visitor
 * @param {Object} candidate - Параметры посетителя {email,password}
 * @return {Object} - объект класса Visitor
 */
VisitorSchema.statics.createVisitor = function (candidate) {
  return new Visitor(candidate);
};

// Модель посетителя
var Visitor = mongoose.model('Visitor', VisitorSchema); //->s

module.exports = Visitor;
