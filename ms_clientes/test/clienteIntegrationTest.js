const request = require('supertest');
const express = require('express');
const Cliente = require('../src/core/domain/cliente');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');

describe('Testes de integração do microserviço de clientes', () => {
    let app;
    let server;
    let db_test;

    beforeAll(async () => {
        // Configura o Express
        app = express();
        app.use(express.json());

        // Conecta ao MongoDB
        db_test = await connectToDatabase();

        // Configura as rotas
        const ClienteRepository = require('../src/infrastructure/repositories/clienteRepository');
        const clienteRoutes = require('../src/aplication/interfaces/api/clienteRoutes');
        app.use('/api/cliente', clienteRoutes(new ClienteRepository()));

        // Inicia o servidor em uma porta diferente
        server = app.listen(3031);
    }, 30000);

    afterAll(async () => {
        await disconnectDatabase();
        if (server) {
            await server.close();
        }
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    it('Deve criar e buscar um cliente por ID', async () => {
        const novoCliente = {
            cpf: '123.456.789-09',
            nomeCliente: 'Cliente Integração',
            email: 'integracao@example.com',
        };

        const resPost = await request(app)
            .post('/api/cliente')
            .send(novoCliente);

        expect(resPost.status).toBe(201);
        expect(resPost.body.clienteId).toBeDefined();
        expect(resPost.body.nomeCliente).toBe('Cliente Integração');

        const resGet = await request(app)
            .get(`/api/cliente/${resPost.body.clienteId}`);

        expect(resGet.status).toBe(200);
        expect(resGet.body.nomeCliente).toBe('Cliente Integração');
    });

    it('Deve retornar 404 para cliente não encontrado', async () => {
        const resGet = await request(app)
            .get('/api/cliente/clienteInexistente');

        expect(resGet.status).toBe(404);
    });
});