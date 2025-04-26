require('dotenv').config();
const mongoose = require('mongoose');

// Valores obtidos das variáveis de ambiente
const username = process.env.DOCDB_USERNAME;
const password = process.env.DOCDB_PASSWORD;
const clusterEndpoint = process.env.DOCDB_CLUSTER_ENDPOINT_PED;
const dbName = process.env.DOCDB_DBNAME;
const dbport = process.env.DOCDB_DBPORT;

if (!username || !password || !clusterEndpoint || !dbName || !dbport) {
  console.error('Environment variables are not set correctly.');
  process.exit(1);
}

const connectionString = `mongodb://${username}:${password}@${clusterEndpoint}:${dbport}/${dbName}?authSource=admin&retryWrites=false`;

mongoose.connect(connectionString, {
  //useNewUrlParser: true,
  //useUnifiedTopology: true,
  authMechanism: 'SCRAM-SHA-1' // Define o mecanismo explicitamente
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});

module.exports = db;