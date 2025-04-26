const request = require('supertest');
const express = require('express');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');
const axios = require('axios');
const Pedido = require('../src/core/domain/pedido');

jest.mock('axios');

describe('Testes das rotas de Pedido para veículos', () => {
   let app;
   let server;
   let db_test;
   let PedidoService;
   
   beforeAll(async () => {
       app = express();
       app.use(express.json());

       db_test = await connectToDatabase();
       
       const PedidoRepository = require('../src/infrastructure/repositories/pedidoRepository');
       PedidoService = require('../src/core/services/pedidoService');
       const pedidoRoutes = require('../src/aplication/interfaces/api/pedidoRoutes');
       
       const pedidoRepository = new PedidoRepository();
       const pedidoService = new PedidoService(pedidoRepository);
       app.use('/api/pedido', pedidoRoutes(pedidoRepository, pedidoService));
       
       server = app.listen(3025);
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

       // Mock para requisição PUT
       axios.put.mockImplementation(() => {
           return Promise.resolve({ data: { message: 'Status atualizado com sucesso' } });
       });
   });

   it('Deve retornar erro quando repositório não é fornecido', () => {
    expect(() => {
        require('../src/aplication/interfaces/api/pedidoRoutes')(null, {});
    }).toThrow("pedidoRepository e pedidoService são obrigatórios");
});

it('Deve criar um novo pedido de veículo', async () => {
    const novoPedido = {
        cliente: "cliente123",
        veiculoId: "veiculo123"
    };

    const res = await request(app)
        .post('/api/pedido')
        .send(novoPedido);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Pedido criado com sucesso. Veículo reservado.');
    expect(res.body.pedido).toBeDefined();
    expect(res.body.pedido.cliente).toBe('cliente123');
    expect(res.body.pedido.veiculo).toBeDefined();
    expect(res.body.pedido.veiculo.marca).toBe('Toyota');
    expect(res.body.pedido.total).toBe(120000.00);
});

it('Deve retornar erro quando veiculoId não é fornecido', async () => {
    const pedidoInvalido = {
        cliente: "cliente123"
        // Sem veiculoId
    };

    const res = await request(app)
        .post('/api/pedido')
        .send(pedidoInvalido);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Dados inválidos. cliente e veiculoId são obrigatórios');
});

it('Deve retornar 404 quando veículo não existe', async () => {
    // Modificar mock para simular veículo inexistente
    axios.get.mockImplementation((url) => {
        if (url.includes('/api/cliente/')) {
            return Promise.resolve({
                data: {
                    clienteId: "cliente123",
                    nomeCliente: "Cliente Teste"
                }
            });
        }
        if (url.includes('/api/produto/')) {
            return Promise.reject({
                response: { 
                    status: 404,
                    data: { message: 'Veículo não encontrado' }
                }
            });
        }
        return Promise.reject(new Error('URL não mockada'));
    });

    const res = await request(app)
        .post('/api/pedido')
        .send({
            cliente: "cliente123",
            veiculoId: "veiculo-inexistente"
        });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('não encontrado');
});

it('Deve retornar 404 quando pedido não existe', async () => {
    const res = await request(app)
        .get('/api/pedido/pedido-inexistente');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Pedido não encontrado.');
});

it('Deve listar pedidos ativos', async () => {
    await Pedido.create({
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

    const res = await request(app)
        .get('/api/pedido/ativos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
});

it('Deve listar pedidos por status', async () => {
    await Pedido.create([
        {
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
        },
        {
            cliente: 'cliente456',
            veiculo: {
                veiculoId: 'veiculo456',
                marca: 'Honda',
                modelo: 'Civic',
                ano: 2023,
                preco: 110000.00,
                placa: 'DEF5678'
            },
            total: 110000.00,
            status: 'Reservado'
        }
    ]);

    const res = await request(app)
        .get('/api/pedido/status/Reservado');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0].status).toBe('Reservado');
});

it('Deve listar pedidos por cliente', async () => {
    await Pedido.create([
        {
            cliente: 'cliente-especial',
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
        },
        {
            cliente: 'cliente-especial',
            veiculo: {
                veiculoId: 'veiculo456',
                marca: 'Honda',
                modelo: 'Civic',
                ano: 2023,
                preco: 110000.00,
                placa: 'DEF5678'
            },
            total: 110000.00,
            status: 'Finalizado'
        }
    ]);

    const res = await request(app)
        .get('/api/pedido/cliente/cliente-especial');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0].cliente).toBe('cliente-especial');
});

it('Deve atualizar o status de um pedido', async () => {
    const pedido = await Pedido.create({
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
        status: 'EmProcessamento'
    });

    const res = await request(app)
        .put(`/api/pedido/${pedido.pedidoId}/status`)
        .send({ novoStatus: 'Reservado' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Status do pedido atualizado');
    expect(res.body.pedido.status).toBe('Reservado');
});

it('Deve retornar 400 para status inválido', async () => {
    const pedido = await Pedido.create({
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
        status: 'EmProcessamento'
    });

    const res = await request(app)
        .put(`/api/pedido/${pedido.pedidoId}/status`)
        .send({ novoStatus: 'StatusInvalido' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Status inválido');
});

it('Deve retornar 400 quando novoStatus não é fornecido', async () => {
    const pedido = await Pedido.create({
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
        status: 'EmProcessamento'
    });

    const res = await request(app)
        .put(`/api/pedido/${pedido.pedidoId}/status`)
        .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Dados inválidos. novoStatus é obrigatório');
});

it('Deve cancelar pedido e liberar veículo reservado', async () => {
    const pedido = await Pedido.create({
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

    // Mock para o PedidoService.cancelarPedido
    jest.spyOn(PedidoService.prototype, 'cancelarPedido').mockImplementation(async (pedidoId) => {
        return {
            pedidoId: pedidoId,
            status: 'Cancelado',
            veiculo: { veiculoId: 'veiculo123' }
        };
    });

    const res = await request(app)
        .put(`/api/pedido/${pedido.pedidoId}/status`)
        .send({ novoStatus: 'Cancelado' });

    expect(res.status).toBe(200);
    expect(res.body.pedido.status).toBe('Cancelado');
    expect(PedidoService.prototype.cancelarPedido).toHaveBeenCalledWith(pedido.pedidoId);
});

it('Deve retornar 500 quando ocorre erro no servidor', async () => {
    // Mock do serviço para forçar erro
    jest.spyOn(PedidoService.prototype, 'criarPedido').mockImplementation(() => {
        throw new Error('Erro interno simulado');
    });

    const res = await request(app)
        .post('/api/pedido')
        .send({
            cliente: 'cliente123',
            veiculoId: 'veiculo123'
        });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro no servidor');
});
});