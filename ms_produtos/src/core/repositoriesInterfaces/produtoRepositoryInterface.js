class ProdutoRepositoryInterface {
    /**
     * Adiciona um novo produto ao repositório.
     * @param {Object} produtoData - Dados do produto a ser adicionado.
     * @returns {Promise<Object>} O produto recém-criado.
     */
    async addProduto(produtoData) {
        throw new Error('Method not implemented: addProduto');
    }

    /**
     * Retorna todos os produtos do repositório.
     * @returns {Promise<Array>} Lista de todos os produtos.
     */
        async getAllProdutos() {
            throw new Error('Method not implemented: getAllProdutos');
    }

    /**
     * Busca um produto pelo seu ID.
     * @param {String} produtoId - O ID do produto.
     * @returns {Promise<Object>} O produto encontrado.
    
    */
    async getProdutoByProdutoId(produtoId) {
        throw new Error('Method not implemented: getProdutoByProdutoId');
    }

    /**
     * Retorna produtos de uma marca específica.
     * @param {String} marca - A marca dos produtos.
     * @returns {Promise<Array>} Lista de produtos por marca.
     */
    async getProdutosByMarca(marca) {
        throw new Error('Method not implemented: getProdutosByMarca');
    }

    /**
     * Retorna produtos de uma modelo específica.
     * @param {String} modelo - Modelo dos produtos.
     * @returns {Promise<Array>} Lista de produtos por modelo.
     */
        async getProdutosByModelo(modelo) {
            throw new Error('Method not implemented: getProdutosByModelo');
    }

    /**
     * Retorna produtos de uma ano específica.
     * @param {String} ano - Ano dos produtos.
     * @returns {Promise<Array>} Lista de produtos da ano.
     */
        async getProdutosByAno(ano) {
            throw new Error('Method not implemented: getProdutosByAno');
    }

    /**
     * Retorna produtos de uma placa específica.
     * @param {String} placa - A placa dos produtos.
     * @returns {Promise<Object>}  Lista o produto da placa.
     */
        async getProdutoByPlaca(placa) {
            throw new Error('Method not implemented: getProdutoByPlaca');
    }

    /**
     * Retorna produtos de uma cor específica.
     * @param {String} cor - A cor dos produtos.
     * @returns {Promise<Array>} Lista os produtos da cor.
     */
        async getProdutosByCor(cor) {
            throw new Error('Method not implemented: getProdutosByCor');
    }
    
    /**
     * Atualiza um produto pelo ID.
     * @param {String} produtoId - O ID do produto.
     * @param {Object} updateData - Dados para atualização do produto.
     * @returns {Promise<Object>} O produto atualizado.
     */
    async updateProduto(produtoId, updateData) {
        throw new Error('Method not implemented: updateProduto');
    }

    /**
     * Exclui um produto pelo ID.
     * @param {String} produtoId - O ID do produto.
     * @returns {Promise<Object>} O produto excluído.
     */
    async deleteProduto(produtoId) {
        throw new Error('Method not implemented: deleteProduto');
    }
}

module.exports = ProdutoRepositoryInterface;