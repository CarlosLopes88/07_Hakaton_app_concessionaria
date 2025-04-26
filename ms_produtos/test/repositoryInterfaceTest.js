const ProdutoRepositoryInterface = require('../src/core/repositoriesInterfaces/produtoRepositoryInterface');

describe('Testes do ProdutoRepositoryInterface', () => {
    let repositoryInterface;

    beforeEach(() => {
        repositoryInterface = new ProdutoRepositoryInterface();
    });

    it('Deve lançar erro ao chamar addProduto não implementado', async () => {
        await expect(repositoryInterface.addProduto({}))
            .rejects
            .toThrow('Method not implemented: addProduto');
    });

    it('Deve lançar erro ao chamar getProdutoByProdutoId não implementado', async () => {
        await expect(repositoryInterface.getProdutoByProdutoId('123'))
            .rejects
            .toThrow('Method not implemented: getProdutoByProdutoId');
    });

    it('Deve lançar erro ao chamar getAllProdutos não implementado', async () => {
        await expect(repositoryInterface.getAllProdutos())
            .rejects
            .toThrow('Method not implemented: getAllProdutos');
    });

    it('Deve lançar erro ao chamar getProdutosByMarca não implementado', async () => {
        await expect(repositoryInterface.getProdutosByMarca('Toyota'))
            .rejects
            .toThrow('Method not implemented: getProdutosByMarca');
    });

    it('Deve lançar erro ao chamar getProdutosByModelo não implementado', async () => {
        await expect(repositoryInterface.getProdutosByModelo('Corolla'))
            .rejects
            .toThrow('Method not implemented: getProdutosByModelo');
    });

    it('Deve lançar erro ao chamar getProdutosByAno não implementado', async () => {
        await expect(repositoryInterface.getProdutosByAno('2023'))
            .rejects
            .toThrow('Method not implemented: getProdutosByAno');
    });

    it('Deve lançar erro ao chamar getProdutoByPlaca não implementado', async () => {
        await expect(repositoryInterface.getProdutoByPlaca('ABC1234'))
            .rejects
            .toThrow('Method not implemented: getProdutoByPlaca');
    });

    it('Deve lançar erro ao chamar getProdutosByCor não implementado', async () => {
        await expect(repositoryInterface.getProdutosByCor('vermelho'))
            .rejects
            .toThrow('Method not implemented: getProdutosByCor');
    });

    it('Deve lançar erro ao chamar updateProduto não implementado', async () => {
        await expect(repositoryInterface.updateProduto('123', {}))
            .rejects
            .toThrow('Method not implemented: updateProduto');
    });

    it('Deve lançar erro ao chamar deleteProduto não implementado', async () => {
        await expect(repositoryInterface.deleteProduto('123'))
            .rejects
            .toThrow('Method not implemented: deleteProduto');
    });
});