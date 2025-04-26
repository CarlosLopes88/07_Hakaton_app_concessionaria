const PagamentoService = require('../src/core/services/pagamentoService');
const axios = require('axios');

// Mock do PedidoService
const mockPedidoService = {
    finalizarPedido: jest.fn(),
    cancelarPedido: jest.fn()
};

// Mock do módulo
jest.mock('../src/core/services/pedidoService', () => {
    return jest.fn().mockImplementation(() => mockPedidoService);
});

jest.mock('axios');

describe('Testes do PagamentoService para veículos', () => {
    let pagamentoService;
    let mockPedidoRepository;
    let mockPagamentoHttpClient;

    beforeEach(() => {
        mockPedidoRepository = {
            getPedidoByPedidoId: jest.fn(),
            updatePedidoStatus: jest.fn(),
            updateStatusPagamento: jest.fn(),
            addStatusHistory: jest.fn(),
            updatePagamentoId: jest.fn()
        };
        
        mockPagamentoHttpClient = {
            criarPagamento: jest.fn(),
            consultarPagamento: jest.fn()
        };
        
        pagamentoService = new PagamentoService(mockPedidoRepository, mockPagamentoHttpClient);
        
        // Resetar todos os mocks
        jest.clearAllMocks();
        mockPedidoService.finalizarPedido.mockReset();
        mockPedidoService.cancelarPedido.mockReset();
    });

    describe('criarPagamento', () => {
        it('Deve lançar erro quando pedido não for encontrado', async () => {
            // Arrange
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(null);
            
            // Act & Assert
            await expect(pagamentoService.criarPagamento('pedido-inexistente'))
                .rejects
                .toThrow('Pedido não encontrado');
        });

        it('Deve lançar erro quando pedido não estiver no status correto', async () => {
            // Arrange
            const pedido = {
                pedidoId: 'pedido123',
                status: 'EmProcessamento', // Status diferente de 'Reservado'
                cliente: 'cliente123',
                veiculo: {
                    veiculoId: 'veiculo123',
                    modelo: 'Corolla',
                    marca: 'Toyota',
                    ano: 2023,
                    preco: 120000.00,
                    placa: 'ABC1234'
                }
            };
            
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);
            
            // Act & Assert
            await expect(pagamentoService.criarPagamento('pedido123'))
                .rejects
                .toThrow('Pedido não está no status correto para pagamento');
        });

        it('Deve lançar erro quando cliente não for encontrado', async () => {
            // Arrange
            const pedido = {
                pedidoId: 'pedido123',
                status: 'Reservado',
                cliente: 'cliente-inexistente',
                veiculo: {
                    veiculoId: 'veiculo123',
                    modelo: 'Corolla',
                    marca: 'Toyota',
                    ano: 2023,
                    preco: 120000.00,
                    placa: 'ABC1234'
                }
            };
            
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);
            
            // Simular erro 404 do serviço de cliente
            axios.get.mockRejectedValueOnce({
                response: {
                    status: 404,
                    data: { message: 'Cliente não encontrado' }
                }
            });
            
            // Act & Assert
            await expect(pagamentoService.criarPagamento('pedido123'))
                .rejects
                .toThrow('Cliente não encontrado');
        });

        it('Deve criar pagamento com sucesso para veículo', async () => {
            // Arrange
            const pedido = {
                pedidoId: 'pedido123',
                status: 'Reservado',
                cliente: 'cliente123',
                veiculo: {
                    veiculoId: 'veiculo123',
                    marca: 'Toyota',
                    modelo: 'Corolla',
                    ano: 2023,
                    preco: 120000.00,
                    placa: 'ABC1234'
                },
                total: 120000.00
            };
            
            const cliente = {
                clienteId: 'cliente123',
                cpf: '111.222.333-44',
                nomeCliente: 'Cliente Teste',
                email: 'cliente@teste.com'
            };
            
            const pagSeguroResponse = {
                data: {
                    id: 'PAYMENT-123',
                    qr_codes: [{
                        links: [
                            {},
                            { href: 'http://qrcode.test/image.png' }
                        ]
                    }]
                }
            };
            
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);
            axios.get.mockResolvedValueOnce({ data: cliente });
            mockPagamentoHttpClient.criarPagamento.mockResolvedValue(pagSeguroResponse);
            
            // Act
            const resultado = await pagamentoService.criarPagamento('pedido123');
            
            // Assert
            expect(resultado).toBeDefined();
            expect(resultado.pedidoId).toBe('pedido123');
            expect(resultado.veiculoId).toBe('veiculo123');
            expect(resultado.valor).toBe(120000.00);
            expect(resultado.status).toBe('EmProcessamento');
            expect(resultado.qrCodeLink).toBe('http://qrcode.test/image.png');
            expect(mockPedidoRepository.updatePedidoStatus).toHaveBeenCalledWith('pedido123', 'PagamentoEmProcessamento');
            expect(mockPedidoRepository.updateStatusPagamento).toHaveBeenCalledWith('pedido123', 'EmProcessamento');
            expect(mockPedidoRepository.addStatusHistory).toHaveBeenCalledWith('pedido123', 'PagamentoEmProcessamento');
        });
    });

    describe('_construirRequestBodyVeiculo', () => {
        it('Deve construir corpo da requisição corretamente para veículo', () => {
            // Arrange
            const pedido = {
                pedidoId: 'pedido123',
                veiculo: {
                    marca: 'Toyota',
                    modelo: 'Corolla',
                    ano: 2023,
                    placa: 'ABC1234'
                },
                total: 120000.00
            };
            
            const cliente = {
                cpf: '111.222.333-44',
                nomeCliente: 'Cliente Teste',
                email: 'cliente@teste.com'
            };
            
            // Act
            const result = pagamentoService._construirRequestBodyVeiculo(pedido, cliente);
            
            // Assert
            expect(result).toBeDefined();
            expect(result.reference_id).toBe('pedido123');
            expect(result.customer.name).toBe('Cliente Teste');
            expect(result.customer.email).toBe('cliente@teste.com');
            expect(result.customer.tax_id).toBe('111.222.333-44');
            expect(result.items).toHaveLength(1);
            expect(result.items[0].name).toBe('Toyota Corolla 2023');
            expect(result.items[0].quantity).toBe(1);
            expect(result.items[0].unit_amount).toBe(120000.00 * 100); // Em centavos
            expect(result.qr_codes[0].amount.value).toBe(120000.00 * 100); // Em centavos
        });
    });

    describe('confirmarPagamento', () => {
        it('Deve lançar erro quando pedido não for encontrado', async () => {
            // Arrange
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(null);
            
            // Act & Assert
            await expect(pagamentoService.confirmarPagamento('pedido-inexistente', 'Aprovado'))
                .rejects
                .toThrow('Pedido não encontrado');
        });

        it('Deve processar pagamento aprovado corretamente', async () => {
            // Arrange
            const pedido = {
                pedidoId: 'pedido123',
                status: 'PagamentoEmProcessamento',
                statusPagamento: 'EmProcessamento',
                veiculo: {
                    veiculoId: 'veiculo123',
                    marca: 'Toyota',
                    modelo: 'Corolla',
                    ano: 2023,
                    preco: 120000.00,
                    placa: 'ABC1234'
                }
            };

            const pedidoAtualizado = {
                ...pedido,
                status: 'Finalizado',
                statusPagamento: 'Aprovado'
            };

            mockPedidoRepository.getPedidoByPedidoId
                .mockResolvedValueOnce(pedido)  // Primeira chamada
                .mockResolvedValueOnce(pedidoAtualizado);  // Segunda chamada no final
            
            mockPedidoRepository.updateStatusPagamento.mockResolvedValue(pedido);
            mockPedidoRepository.updatePedidoStatus.mockResolvedValue(pedido);
            mockPedidoRepository.addStatusHistory.mockResolvedValue(pedido);
            
            // Configurar o mock do PedidoService
            mockPedidoService.finalizarPedido.mockResolvedValue(pedidoAtualizado);
            
            // Act
            const resultado = await pagamentoService.confirmarPagamento('pedido123', 'Aprovado');
            
            // Assert
            expect(resultado).toBeDefined();
            expect(mockPedidoRepository.updateStatusPagamento).toHaveBeenCalledWith('pedido123', 'Aprovado');
            expect(mockPedidoRepository.updatePedidoStatus).toHaveBeenCalledWith('pedido123', 'PagamentoAprovado');
            expect(mockPedidoRepository.addStatusHistory).toHaveBeenCalledWith('pedido123', 'PagamentoAprovado');
            expect(mockPedidoService.finalizarPedido).toHaveBeenCalledWith('pedido123');
        });

        it('Deve processar pagamento recusado corretamente', async () => {
            // Arrange
            const pedido = {
                pedidoId: 'pedido123',
                status: 'PagamentoEmProcessamento',
                statusPagamento: 'EmProcessamento',
                veiculo: {
                    veiculoId: 'veiculo123',
                    marca: 'Toyota',
                    modelo: 'Corolla',
                    ano: 2023,
                    preco: 120000.00,
                    placa: 'ABC1234'
                }
            };

            const pedidoAtualizado = {
                ...pedido,
                status: 'Cancelado',
                statusPagamento: 'Recusado'
            };

            mockPedidoRepository.getPedidoByPedidoId
                .mockResolvedValueOnce(pedido)  // Primeira chamada
                .mockResolvedValueOnce(pedidoAtualizado);  // Segunda chamada no final
            
            mockPedidoRepository.updateStatusPagamento.mockResolvedValue(pedido);
            
            // Configurar o mock do PedidoService
            mockPedidoService.cancelarPedido.mockResolvedValue(pedidoAtualizado);
            
            // Act
            const resultado = await pagamentoService.confirmarPagamento('pedido123', 'Recusado');
            
            // Assert
            expect(resultado).toBeDefined();
            expect(mockPedidoRepository.updateStatusPagamento).toHaveBeenCalledWith('pedido123', 'Recusado');
            expect(mockPedidoService.cancelarPedido).toHaveBeenCalledWith('pedido123');
        });
    });

    describe('consultarStatusPagamento', () => {
        it('Deve retornar null quando pedido não for encontrado', async () => {
            // Arrange
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(null);
            
            // Act
            const resultado = await pagamentoService.consultarStatusPagamento('pedido-inexistente');
            
            // Assert
            expect(resultado).toBeNull();
        });

        it('Deve retornar dados do pedido com status de pagamento', async () => {
            // Arrange
            const pedido = {
                pedidoId: 'pedido123',
                status: 'PagamentoEmProcessamento',
                statusPagamento: 'EmProcessamento',
                veiculo: {
                    veiculoId: 'veiculo123',
                    marca: 'Toyota',
                    modelo: 'Corolla',
                    ano: 2023,
                    placa: 'ABC1234'
                },
                total: 120000.00,
                pagamentoId: 'PAYMENT-123'
            };
            
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);
            
            // Act
            const resultado = await pagamentoService.consultarStatusPagamento('pedido123');
            
            // Assert
            expect(resultado).toBeDefined();
            expect(resultado).toBe(pedido);
        });

        it('Deve tentar atualizar status consultando gateway quando pagamentoId existe', async () => {
            // Arrange
            const pedido = {
                pedidoId: 'pedido123',
                status: 'PagamentoEmProcessamento',
                statusPagamento: 'EmProcessamento',
                pagamentoId: 'PAYMENT-123',
                veiculo: {
                    veiculoId: 'veiculo123',
                    marca: 'Toyota',
                    modelo: 'Corolla',
                    ano: 2023,
                    placa: 'ABC1234'
                }
            };
            
            const pagamentoStatus = {
                data: {
                    status: 'PAID'
                }
            };
            
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);
            mockPagamentoHttpClient.consultarPagamento.mockResolvedValue(pagamentoStatus);
            
            // Mock para confirmarPagamento
            jest.spyOn(pagamentoService, 'confirmarPagamento').mockResolvedValue({
                ...pedido,
                statusPagamento: 'Aprovado'
            });
            
            // Act
            await pagamentoService.consultarStatusPagamento('pedido123', true);
            
            // Assert
            expect(mockPagamentoHttpClient.consultarPagamento).toHaveBeenCalledWith('PAYMENT-123');
            expect(pagamentoService.confirmarPagamento).toHaveBeenCalledWith('pedido123', 'Aprovado');
        });
    });
});