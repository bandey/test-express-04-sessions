/**
 * Модель посетителя.
 * @module models/Visitor
 */

var debug = require('debug')('models:Visitor');
var mongoose = require('mongoose');
var JaySchema = require('jayschema');
var bcrypt = require('bcryptjs');

// Схема для проверки корректности логина и пароля
var visitorJaySchema = { 
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
 * @param {Function(err,visitor)} callback - Параметр: ссылка на самого посетителя
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
 * Метод класса: асинхронно регистрирует нового посетителя.
 * @param {Object} candidate - Параметры посетителя {email,password}
 * @param {Function(err,visitor)} callback - Параметр: ссылка на созданного посетителя
 */
VisitorSchema.statics.registerNew = function (candidate, callback) {
  var jaySchema = new JaySchema();
  jaySchema.validate(candidate, visitorJaySchema, function (errs) {
    if (errs) { 
      debug(errs);
      var err = new Error('ValidationError');
      err.visitorErr = 'Validation';
      return callback(err);
    } else { 
      debug('Validation OK');
      Visitor.encryptPassword(candidate.password, function (err, hash) {
        if (err) {
          debug(err);
          err.visitorErr = 'Encryption';
          return callback(err);
        } else {
          var visitor = new Visitor({ email: candidate.email, password: hash });
          return visitor.trySave(callback);
        }
      });
    }
  });
};

/**
 * Метод класса: асинхронно вычисляет хеш пароля.
 * @param {String} password - Пароль, max 72 байта (note that UTF8 encoded characters use up to 4 bytes) 
 * @param {Function(err,hash)} callback - Параметр: хэш пароля длиной 60 символов
 */
VisitorSchema.statics.encryptPassword = function (password, callback) {
  return bcrypt.hash(password, 8, callback);
};

// Модель посетителя
var Visitor = mongoose.model('Visitor', VisitorSchema); //->s

module.exports = Visitor;

// https://www.npmjs.com/package/bcryptjs
// https://www.npmjs.com/package/mongoose
// http://mongoosejs.com/docs/validation.html
// http://mongoosejs.com/docs/api.html#schematype_SchemaType-set

// mongoose.model('User', {
//   getters: {
//     id: function() {
//       return this._id.toHexString();
//     },

//     password: function() { return this._password; }
//   },

//   setters: {
//     password: function(password) {
//       this._password = password;
//       this.salt = this.makeSalt();
//       this.hashed_password = this.encryptPassword(password);
//     }
//   },

//   methods: {
//     authenticate: function(plainText) {
//       return this.encryptPassword(plainText) === this.hashed_password;
//     },

//     isValid: function() {
//       // TODO: Better validation
//       return this.email && this.email.length > 0 && this.email.length < 255
//              && this.password && this.password.length > 0 && this.password.length < 255;
//     },

//     save: function(okFn, failedFn) {
//       if (this.isValid()) {
//         this.__super__(okFn);
//       } else {
//         failedFn();
//       }
//     }
//   }
// });