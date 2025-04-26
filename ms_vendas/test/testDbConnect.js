require('dotenv').config();
const mongoose = require('mongoose');

async function connectToDatabase() {
    try {
        const username = process.env.DOCDB_USERNAME;
        const password = process.env.DOCDB_PASSWORD;
        const clusterEndpoint = process.env.DOCDB_CLUSTER_ENDPOINT_PED;
        const dbName = process.env.DOCDB_DBNAME;
        const dbport = process.env.DOCDB_DBPORT;

        if (!username || !password || !clusterEndpoint || !dbName || !dbport) {
            throw new Error('Environment variables are not set correctly.');
        }

        const connectionString = `mongodb://${username}:${password}@${clusterEndpoint}:${dbport}/${dbName}?authSource=admin&retryWrites=false`;

        console.log(`Conectando ao banco de dados: ${dbName} em ${clusterEndpoint}:${dbport}`);

        await mongoose.connect(connectionString, {
            authMechanism: 'SCRAM-SHA-1'
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.once('open', () => {
            console.log('Connected to MongoDB Test Database');
        });

        return mongoose.connection;
    } catch (error) {
        console.error('Error connecting to database:', error);
        throw error;
    }
}

async function disconnectDatabase() {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('Disconnected from MongoDB');
        }
    } catch (error) {
        console.error('Error disconnecting from database:', error);
        throw error;
    }
}

async function clearDatabase() {
    try {
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database not connected');
        }
        
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
        console.log('Database cleared');
    } catch (error) {
        console.error('Error clearing database:', error);
        throw error;
    }
}

module.exports = {
    connectToDatabase,
    disconnectDatabase,
    clearDatabase
};