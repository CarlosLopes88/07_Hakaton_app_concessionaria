const request = require('supertest');
const express = require('express');
const Pedido = require('../src/core/domain/pedido');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');
const axios = require('axios');
const PagamentoService = require('../src/core/services/pagamentoService');
const PagamentoHttpClient = require('../src/infrastructure/http/pagamentoHttpClient');
const PedidoRepository = require('../src/infrastructure/repositories/pedidoRepository');

jest.mock('axios');

describe('Testes de integração do microserviço de pagamentos para veículos', () => {
    let app;
    let server;
    let db_test;
    let pedidoRepository;
    let pagamentoHttpClient;
    let pagamentoService;

    beforeAll(async () => {
        app = express();
        app.use(express.json());

        db_test = await connectToDatabase();
        
        pedidoRepository = new PedidoRepository();
        pagamentoHttpClient = new PagamentoHttpClient();
        pagamentoService = new PagamentoService(pedidoRepository, pagamentoHttpClient);
        
        const pagamentoRoutes = require('../src/aplication/interfaces/api/pagamentoRoutes');
        
        app.use('/api/pagamento', pagamentoRoutes(pagamentoService));
        
        server = app.listen(3033);
    });

    afterAll(async () => {
        await disconnectDatabase();
        if (server) {
            await server.close();
        }
    });

    beforeEach(async () => {
        await clearDatabase();
        jest.clearAllMocks();

        // Mock do serviço de cliente
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/cliente/')) {
                return Promise.resolve({
                    data: {
                        clienteId: "cliente123",
                        cpf: "11122233344",
                        nomeCliente: "Cliente Teste",
                        email: "cliente@teste.com"
                    }
                });
            }
            // Mock do serviço de veículos
            if (url.includes('/api/produto/')) {
                return Promise.resolve({
                    data: {
                        produtoId: "veiculo123",
                        marca: "Toyota",
                        modelo: "Corolla",
                        ano: 2023,
                        cor: "Prata",
                        placa: "ABC1234",
                        preco: 120000.00,
                        status: "Disponivel"
                    }
                });
            }
            return Promise.reject(new Error('URL não mockada'));
        });

        // Mock do PagSeguro
        axios.post.mockResolvedValue({
            data: {
                id: "PAYMENT-123456789",
                qr_codes: [
                    {
                        links: [
                            { rel: "self", href: "https://api.pagseguro.com/qrcodes/123" },
                            { rel: "qrCodeImage", href: 'http://qrcode.test/image.png' }
                        ]
                    }
                ]
            }
        });
    });

    it('Deve criar um pagamento para um pedido de veículo', async () => {
        // Criar pedido de teste com dados de veículo
        const pedido = await Pedido.create({
            pedidoId: 'pedido123',
            cliente: 'cliente123',
            veiculo: {
                veiculoId: 'veiculo123',
                marca: 'Toyota',
                modelo: 'Corolla',
                ano: 2023,
                preco: 120000.00,
                placa: 'ABC1234'
            },
            total: 120000.00,
            status: 'Reservado',
            historicoStatus: [
                { status: 'EmProcessamento', data: new Date() },
                { status: 'Reservado', data: new Date() }
            ]
        });

        const res = await request(app)
            .post(`/api/pagamento/${pedido.pedidoId}`)
            .send();

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Pagamento criado com sucesso");
        expect(res.body.pagamento.pedidoId).toBe(pedido.pedidoId);
        expect(res.body.pagamento.valor).toBe(pedido.total);
        expect(res.body.pagamento.status).toBe('EmProcessamento');
        expect(res.body.pagamento.qrCodeLink).toBeDefined();
    });

    it('Deve retornar 404 para pedido inexistente', async () => {
        const res = await request(app)
            .post('/api/pagamento/pedido-inexistente')
            .send();

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Pedido não encontrado');
    });

    it('Deve retornar 400 quando pedido não está no status correto', async () => {
        // Criar pedido com status diferente de Reservado
        const pedido = await Pedido.create({
            pedidoId: 'pedido-status-errado',
            cliente: 'cliente123',
            veiculo: {
                veiculoId: 'veiculo123',
                marca: 'Toyota',
                modelo: 'Corolla',
                ano: 2023,
                preco: 120000.00,
                placa: 'ABC1234'
            },
            total: 120000.00,
            status: 'EmProcessamento', // Status diferente de 'Reservado'
            historicoStatus: [
                { status: 'EmProcessamento', data: new Date() }
            ]
        });

        const res = await request(app)
            .post(`/api/pagamento/${pedido.pedidoId}`)
            .send();

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Pedido não está no status correto para pagamento');
    });

    it('Deve lidar com erros do PagSeguro', async () => {
        // Criar pedido de teste
        const pedido = await Pedido.create({
            pedidoId: 'pedido123',
            cliente: 'cliente123',
            veiculo: {
                veiculoId: 'veiculo123',
                marca: 'Toyota',
                modelo: 'Corolla',
                ano: 2023,
                preco: 120000.00,
                placa: 'ABC1234'
            },
            total: 120000.00,
            status: 'Reservado',
            historicoStatus: [
                { status: 'EmProcessamento', data: new Date() },
                { status: 'Reservado', data: new Date() }
            ]
        });

        // Mock de erro do PagSeguro
        axios.post.mockRejectedValueOnce({
            response: {
                status: 500,
                data: { 
                    error_messages: ['Erro no processamento'] 
                }
            }
        });

        const res = await request(app)
            .post(`/api/pagamento/${pedido.pedidoId}`)
            .send();

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro na API do PagSeguro: 500');
    });

    it('Deve lidar com cliente não encontrado', async () => {
        // Criar pedido de teste
        const pedido = await Pedido.create({
            pedidoId: 'pedido123',
            cliente: 'cliente-inexistente',
            veiculo: {
                veiculoId: 'veiculo123',
                marca: 'Toyota',
                modelo: 'Corolla',
                ano: 2023,
                preco: 120000.00,
                placa: 'ABC1234'
            },
            total: 120000.00,
            status: 'Reservado',
            historicoStatus: [
                { status: 'EmProcessamento', data: new Date() },
                { status: 'Reservado', data: new Date() }
            ]
        });

        // Mock de erro do serviço de cliente
        axios.get.mockImplementationOnce((url) => {
            if (url.includes('/api/cliente/')) {
                return Promise.reject({
                    response: {
                        status: 404,
                        data: { message: 'Cliente não encontrado' }
                    }
                });
            }
            return Promise.resolve({ data: {} });
        });

        const res = await request(app)
            .post(`/api/pagamento/${pedido.pedidoId}`)
            .send();

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Cliente não encontrado');
    });

    it('Deve consultar status de pagamento de um pedido', async () => {
        // Criar pedido de teste com dados de veículo e status de pagamento
        const pedido = await Pedido.create({
            pedidoId: 'pedido123',
            cliente: 'cliente123',
            veiculo: {
                veiculoId: 'veiculo123',
                marca: 'Toyota',
                modelo: 'Corolla',
                ano: 2023,
                preco: 120000.00,
                placa: 'ABC1234'
            },
            total: 120000.00,
            status: 'PagamentoEmProcessamento',
            statusPagamento: 'EmProcessamento',
            pagamentoId: 'PAYMENT-123456789',
            historicoStatus: [
                { status: 'EmProcessamento', data: new Date() },
                { status: 'Reservado', data: new Date() },
                { status: 'PagamentoEmProcessamento', data: new Date() }
            ]
        });

        // Mock para consultarStatusPagamento
        jest.spyOn(pagamentoService, 'consultarStatusPagamento')
            .mockResolvedValue(pedido);

        const res = await request(app)
            .get(`/api/pagamento/${pedido.pedidoId}`)
            .send();

        expect(res.status).toBe(200);
        expect(res.body.pedidoId).toBe(pedido.pedidoId);
        expect(res.body.statusPagamento).toBe('EmProcessamento');
        expect(res.body.total).toBe(120000.00);
        expect(res.body.veiculo).toBeDefined();
        expect(res.body.veiculo.marca).toBe('Toyota');
        expect(res.body.veiculo.modelo).toBe('Corolla');
    });

    it('Deve retornar 404 ao consultar pagamento de pedido inexistente', async () => {
        // Mock para consultarStatusPagamento
        jest.spyOn(pagamentoService, 'consultarStatusPagamento')
            .mockResolvedValue(null);

        const res = await request(app)
            .get('/api/pagamento/pedido-inexistente')
            .send();

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Pedido não encontrado');
    });
});