const request = require('supertest');
const express = require('express');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');
const PagamentoService = require('../src/core/services/pagamentoService');
const PagamentoHttpClient = require('../src/infrastructure/http/pagamentoHttpClient');
const axios = require('axios');
const Pedido = require('../src/core/domain/pedido');

jest.mock('axios');

describe('Testes do Repositório de Pagamento para veículos', () => {
   let app;
   let server;
   let db_test;
   let pagamentoHttpClient;
   let pagamentoService;
   let pedidoRepository;
   
   beforeAll(async () => {
       try {
           app = express();
           app.use(express.json());
           db_test = await connectToDatabase();
           process.env.PAGSEGURO_TOKEN = 'test-token';
           
           const PedidoRepository = require('../src/infrastructure/repositories/pedidoRepository');
           pedidoRepository = new PedidoRepository();
           pagamentoHttpClient = new PagamentoHttpClient();
           pagamentoService = new PagamentoService(pedidoRepository, pagamentoHttpClient);
           
           const pagamentoRoutes = require('../src/aplication/interfaces/api/pagamentoRoutes');
           app.use('/api/pagamento', pagamentoRoutes(pagamentoService));
           
           server = app.listen(3034);
       } catch (error) {
           console.error('Erro no setup:', error);
           throw error;
       }
   });

   afterAll(async () => {
       try {
           await disconnectDatabase();
           if (server) {
               await new Promise((resolve) => server.close(resolve));
           }
       } catch (error) {
           console.error('Erro no teardown:', error);
           throw error;
       }
   });

   beforeEach(async () => {
       await clearDatabase();
       jest.clearAllMocks();
   });

   it('Deve criar um novo pagamento para veículo com sucesso', async () => {
       // Arrange
       const mockPagamento = {
           pagamentoId: 'pag123',
           pedidoId: 'pedido123',
           veiculoId: 'veiculo123',
           valor: 120000.00,
           status: 'EmProcessamento',
           qrCodeLink: 'http://qrcode.test/image.png',
           metodo: 'PIX',
           detalhesTransacao: {
               transacaoId: 'TRANS123',
               gateway: 'PagSeguro'
           }
       };

       jest.spyOn(pagamentoService, 'criarPagamento').mockResolvedValue(mockPagamento);
       
       // Criar pedido para teste
       await Pedido.create({
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
           status: 'Reservado'
       });

       // Act
       const res = await request(app)
           .post('/api/pagamento/pedido123')
           .send();

       // Assert
       expect(res.status).toBe(201);
       expect(res.body).toHaveProperty('message', 'Pagamento criado com sucesso');
       expect(res.body).toHaveProperty('pagamento');
       expect(res.body.pagamento).toHaveProperty('pedidoId', 'pedido123');
       expect(res.body.pagamento).toHaveProperty('valor', 120000.00);
       expect(res.body.pagamento).toHaveProperty('qrCodeLink', 'http://qrcode.test/image.png');
       expect(pagamentoService.criarPagamento).toHaveBeenCalledWith('pedido123');
   });

   it('Deve retornar 404 quando pedido não existe', async () => {
       // Arrange
       const error = new Error('Pedido não encontrado');
       error.status = 404;
       jest.spyOn(pagamentoService, 'criarPagamento').mockRejectedValue(error);

       // Act
       const res = await request(app)
           .post('/api/pagamento/pedido-inexistente')
           .send();

       // Assert
       expect(res.status).toBe(404);
       expect(res.body.message).toBe('Pedido não encontrado');
       expect(pagamentoService.criarPagamento).toHaveBeenCalledWith('pedido-inexistente');
   });

   it('Deve retornar 400 quando pedido não está no status correto', async () => {
       // Arrange
       const error = new Error('Pedido não está no status correto para pagamento');
       error.status = 400;
       jest.spyOn(pagamentoService, 'criarPagamento').mockRejectedValue(error);

       // Act
       const res = await request(app)
           .post('/api/pagamento/pedido-status-incorreto')
           .send();

       // Assert
       expect(res.status).toBe(400);
       expect(res.body.message).toBe('Pedido não está no status correto para pagamento');
       expect(pagamentoService.criarPagamento).toHaveBeenCalledWith('pedido-status-incorreto');
   });

   it('Deve consultar status de pagamento de um pedido', async () => {
       // Arrange
       const mockPedido = {
           pedidoId: 'pedido123',
           statusPagamento: 'EmProcessamento',
           total: 120000.00,
           veiculo: {
               marca: 'Toyota',
               modelo: 'Corolla',
               ano: 2023,
               placa: 'ABC1234'
           }
       };

       // Criar pedido para teste
       await Pedido.create({
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
        statusPagamento: 'EmProcessamento',
        status: 'PagamentoEmProcessamento'
    });

    jest.spyOn(pagamentoService, 'consultarStatusPagamento').mockResolvedValue(mockPedido);

    // Act
    const res = await request(app)
        .get('/api/pagamento/pedido123')
        .send();

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pedidoId', 'pedido123');
    expect(res.body).toHaveProperty('statusPagamento', 'EmProcessamento');
    expect(res.body).toHaveProperty('total', 120000.00);
    expect(res.body).toHaveProperty('veiculo');
    expect(res.body.veiculo).toHaveProperty('marca', 'Toyota');
    expect(res.body.veiculo).toHaveProperty('modelo', 'Corolla');
    expect(pagamentoService.consultarStatusPagamento).toHaveBeenCalledWith('pedido123');
});

it('Deve retornar 404 ao consultar pagamento de pedido inexistente', async () => {
    // Arrange
    jest.spyOn(pagamentoService, 'consultarStatusPagamento').mockResolvedValue(null);

    // Act
    const res = await request(app)
        .get('/api/pagamento/pedido-inexistente')
        .send();

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Pedido não encontrado');
    expect(pagamentoService.consultarStatusPagamento).toHaveBeenCalledWith('pedido-inexistente');
    });
});