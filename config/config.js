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
  dbDebug: {
    doc: "Debug mode for MongoDB.",
    format: Boolean,
    default: false,
    arg: "db-debug"
  }
});

// Load environment dependent configuration 
var env = conf.get('env');
conf.loadFile('./config/' + env + '.json');
 
// Perform validation 
conf.validate({strict: true});
 
module.exports = conf;