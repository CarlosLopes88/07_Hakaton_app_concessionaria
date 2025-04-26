// src/aplication/interfaces/web/server.js
require('dotenv').config();  // Carrega as variáveis de ambiente no início
const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const db = require('../../../infrastructure/dbconnect');

// Repositórios e clientes HTTP
const ClienteRepository = require('../../../infrastructure/repositories/clienteRepository');

// Rotas
const clienteRoutes = require('../../interfaces/api/clienteRoutes'); 

// Inicialização do app Express
const app = express();
app.use(bodyParser.json());

// Configurações de CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
});

// Conexão com o MongoDB
db.once('open', () => {
    console.log('Microserviço de Cadastro de Clientes conectado ao MongoDB');
    const PORT = process.env.PORT || 3001;

    // Inicializa os repositórios e clientes HTTP
    const clienteRepository = new ClienteRepository();

    // Documentação Swagger
    const swaggerDocument = YAML.load(path.join(__dirname, '../../../../docs/openapi.yaml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // Configuração das rotas com as instâncias corretas
    app.use('/api/cliente', clienteRoutes(clienteRepository));

    // Inicia o servidor
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});