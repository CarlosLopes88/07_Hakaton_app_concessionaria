const Pedido = require('../../core/domain/pedido');
const PedidoRepositoryInterface = require('../../core/repositoriesInterfaces/pedidoRepositoryInterface');

class PedidoRepository extends PedidoRepositoryInterface {
    /**
     * Adiciona um novo pedido ao repositório
     * @param {Object} pedidoData - Dados do pedido
     * @returns {Promise<Object>} Pedido criado
     */
    async addPedido(pedidoData) {
        // Garantir que tenhamos um histórico de status
        if (!pedidoData.historicoStatus) {
            pedidoData.historicoStatus = [{
                status: pedidoData.status || 'EmProcessamento',
                data: new Date()
            }];
        }
        
        const pedido = new Pedido(pedidoData);
        await pedido.save();
        return pedido;
    }

    /**
     * Busca um pedido pelo ID
     * @param {String} pedidoId - ID do pedido
     * @returns {Promise<Object>} Pedido encontrado ou null
     */
    async getPedidoByPedidoId(pedidoId) {
        return Pedido.findOne({ pedidoId });
    }

    /**
     * Busca todos os pedidos
     * @returns {Promise<Array>} Lista de pedidos
     */
    async getAllPedidos() {
        return Pedido.find({});
    }

    /**
     * Busca pedidos ativos (não finalizados e não cancelados)
     * @returns {Promise<Array>} Lista de pedidos ativos
     */
    async getPedidos() {
        return Pedido.find({
            status: { $nin: ["Finalizado", "Cancelado"] }
        })
        .sort({ dataPedido: 1 })
        .exec();
    }

    /**
     * Busca pedidos por status
     * @param {String} status - Status a ser filtrado
     * @returns {Promise<Array>} Lista de pedidos com o status especificado
     */
    async getPedidosByStatus(status) {
        return Pedido.find({ status })
        .sort({ dataPedido: 1 })
        .exec();
    }

    /**
     * Busca pedidos por cliente
     * @param {String} clienteId - ID do cliente
     * @returns {Promise<Array>} Lista de pedidos do cliente
     */
    async getPedidosByCliente(clienteId) {
        return Pedido.find({ cliente: clienteId })
        .sort({ dataPedido: -1 }) // Mais recentes primeiro
        .exec();
    }

    /**
     * Atualiza o status de um pedido
     * @param {String} pedidoId - ID do pedido
     * @param {String} novoStatus - Novo status
     * @returns {Promise<Object>} Pedido atualizado
     */
    async updatePedidoStatus(pedidoId, novoStatus) {
        const pedidoAtualizado = await Pedido.findOneAndUpdate(
            { pedidoId },
            { status: novoStatus },
            { new: true }
        );
        return pedidoAtualizado;
    }

    /**
     * Atualiza o status de pagamento de um pedido
     * @param {String} pedidoId - ID do pedido
     * @param {String} statusPagamento - Novo status de pagamento
     * @returns {Promise<Object>} Pedido atualizado
     */
    async updateStatusPagamento(pedidoId, statusPagamento) {
        const pedidoAtualizado = await Pedido.findOneAndUpdate(
            { pedidoId },
            { statusPagamento: statusPagamento },
            { new: true }
        );
        return pedidoAtualizado;
    }

    /**
     * Adiciona um registro ao histórico de status
     * @param {String} pedidoId - ID do pedido
     * @param {String} novoStatus - Status a adicionar ao histórico
     * @returns {Promise<Object>} Pedido atualizado
     */
    async addStatusHistory(pedidoId, novoStatus) {
        const novoHistorico = {
            status: novoStatus,
            data: new Date()
        };
        
        const pedidoAtualizado = await Pedido.findOneAndUpdate(
            { pedidoId },
            { $push: { historicoStatus: novoHistorico } },
            { new: true }
        );
        
        return pedidoAtualizado;
    }

    /**
     * Atualiza o ID de pagamento de um pedido
     * @param {String} pedidoId - ID do pedido
     * @param {String} pagamentoId - ID do pagamento
     * @returns {Promise<Object>} Pedido atualizado
     */
    async updatePagamentoId(pedidoId, pagamentoId) {
        const pedidoAtualizado = await Pedido.findOneAndUpdate(
            { pedidoId },
            { pagamentoId: pagamentoId },
            { new: true }
        );
        return pedidoAtualizado;
    }
}

module.exports = PedidoRepository;