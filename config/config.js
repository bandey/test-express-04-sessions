var convict = require('convict');

// Define a schema 
var conf = convict({
  env: {
    doc: "Applicaton environment.",
    format: ["production", "development"],
    default: "development",
    env: "NODE_ENV"
  },
  port: {
    doc: "Port to bind.",
    format: "port",
    default: 8080,
    env: "PORT"
  },
  log: {
    doc: "HTTP logger mode.",
    format: ["common", "dev", "none"],
    default: "none",
    arg: "log"
  },
  dbConnect: {
    doc: "Configuration string for MongoDB connection.",
    format: String,
    default: "mongodb://localhost/test",
    arg: "db-connect"
  },
  dbAutoIndex: { // перепроверять ли наличие индексов таблиц при каждом запуске программы
    doc: "AutoIndex setting for MongoDB.",
    format: Boolean,
    default: false, // true - удобно для development, false - быстрее для production
    arg: "db-auto-index"
  },
  dbDebug: {
    doc: "Debug mode for MongoDB.",
    format: Boolean,
    default: false,
    arg: "db-debug"
  },
  i18nDebug: {
    doc: "Debug mode for i18next.",
    format: Boolean,
    default: false,
    arg: "i18n-debug"
  },
  ejsTestRouter: {
    doc: "Router for EJS templates testing.",
    format: Boolean,
    default: false,
    arg: "ejs-test"
  }
});

// Load environment dependent configuration 
var env = conf.get('env');
conf.loadFile('./config/' + env + '.json');
 
// Perform validation 
conf.validate({strict: true});
 
module.exports = conf;