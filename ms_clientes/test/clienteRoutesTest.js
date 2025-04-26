const request = require('supertest');
const express = require('express');
const Cliente = require('../src/core/domain/cliente');
const ClienteRepository = require('../src/infrastructure/repositories/clienteRepository');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');

describe('Testes das rotas de Cliente', () => {
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
        const clienteRoutes = require('../src/aplication/interfaces/api/clienteRoutes');
        app.use('/api/cliente', clienteRoutes(new ClienteRepository()));
        
        // Inicia o servidor em uma porta diferente
        server = app.listen(3021);
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

    it('Deve criar um novo cliente', async () => {
        const novoCliente = {
            cpf: '123.456.789-09',
            nomeCliente: 'Teste Silva',
            email: 'teste@example.com',
        };

        const res = await request(app)
            .post('/api/cliente')
            .send(novoCliente);

        expect(res.status).toBe(201);
        expect(res.body.nomeCliente).toBe('Teste Silva');
    });

    it('Deve retornar cliente já registrado', async () => {
        const cliente = {
            cpf: '123.456.789-09',
            nomeCliente: 'Cliente Existente',
            email: 'existente@example.com',
        };

        // Primeiro cadastro
        await request(app)
            .post('/api/cliente')
            .send(cliente);

        // Tentativa de cadastro duplicado
        const res = await request(app)
            .post('/api/cliente')
            .send(cliente);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Cliente já registrado.');
    });

    it('Deve permitir cadastro anônimo', async () => {
        const res = await request(app)
            .post('/api/cliente')
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Continuando como anônimo.');
    });

    it('Deve retornar 404 quando não existem clientes', async () => {
        const res = await request(app).get('/api/cliente');
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Nenhum cliente encontrado.');
    });

    it('Deve retornar lista de clientes', async () => {
        // Cadastra alguns clientes primeiro
        await Cliente.create([
            {
                cpf: '111.111.111-11',
                nomeCliente: 'Cliente 1',
                email: 'cliente1@example.com',
            },
            {
                cpf: '222.222.222-22',
                nomeCliente: 'Cliente 2',
                email: 'cliente2@example.com',
            }
        ]);

        const res = await request(app).get('/api/cliente');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body).toHaveLength(2);
    });

    it('Deve retornar erro 500 ao falhar na busca', async () => {
        // Força um erro na operação
        jest.spyOn(Cliente, 'find').mockImplementationOnce(() => {
            throw new Error('Erro forçado');
        });

        const res = await request(app).get('/api/cliente');
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });
});