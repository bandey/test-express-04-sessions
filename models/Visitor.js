/**
 * Модель посетителя.
 * @module models/Visitor
 */

var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var VisitorSchema = new mongoose.Schema({
  email: { type: String, required: true, maxlength: 50, index: { unique: true } },
  password: { type: String, required: true, maxlength: 60 }
});

VisitorSchema.set('autoIndex', false); // чтобы каждый раз не пересоздавало индекс

/**
 * Вычисляет хеш пароля
 * @param {String} password - Пароль, max 72 байта (note that UTF8 encoded characters use up to 4 bytes) 
 * @return {String} - Хеш пароля, 60 символов
 */
// VisitorSchema.methods.encryptPassword = function(password) {
//   return bcrypt.hashSync(password, 8);
// };

module.exports = mongoose.model('Visitor', VisitorSchema); //->s

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