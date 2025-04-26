// produtoIntegrationTest.js
const request = require('supertest');
const express = require('express');
const Produto = require('../src/core/domain/produto');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');

describe('Testes de integração do microserviço de veículos', () => {
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
        const ProdutoRepository = require('../src/infrastructure/repositories/produtoRepository');
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        app.use('/api/produto', produtoRoutes(new ProdutoRepository()));

        // Inicia o servidor em uma porta diferente
        server = app.listen(3032);
    }, 30000);

    afterAll(async () => {
        // Limpa o banco de dados após todos os testes
        await clearDatabase();
        // Desconecta do banco e fecha o servidor
        await disconnectDatabase();
        if (server) {
            await server.close();
        }
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    it('Deve criar e buscar um veículo por ID', async () => {
        const novoVeiculo = {
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        };

        const resPost = await request(app)
            .post('/api/produto')
            .send(novoVeiculo);

        expect(resPost.status).toBe(201);
        expect(resPost.body).toBeDefined();
        expect(resPost.body.produtoId).toBeDefined();
        expect(resPost.body.marca).toBe('Toyota');
        expect(resPost.body.modelo).toBe('Corolla');

        const resGet = await request(app)
            .get(`/api/produto/${resPost.body.produtoId}`);

        expect(resGet.status).toBe(200);
        expect(resGet.body.marca).toBe('Toyota');
        expect(resGet.body.modelo).toBe('Corolla');
    });

    it('Deve retornar 404 para veículo não encontrado', async () => {
        const resGet = await request(app)
            .get('/api/produto/veiculoInexistente');

        expect(resGet.status).toBe(404);
    });

    it('Deve buscar veículos por marca', async () => {
        const novoVeiculo = {
            marca: 'Honda',
            modelo: 'Civic',
            ano: '2023',
            cor: 'Preto',
            placa: 'BCA4321',
            preco: 115000.00
        };

        await request(app)
            .post('/api/produto')
            .send(novoVeiculo);

        const resGet = await request(app)
            .get('/api/produto/marca/Honda');

        expect(resGet.status).toBe(200);
        expect(resGet.body[0].marca).toBe('Honda');
        expect(resGet.body[0].modelo).toBe('Civic');
    });

    it('Deve retornar erro ao tentar criar veículo duplicado', async () => {
        const veiculo = {
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        };

        await request(app).post('/api/produto').send(veiculo);
        const resPost = await request(app).post('/api/produto').send(veiculo);

        expect(resPost.status).toBe(400);
        expect(resPost.body.message).toContain('Produto já cadastrado com estes dados');
    });
});