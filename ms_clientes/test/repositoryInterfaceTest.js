const ClienteRepositoryInterface = require('../src/core/repositoriesInterfaces/clienteRepositoryInterface');

describe('Testes do ClienteRepositoryInterface', () => {
    let repositoryInterface;

    beforeEach(() => {
        repositoryInterface = new ClienteRepositoryInterface();
    });

    it('Deve lançar erro ao chamar addCliente não implementado', async () => {
        await expect(repositoryInterface.addCliente({}))
            .rejects
            .toThrow('Method not implemented: addCliente');
    });

    it('Deve lançar erro ao chamar getClienteByClienteId não implementado', async () => {
        await expect(repositoryInterface.getClienteByClienteId('123'))
            .rejects
            .toThrow('Method not implemented: getClienteByClienteId');
    });

    it('Deve lançar erro ao chamar findClienteByCPF não implementado', async () => {
        await expect(repositoryInterface.findClienteByCPF('123.456.789-09'))
            .rejects
            .toThrow('Method not implemented: findClienteByCPF');
    });

    it('Deve lançar erro ao chamar getAllClientes não implementado', async () => {
        await expect(repositoryInterface.getAllClientes())
            .rejects
            .toThrow('Method not implemented: getAllClientes');
    });
});
