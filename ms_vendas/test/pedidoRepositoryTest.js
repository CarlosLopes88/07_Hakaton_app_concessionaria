const Pedido = require('../src/core/domain/pedido');
const PedidoRepository = require('../src/infrastructure/repositories/pedidoRepository');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');

describe('Testes do PedidoRepository para veículos', () => {
    let pedidoRepository;
    let db_test;

    beforeAll(async () => {
        db_test = await connectToDatabase();
        pedidoRepository = new PedidoRepository();
    }, 30000);

    afterAll(async () => {
        await disconnectDatabase();
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    it('Deve adicionar um novo pedido de veículo', async () => {
        const pedidoData = {
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
                { status: 'EmProcessamento' },
                { status: 'Reservado' }
            ]
        };

        const pedido = await pedidoRepository.addPedido(pedidoData);

        expect(pedido.pedidoId).toBeDefined();
        expect(pedido.cliente).toBe('cliente123');
        expect(pedido.veiculo.marca).toBe('Toyota');
        expect(pedido.veiculo.modelo).toBe('Corolla');
        expect(pedido.total).toBe(120000.00);
        expect(pedido.status).toBe('Reservado');
        expect(pedido.historicoStatus).toHaveLength(2);
    });

    it('Deve buscar pedido por ID', async () => {
        // Criar pedido de teste
        const novoPedido = await Pedido.create({
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

        const pedidoEncontrado = await pedidoRepository.getPedidoByPedidoId(novoPedido.pedidoId);
        expect(pedidoEncontrado).toBeDefined();
        expect(pedidoEncontrado.pedidoId).toBe(novoPedido.pedidoId);
        expect(pedidoEncontrado.veiculo.marca).toBe('Toyota');
    });

    it('Deve retornar null para ID inexistente', async () => {
        const pedido = await pedidoRepository.getPedidoByPedidoId('id-inexistente');
        expect(pedido).toBeNull();
    });

    it('Deve listar todos os pedidos', async () => {
        // Criar pedidos de teste
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
                status: 'PagamentoEmProcessamento'
            }
        ]);

        const pedidos = await pedidoRepository.getAllPedidos();
        expect(pedidos).toHaveLength(2);
        
        // Verificar se ambos os pedidos estão presentes sem depender da ordem
        const marcas = pedidos.map(p => p.veiculo.marca);
        expect(marcas).toContain('Toyota');
        expect(marcas).toContain('Honda');
    });

    it('Deve listar pedidos ativos (não finalizados/cancelados)', async () => {
        // Criar pedidos com status diferentes
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
                status: 'Reservado'  // Ativo
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
                status: 'Finalizado'  // Inativo
            },
            {
                cliente: 'cliente789',
                veiculo: {
                    veiculoId: 'veiculo789',
                    marca: 'Volkswagen',
                    modelo: 'Golf',
                    ano: 2022,
                    preco: 90000.00,
                    placa: 'GHI9012'
                },
                total: 90000.00,
                status: 'Cancelado'  // Inativo
            }
        ]);

        const pedidosAtivos = await pedidoRepository.getPedidos();
        expect(pedidosAtivos).toHaveLength(1);
        expect(pedidosAtivos[0].status).toBe('Reservado');
    });

    it('Deve buscar pedidos por status', async () => {
        // Criar pedidos com status diferentes
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

        const pedidosReservados = await pedidoRepository.getPedidosByStatus('Reservado');
        expect(pedidosReservados).toHaveLength(2);
        expect(pedidosReservados[0].status).toBe('Reservado');
        expect(pedidosReservados[1].status).toBe('Reservado');
    });

    it('Deve buscar pedidos por cliente', async () => {
        // Criar pedidos para um cliente específico
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
            },
            {
                cliente: 'outro-cliente',
                veiculo: {
                    veiculoId: 'veiculo789',
                    marca: 'Volkswagen',
                    modelo: 'Golf',
                    ano: 2022,
                    preco: 90000.00, 
                    placa: 'GHI9012'
                },
                total: 90000.00,
                status: 'Reservado'
            }
        ]);

        const pedidosCliente = await pedidoRepository.getPedidosByCliente('cliente-especial');
        expect(pedidosCliente).toHaveLength(2);
        expect(pedidosCliente[0].cliente).toBe('cliente-especial');
        expect(pedidosCliente[1].cliente).toBe('cliente-especial');
    });

    it('Deve atualizar o status de um pedido', async () => {
        // Criar pedido de teste
        const novoPedido = await Pedido.create({
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

        const pedidoAtualizado = await pedidoRepository.updatePedidoStatus(
            novoPedido.pedidoId, 
            'Reservado'
        );

        expect(pedidoAtualizado.status).toBe('Reservado');
    });

    it('Deve atualizar o status de pagamento de um pedido', async () => {
        // Criar pedido de teste
        const novoPedido = await Pedido.create({
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
            statusPagamento: 'EmProcessamento'
        });

        const pedidoAtualizado = await pedidoRepository.updateStatusPagamento(
            novoPedido.pedidoId, 
            'Aprovado'
        );

        expect(pedidoAtualizado.statusPagamento).toBe('Aprovado');
    });

    it('Deve adicionar registro ao histórico de status', async () => {
        // Criar pedido de teste
        const novoPedido = await Pedido.create({
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
            status: 'EmProcessamento',
            historicoStatus: [
                { status: 'EmProcessamento', data: new Date() }
            ]
        });

        const pedidoAtualizado = await pedidoRepository.addStatusHistory(
            novoPedido.pedidoId, 
            'Reservado'
        );

        expect(pedidoAtualizado.historicoStatus).toHaveLength(2);
        expect(pedidoAtualizado.historicoStatus[1].status).toBe('Reservado');
    });

    it('Deve atualizar o ID de pagamento de um pedido', async () => {
        // Criar pedido de teste
        const novoPedido = await Pedido.create({
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
            status: 'PagamentoEmProcessamento'
        });

        const pedidoAtualizado = await pedidoRepository.updatePagamentoId(
            novoPedido.pedidoId, 
            'PAG-123456'
        );

        expect(pedidoAtualizado.pagamentoId).toBe('PAG-123456');
    });
});