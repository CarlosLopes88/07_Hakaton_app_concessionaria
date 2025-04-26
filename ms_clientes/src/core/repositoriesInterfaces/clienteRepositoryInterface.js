class ClienteRepositoryInterface {
    /**
     * Adiciona um novo cliente ao repositório.
     * @param {Object} clienteData - Dados do cliente a ser adicionado.
     * @returns {Promise<Object>} O cliente recém-criado.
     */
    async addCliente(clienteData) {
        throw new Error('Method not implemented: addCliente');
    }

    /**
     * Busca um cliente pelo seu ID.
     * @param {String} clienteId - O ID do cliente.
     * @returns {Promise<Object>} O cliente encontrado.
     */
    async getClienteByClienteId(clienteId) {
        throw new Error('Method not implemented: getClienteByClienteId');
    }

    /**
     * Busca um cliente pelo seu CPF.
     * @param {String} cpf - O CPF do cliente.
     * @returns {Promise<Object>} O cliente encontrado.
     */
    async findClienteByCPF(cpf) {
        throw new Error('Method not implemented: findClienteByCPF');
    }

    /**
     * Retorna todos os clientes do repositório.
     * @returns {Promise<Array>} Lista de todos os clientes.
     */
    async getAllClientes() {
        throw new Error('Method not implemented: getAllClientes');
    }
}

module.exports = ClienteRepositoryInterface;