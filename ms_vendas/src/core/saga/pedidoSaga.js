const axios = require('axios');
require('dotenv').config();

const cliente_url_loadbalancer = process.env.CLIENTE_ENDPOINT;
const produto_url_loadbalancer = process.env.PRODUTO_ENDPOINT;

/**
 * Implementação do padrão SAGA para o processo de pedido de veículos
 * Usando a abordagem de coreografia, onde cada passo dispara o próximo
 */
class PedidoSaga {
    constructor(pedidoRepository) {
        if (!pedidoRepository) {
            throw new Error("PedidoRepository é obrigatório para o PedidoSaga");
        }
        this.pedidoRepository = pedidoRepository;
    }

    /**
     * Verificar se o cliente existe
     * @param {String} clienteId 
     * @returns {Promise<Object>}
     */
    async verificarCliente(clienteId) {
        try {
            const response = await axios.get(`http://${cliente_url_loadbalancer}/api/cliente/${clienteId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                const newError = new Error('Cliente não encontrado');
                newError.status = 404;
                throw newError;
            }
            console.error('Erro ao verificar cliente:', error);
            throw error;
        }
    }

    /**
     * Verificar se o veículo existe e está disponível
     * @param {String} veiculoId 
     * @returns {Promise<Object>}
     */
    async verificarVeiculo(veiculoId) {
        try {
            const response = await axios.get(`http://${produto_url_loadbalancer}/api/produto/${veiculoId}`);
            const veiculo = response.data;
            
            if (veiculo.status !== 'Disponivel') {
                const error = new Error('Veículo não está disponível para venda');
                error.status = 400;
                throw error;
            }
            
            return veiculo;
        } catch (error) {
            if (error.response?.status === 404) {
                const newError = new Error('Veículo não encontrado');
                newError.status = 404;
                throw newError;
            }
            console.error('Erro ao verificar veículo:', error);
            throw error;
        }
    }

    /**
     * Reservar veículo
     * @param {String} veiculoId 
     * @returns {Promise<void>}
     */
    async reservarVeiculo(veiculoId, clienteId) {
        try {
            await axios.put(`http://${produto_url_loadbalancer}/api/produto/${veiculoId}`, {
                status: 'Reservado',
                reserva: {
                    clienteId,
                    dataReserva: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Erro ao reservar veículo:', error);
            const newError = new Error('Não foi possível reservar o veículo');
            newError.status = 500;
            throw newError;
        }
    }

    /**
     * Liberar veículo (compensação para reservarVeiculo)
     * @param {String} veiculoId 
     * @returns {Promise<void>}
     */
    async liberarVeiculo(veiculoId) {
        try {
            await axios.put(`http://${produto_url_loadbalancer}/api/produto/${veiculoId}`, {
                status: 'Disponivel'
            });
            console.log(`Veículo ${veiculoId} liberado com sucesso (compensação)`);
        } catch (error) {
            console.error('Erro ao liberar veículo (compensação):', error);
            // Mesmo em caso de erro na compensação, não propagamos o erro
            // Podemos registrar para retry posterior ou alertar administradores
        }
    }

    /**
     * Remover veículo do estoque (após pagamento aprovado)
     * @param {String} veiculoId 
     * @returns {Promise<void>}
     */
    async removerVeiculo(veiculoId) {
        try {
            await axios.delete(`http://${produto_url_loadbalancer}/api/produto/${veiculoId}`);
        } catch (error) {
            console.error('Erro ao remover veículo do estoque:', error);
            const newError = new Error('Não foi possível remover o veículo do estoque');
            newError.status = 500;
            throw newError;
        }
    }

    /**
     * Criar registro do pedido
     * @param {Object} pedidoData 
     * @returns {Promise<Object>}
     */
    async criarPedido(pedidoData) {
        try {
            const novoPedido = await this.pedidoRepository.addPedido(pedidoData);
            return novoPedido;
        } catch (error) {
            console.error('Erro ao criar pedido:', error);
            throw error;
        }
    }

    /**
     * Atualizar status do pedido
     * @param {String} pedidoId 
     * @param {String} novoStatus 
     * @returns {Promise<Object>}
     */
    async atualizarStatusPedido(pedidoId, novoStatus) {
        try {
            const pedidoAtualizado = await this.pedidoRepository.updatePedidoStatus(pedidoId, novoStatus);
            await this.pedidoRepository.addStatusHistory(pedidoId, novoStatus);
            return pedidoAtualizado;
        } catch (error) {
            console.error('Erro ao atualizar status do pedido:', error);
            throw error;
        }
    }

    /**
     * Atualizar status de pagamento do pedido
     * @param {String} pedidoId 
     * @param {String} statusPagamento 
     * @returns {Promise<Object>}
     */
    async atualizarStatusPagamento(pedidoId, statusPagamento) {
        try {
            const pedidoAtualizado = await this.pedidoRepository.updateStatusPagamento(pedidoId, statusPagamento);
            return pedidoAtualizado;
        } catch (error) {
            console.error('Erro ao atualizar status de pagamento:', error);
            throw error;
        }
    }
}

module.exports = PedidoSaga;