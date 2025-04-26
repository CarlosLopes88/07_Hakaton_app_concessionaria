class PedidoRepositoryInterface {
    /**
     * Adiciona um novo pedido ao repositório.
     * @param {Object} pedidoData - Dados do pedido a ser adicionado.
     * @returns {Promise<Object>} O pedido recém-criado.
     */
    async addPedido(pedidoData) {
        throw new Error('Method not implemented: addPedido');
    }

    /**
     * Busca um pedido pelo seu ID.
     * @param {String} pedidoId - O ID do pedido.
     * @returns {Promise<Object>} O pedido encontrado.
     */
    async getPedidoByPedidoId(pedidoId) {
        throw new Error('Method not implemented: getPedidoByPedidoId');
    }

    /**
     * Busca todos os pedidos do repositório.
     * @returns {Promise<Array>} Lista de todos os pedidos.
     */
    async getAllPedidos() {
        throw new Error('Method not implemented: getAllPedidos');
    }

    /**
     * Busca pedidos ativos (não finalizados) e ordena por data.
     * @returns {Promise<Array>} Lista de pedidos ativos.
     */
    async getPedidos() {
        throw new Error('Method not implemented: getPedidos');
    }

    /**
     * Atualiza o status de um pedido pelo ID.
     * @param {String} pedidoId - O ID do pedido.
     * @param {String} novoStatus - O novo status do pedido.
     * @returns {Promise<Object>} O pedido atualizado.
     */
    async updatePedidoStatus(pedidoId, novoStatus) {
        throw new Error('Method not implemented: updatePedidoStatus');
    }

    /**
     * Atualiza o status de pagamento de um pedido pelo ID.
     * @param {String} pedidoId - O ID do pedido.
     * @param {String} statusPagamento - O novo status de pagamento.
     * @returns {Promise<Object>} O pedido com status de pagamento atualizado.
     */
    async updateStatusPagamento(pedidoId, statusPagamento) {
        throw new Error('Method not implemented: updateStatusPagamento');
    }

    /**
     * Adiciona um novo status ao histórico de status do pedido.
     * @param {String} pedidoId - O ID do pedido.
     * @param {String} novoStatus - O status a ser adicionado ao histórico.
     * @returns {Promise<Object>} O pedido atualizado.
     */
    async addStatusHistory(pedidoId, novoStatus) {
        throw new Error('Method not implemented: addStatusHistory');
    }

    /**
     * Atualiza o ID de pagamento de um pedido
     * @param {String} pedidoId - O ID do pedido.
     * @param {String} pagamentoId - O ID do pagamento.
     * @returns {Promise<Object>} O pedido atualizado.
     */
    async updatePagamentoId(pedidoId, pagamentoId) {
        throw new Error('Method not implemented: updatePagamentoId');
    }

    /**
     * Busca pedidos por status
     * @param {String} status - O status do pedido.
     * @returns {Promise<Array>} Lista de pedidos com o status especificado.
     */
    async getPedidosByStatus(status) {
        throw new Error('Method not implemented: getPedidosByStatus');
    }

    /**
     * Busca pedidos por cliente
     * @param {String} clienteId - O ID do cliente.
     * @returns {Promise<Array>} Lista de pedidos do cliente.
     */
    async getPedidosByCliente(clienteId) {
        throw new Error('Method not implemented: getPedidosByCliente');
    }
}

module.exports = PedidoRepositoryInterface;