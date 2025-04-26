const axios = require('axios');
require('dotenv').config();

const cliente_url_loadbalancer = process.env.CLIENTE_ENDPOINT;
const produto_url_loadbalancer = process.env.PRODUTO_ENDPOINT;

class PedidoService {
    constructor(pedidoRepository) {
        if (!pedidoRepository) {
            throw new Error("PedidoRepository é obrigatório");
        }
        this.pedidoRepository = pedidoRepository;
    }

    async criarPedido(pedidoData) {
        // Implementação do SAGA pattern com coreografia
        try {
            // 1. Verificar se o cliente existe
            const clienteResponse = await axios.get(`http://${cliente_url_loadbalancer}/api/cliente/${pedidoData.cliente}`);
            const cliente = clienteResponse.data;

            if (!cliente) {
                throw new Error('Cliente não encontrado');
            }

            // 2. Verificar se o veículo existe e se está disponível
            const veiculoResponse = await axios.get(`http://${produto_url_loadbalancer}/api/produto/${pedidoData.veiculoId}`);
            const veiculo = veiculoResponse.data;

            if (!veiculo) {
                throw new Error('Veículo não encontrado');
            }

            if (veiculo.status !== 'Disponivel') {
                throw new Error('Veículo não está disponível para venda');
            }

            // 3. Reservar o veículo (alterar status para Reservado)
            try {
                await axios.put(`http://${produto_url_loadbalancer}/api/produto/${pedidoData.veiculoId}`, {
                    status: 'Reservado',
                    reserva: {
                        clienteId: pedidoData.cliente,
                        dataReserva: new Date().toISOString()
                    }
                });
            } catch (error) {
                // Falha na reserva do veículo
                console.error('Erro ao reservar veículo:', error);
                throw new Error('Não foi possível reservar o veículo');
            }

            // 4. Criar o pedido
            const novoPedido = {
                cliente: pedidoData.cliente,
                veiculo: {
                    veiculoId: veiculo.produtoId,
                    modelo: veiculo.modelo,
                    marca: veiculo.marca,
                    ano: veiculo.ano,
                    preco: veiculo.preco,
                    placa: veiculo.placa
                },
                total: veiculo.preco,
                status: 'Reservado',
                historicoStatus: [{ status: 'EmProcessamento' }, { status: 'Reservado' }]
            };

            const pedidoCriado = await this.pedidoRepository.addPedido(novoPedido);
            return pedidoCriado;

        } catch (error) {
            // Implementação de compensação (rollback)
            if (error.message === 'Não foi possível reservar o veículo') {
                // Não é necessário fazer nada aqui pois a reserva falhou
                console.log('Compensação: Reserva de veículo falhou, não é necessário liberar.');
            } else if (pedidoData.veiculoId && error.message !== 'Veículo não encontrado') {
                // Se chegamos a tentar reservar o veículo, devemos liberá-lo
                try {
                    console.log('Executando compensação: Liberando veículo...');
                    await axios.put(`http://${produto_url_loadbalancer}/api/produto/${pedidoData.veiculoId}`, {
                        status: 'Disponivel'
                    });
                } catch (compError) {
                    console.error('Erro na compensação (liberar veículo):', compError);
                }
            }

            console.error('Erro na saga de criação de pedido:', error);
            throw error;
        }
    }

    async finalizarPedido(pedidoId) {
        try {
            // 1. Verificar se o pedido existe e está com pagamento aprovado
            const pedido = await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
            
            if (!pedido) {
                throw new Error('Pedido não encontrado');
            }
            
            if (pedido.statusPagamento !== 'Aprovado') {
                throw new Error('Pagamento não aprovado');
            }
            
            // 2. Remover o veículo do estoque
            try {
                await axios.delete(`http://${produto_url_loadbalancer}/api/produto/${pedido.veiculo.veiculoId}`);
            } catch (error) {
                console.error('Erro ao remover veículo do estoque:', error);
                throw new Error('Não foi possível remover o veículo do estoque');
            }
            
            // 3. Finalizar o pedido
            const pedidoAtualizado = await this.pedidoRepository.updatePedidoStatus(pedidoId, 'Finalizado');
            
            // 4. Adicionar ao histórico
            await this.pedidoRepository.addStatusHistory(pedidoId, 'Finalizado');
            
            return pedidoAtualizado;
        } catch (error) {
            console.error('Erro na saga de finalização de pedido:', error);
            throw error;
        }
    }

    async cancelarPedido(pedidoId) {
        try {
            // 1. Verificar se o pedido existe
            const pedido = await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
            
            if (!pedido) {
                throw new Error('Pedido não encontrado');
            }
            
            // 2. Se o status for Reservado, precisamos liberar o veículo
            if (pedido.status === 'Reservado' || pedido.status === 'PagamentoEmProcessamento') {
                try {
                    await axios.put(`http://${produto_url_loadbalancer}/api/produto/${pedido.veiculo.veiculoId}`, {
                        status: 'Disponivel'
                    });
                } catch (error) {
                    console.error('Erro ao liberar veículo:', error);
                    throw new Error('Não foi possível liberar o veículo');
                }
            }
            
            // 3. Cancelar o pedido
            const pedidoAtualizado = await this.pedidoRepository.updatePedidoStatus(pedidoId, 'Cancelado');
            
            // 4. Adicionar ao histórico
            await this.pedidoRepository.addStatusHistory(pedidoId, 'Cancelado');
            
            return pedidoAtualizado;
        } catch (error) {
            console.error('Erro na saga de cancelamento de pedido:', error);
            throw error;
        }
    }
}

module.exports = PedidoService;