const PedidoService = require('../src/core/services/pedidoService');
const axios = require('axios');

jest.mock('axios');

describe('Testes do PedidoService para veículos', () => {
    let pedidoService;
    let mockPedidoRepository;

    beforeEach(() => {
        // Mock do repositório
        mockPedidoRepository = {
            addPedido: jest.fn(data => Promise.resolve({...data, pedidoId: 'pedido-test-123'})),
            updatePedidoStatus: jest.fn((id, status) => Promise.resolve({pedidoId: id, status})),
            getPedidoByPedidoId: jest.fn(),
            addStatusHistory: jest.fn()
        };

        pedidoService = new PedidoService(mockPedidoRepository);
        jest.clearAllMocks();
    });

    describe('criarPedido', () => {
        it('Deve criar um pedido de veículo com sucesso', async () => {
            // Arrange
            const pedidoData = {
                cliente: 'cliente123',
                veiculoId: 'veiculo123'
            };

            // Mock de cliente
            axios.get
                .mockResolvedValueOnce({
                    data: {
                        clienteId: 'cliente123',
                        nomeCliente: 'Cliente Teste',
                        email: 'cliente@teste.com'
                    }
                })
                // Mock de veículo
                .mockResolvedValueOnce({
                    data: {
                        produtoId: 'veiculo123',
                        marca: 'Toyota',
                        modelo: 'Corolla',
                        ano: 2023,
                        preco: 120000.00,
                        placa: 'ABC1234',
                        status: 'Disponivel'
                    }
                });

            // Mock da atualização do status do veículo
            axios.put.mockResolvedValue({ data: { message: 'Status atualizado com sucesso' } });

            // Act
            const resultado = await pedidoService.criarPedido(pedidoData);

            // Assert
            expect(resultado).toBeDefined();
            expect(resultado.pedidoId).toBe('pedido-test-123');
            expect(resultado.veiculo).toBeDefined();
            expect(resultado.veiculo.marca).toBe('Toyota');
            expect(resultado.veiculo.modelo).toBe('Corolla');
            expect(resultado.total).toBe(120000.00);
            expect(resultado.status).toBe('Reservado');

            // Verificar se o veículo foi reservado
            expect(axios.put).toHaveBeenCalledWith(
                expect.stringContaining('/api/produto/veiculo123'),
                { 
                    status: 'Reservado',
                    reserva: expect.objectContaining({
                        clienteId: 'cliente123',
                        dataReserva: expect.any(String)
                    })
                }
            );

            // Verificar se o pedido foi criado com histórico
            expect(mockPedidoRepository.addPedido).toHaveBeenCalledWith(
                expect.objectContaining({
                    cliente: 'cliente123',
                    veiculo: expect.objectContaining({
                        veiculoId: 'veiculo123',
                        marca: 'Toyota',
                        modelo: 'Corolla'
                    }),
                    historicoStatus: expect.arrayContaining([
                        expect.objectContaining({ status: 'EmProcessamento' }),
                        expect.objectContaining({ status: 'Reservado' })
                    ])
                })
            );
        });

        it('Deve lançar erro quando cliente não existe', async () => {
            // Arrange
            const pedidoData = {
                cliente: 'cliente-inexistente',
                veiculoId: 'veiculo123'
            };

            // Mock de erro ao buscar cliente com formato correspondente ao usado na aplicação
            axios.get.mockRejectedValueOnce({
                response: {
                    status: 404,
                    data: { message: 'Cliente não encontrado' }
                }
            });

            // Act & Assert
            try {
                await pedidoService.criarPedido(pedidoData);
                fail('Deveria ter lançado erro');
            } catch (error) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('Cliente não encontrado');
            }
        });

        it('Deve lançar erro quando veículo não existe', async () => {
            // Arrange
            const pedidoData = {
                cliente: 'cliente123',
                veiculoId: 'veiculo-inexistente'
            };

            // Mock de cliente
            axios.get
                .mockResolvedValueOnce({
                    data: {
                        clienteId: 'cliente123',
                        nomeCliente: 'Cliente Teste'
                    }
                })
                // Mock de erro ao buscar veículo
                .mockRejectedValueOnce({
                    response: {
                        status: 404,
                        data: { message: 'Veículo não encontrado' }
                    }
                });

            // Act & Assert
            try {
                await pedidoService.criarPedido(pedidoData);
                fail('Deveria ter lançado erro');
            } catch (error) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('Veículo não encontrado');
            }
        });

        it('Deve lançar erro quando veículo não está disponível', async () => {
            // Arrange
            const pedidoData = {
                cliente: 'cliente123',
                veiculoId: 'veiculo123'
            };

            // Mock de cliente
            axios.get
                .mockResolvedValueOnce({
                    data: {
                        clienteId: 'cliente123',
                        nomeCliente: 'Cliente Teste'
                    }
                })
                // Mock de veículo já reservado
                .mockResolvedValueOnce({
                    data: {
                        produtoId: 'veiculo123',
                        marca: 'Toyota',
                        modelo: 'Corolla',
                        status: 'Reservado'  // Não está disponível
                    }
                });

            // Act & Assert
            await expect(pedidoService.criarPedido(pedidoData))
                .rejects
                .toThrow('Veículo não está disponível para venda');
        });

        it('Deve executar compensação quando falha ao reservar veículo', async () => {
            // Arrange
            const pedidoData = {
                cliente: 'cliente123',
                veiculoId: 'veiculo123'
            };

            // Mock de cliente
            axios.get
                .mockResolvedValueOnce({
                    data: {
                        clienteId: 'cliente123',
                        nomeCliente: 'Cliente Teste'
                    }
                })
                // Mock de veículo
                .mockResolvedValueOnce({
                    data: {
                        produtoId: 'veiculo123',
                        marca: 'Toyota',
                        modelo: 'Corolla',
                        status: 'Disponivel'
                    }
                });

            // Mock de erro ao reservar veículo
            axios.put.mockRejectedValueOnce(new Error('Erro ao atualizar status'));

            // Act & Assert
            await expect(pedidoService.criarPedido(pedidoData))
                .rejects
                .toThrow('Não foi possível reservar o veículo');

            // Não deve chamar o repositório para criar o pedido
            expect(mockPedidoRepository.addPedido).not.toHaveBeenCalled();
        });
    });

    describe('finalizarPedido', () => {
        it('Deve finalizar pedido após pagamento aprovado', async () => {
            // Arrange
            const pedido = {
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
                status: 'PagamentoAprovado',
                statusPagamento: 'Aprovado'
            };

            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);
            mockPedidoRepository.updatePedidoStatus.mockResolvedValue({
                ...pedido,
                status: 'Finalizado'
            });

            // Mock da chamada para remover veículo
            axios.delete.mockResolvedValue({ data: { message: 'Veículo removido com sucesso' } });

            // Act
            const resultado = await pedidoService.finalizarPedido('pedido123');

            // Assert
            expect(resultado).toBeDefined();
            expect(resultado.status).toBe('Finalizado');
            expect(axios.delete).toHaveBeenCalledWith(
                expect.stringContaining('/api/produto/veiculo123')
            );
            expect(mockPedidoRepository.updatePedidoStatus).toHaveBeenCalledWith('pedido123', 'Finalizado');
            expect(mockPedidoRepository.addStatusHistory).toHaveBeenCalledWith('pedido123', 'Finalizado');
        });

        it('Deve lançar erro quando pedido não existe', async () => {
            // Arrange
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(null);

            // Act & Assert
            await expect(pedidoService.finalizarPedido('pedido-inexistente'))
                .rejects
                .toThrow('Pedido não encontrado');
        });

        it('Deve lançar erro quando pagamento não está aprovado', async () => {
            // Arrange
            const pedido = {
                pedidoId: 'pedido123',
                cliente: 'cliente123',
                statusPagamento: 'Pendente'  // Pagamento não aprovado
            };

            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);

            // Act & Assert
            await expect(pedidoService.finalizarPedido('pedido123'))
                .rejects
                .toThrow('Pagamento não aprovado');
        });

        it('Deve lançar erro quando falha ao remover veículo', async () => {
            // Arrange
            const pedido = {
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
                status: 'PagamentoAprovado',
                statusPagamento: 'Aprovado'
            };

            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);

            // Mock de erro ao remover veículo
            axios.delete.mockRejectedValue(new Error('Erro ao remover veículo'));

            // Act & Assert
            await expect(pedidoService.finalizarPedido('pedido123'))
                .rejects
                .toThrow('Não foi possível remover o veículo do estoque');
        });
    });

    describe('cancelarPedido', () => {
        it('Deve cancelar pedido e liberar veículo reservado', async () => {
            // Arrange
            const pedido = {
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
                status: 'Reservado'
            };

            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);
            mockPedidoRepository.updatePedidoStatus.mockResolvedValue({
                ...pedido,
                status: 'Cancelado'
            });

            // Mock da chamada para liberar veículo
            axios.put.mockResolvedValue({ data: { message: 'Status atualizado com sucesso' } });

            // Act
            const resultado = await pedidoService.cancelarPedido('pedido123');

            // Assert
            expect(resultado).toBeDefined();
            expect(resultado.status).toBe('Cancelado');
            expect(axios.put).toHaveBeenCalledWith(
                expect.stringContaining('/api/produto/veiculo123'),
                { status: 'Disponivel' }
            );
            expect(mockPedidoRepository.updatePedidoStatus).toHaveBeenCalledWith('pedido123', 'Cancelado');
            expect(mockPedidoRepository.addStatusHistory).toHaveBeenCalledWith('pedido123', 'Cancelado');
        });

        it('Deve lançar erro quando pedido não existe', async () => {
            // Arrange
            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(null);

            // Act & Assert
            await expect(pedidoService.cancelarPedido('pedido-inexistente'))
                .rejects
                .toThrow('Pedido não encontrado');
        });

        it('Deve lançar erro quando falha ao liberar veículo', async () => {
            // Arrange
            const pedido = {
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
                status: 'Reservado'
            };

            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);

            // Mock de erro ao liberar veículo
            axios.put.mockRejectedValue(new Error('Erro ao atualizar status'));

            // Act & Assert
            await expect(pedidoService.cancelarPedido('pedido123'))
                .rejects
                .toThrow('Não foi possível liberar o veículo');
        });

        it('Não deve tentar liberar veículo para pedido já finalizado', async () => {
            // Arrange
            const pedido = {
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
                status: 'Finalizado'  // Pedido já finalizado
            };

            mockPedidoRepository.getPedidoByPedidoId.mockResolvedValue(pedido);
            mockPedidoRepository.updatePedidoStatus.mockResolvedValue({
                ...pedido,
                status: 'Cancelado'
            });

            // Act
            await pedidoService.cancelarPedido('pedido123');

            // Assert
            expect(axios.put).not.toHaveBeenCalled(); // Não deve chamar API para liberar veículo
            expect(mockPedidoRepository.updatePedidoStatus).toHaveBeenCalledWith('pedido123', 'Cancelado');
            expect(mockPedidoRepository.addStatusHistory).toHaveBeenCalledWith('pedido123', 'Cancelado');
        });
    });
});