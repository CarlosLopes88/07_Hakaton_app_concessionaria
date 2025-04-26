const Cliente = require('../src/core/domain/cliente');
const ClienteRepository = require('../src/infrastructure/repositories/clienteRepository');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');

describe('Testes do ClienteRepository', () => {
    let clienteRepository;
    let db_test;

    beforeAll(async () => {
        db_test = await connectToDatabase();
        clienteRepository = new ClienteRepository();
    }, 30000);

    afterAll(async () => {
        await disconnectDatabase();
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    it('Deve adicionar um novo cliente', async () => {
        const cliente = await clienteRepository.addCliente({
            cpf: '123.456.789-09',
            nomeCliente: 'Teste Silva',
            email: 'teste@example.com',
        });

        expect(cliente.clienteId).toBeDefined();
        expect(cliente.nomeCliente).toBe('Teste Silva');
        expect(cliente.cpf).toBe('123.456.789-09');
        expect(cliente.email).toBe('teste@example.com');
    });

    it('Deve buscar cliente por CPF', async () => {
        const novoCliente = {
            cpf: '987.654.321-00',
            nomeCliente: 'Teste CPF',
            email: 'teste.cpf@example.com',
        };

        await clienteRepository.addCliente(novoCliente);
        const cliente = await clienteRepository.findClienteByCPF('987.654.321-00');

        expect(cliente).toBeDefined();
        expect(cliente.nomeCliente).toBe('Teste CPF');
    });

    it('Deve retornar null para CPF não encontrado', async () => {
        const cliente = await clienteRepository.findClienteByCPF('111.111.111-11');
        expect(cliente).toBeNull();
    });

    it('Deve retornar lista vazia quando não há clientes', async () => {
        const clientes = await clienteRepository.getAllClientes();
        expect(Array.isArray(clientes)).toBe(true);
        expect(clientes).toHaveLength(0);
    });

    it('Deve retornar todos os clientes cadastrados', async () => {
        const clientes = [
            {
                cpf: '111.111.111-11',
                nomeCliente: 'Cliente 1',
                email: 'cliente1@example.com',
            },
            {
                cpf: '222.222.222-22',
                nomeCliente: 'Cliente 2',
                email: 'cliente2@example.com',
            }
        ];

        for (const cliente of clientes) {
            await clienteRepository.addCliente(cliente);
        }

        const clientesRetornados = await clienteRepository.getAllClientes();
        expect(clientesRetornados).toHaveLength(2);
        expect(clientesRetornados[0].nomeCliente).toBe('Cliente 1');
        expect(clientesRetornados[1].nomeCliente).toBe('Cliente 2');
    });

    it('Deve buscar cliente por ID', async () => {
        const novoCliente = await clienteRepository.addCliente({
            cpf: '333.333.333-33',
            nomeCliente: 'Cliente Busca ID',
            email: 'cliente.id@example.com',
        });

        const clienteEncontrado = await clienteRepository.getClienteByClienteId(novoCliente.clienteId);
        expect(clienteEncontrado).toBeDefined();
        expect(clienteEncontrado.nomeCliente).toBe('Cliente Busca ID');
    });

    // Novos testes para melhorar cobertura

    it('Deve acessar as propriedades virtuais do modelo Cliente', async () => {
        const novoCliente = await clienteRepository.addCliente({
            cpf: '123.456.789-09',
            nomeCliente: 'Teste Virtual',
            email: 'teste.virtual@example.com',
        });
        
        // Convertendo para documento Mongoose
        const clienteDoc = await Cliente.findOne({ clienteId: novoCliente.clienteId });
        
        // Testando os virtuais
        expect(clienteDoc.cpf).toBe('[DADOS PROTEGIDOS]');
        expect(clienteDoc.nomeCliente).toBe('[DADOS PROTEGIDOS]');
        expect(clienteDoc.email).toBe('[DADOS PROTEGIDOS]');
    });

    it('Deve lidar com valores nulos/indefinidos em addCliente', async () => {
        const cliente = await clienteRepository.addCliente({
            // Sem fornecer dados sensíveis
        });
        
        expect(cliente.clienteId).toBeDefined();
        expect(cliente.cpf).toBeUndefined();
        expect(cliente.nomeCliente).toBeUndefined();
        expect(cliente.email).toBeUndefined();
        expect(cliente.registrado).toBe(false);
    });

    it('Deve lidar com dados parcialmente preenchidos em addCliente', async () => {
        const cliente = await clienteRepository.addCliente({
            cpf: '444.444.444-44',
            // Sem nome e email
        });
        
        expect(cliente.clienteId).toBeDefined();
        expect(cliente.cpf).toBe('444.444.444-44');
        expect(cliente.nomeCliente).toBeUndefined();
        expect(cliente.email).toBeUndefined();
        expect(cliente.registrado).toBe(true);
    });

    it('Deve retornar null para clienteId indefinido', async () => {
        const cliente = await clienteRepository.getClienteByClienteId(undefined);
        expect(cliente).toBeNull();
    });

    it('Deve retornar null para clienteId null', async () => {
        const cliente = await clienteRepository.getClienteByClienteId(null);
        expect(cliente).toBeNull();
    });

    it('Deve retornar null para CPF null ou undefined', async () => {
        const clienteNull = await clienteRepository.findClienteByCPF(null);
        expect(clienteNull).toBeNull();

        const clienteUndefined = await clienteRepository.findClienteByCPF(undefined);
        expect(clienteUndefined).toBeNull();
    });

    it('Deve lidar com documento null em _detokenizeClienteData', async () => {
        // Acessando o método privado diretamente
        const resultado = clienteRepository._detokenizeClienteData(null);
        expect(resultado).toBeNull();
    });

    it('Deve lidar com documento sem sensitiveData em _detokenizeClienteData', async () => {
        const cliente = {
            clienteId: 'abc123',
            registrado: true
        };
        
        const resultado = clienteRepository._detokenizeClienteData(cliente);
        
        expect(resultado.clienteId).toBe('abc123');
        expect(resultado.sensitiveData).toBeUndefined();
    });

    it('Deve manipular documento com dados sensíveis parciais', async () => {
        // Criar cliente com apenas um dado sensível
        const cliente = await clienteRepository.addCliente({
            cpf: '555.555.555-55',
            // Sem nome e email
        });
        
        // Verificar que apenas o CPF está definido
        expect(cliente.cpf).toBe('555.555.555-55');
        expect(cliente.nomeCliente).toBeUndefined();
        expect(cliente.email).toBeUndefined();
        
        // Verificar que pode ser recuperado
        const recuperado = await clienteRepository.findClienteByCPF('555.555.555-55');
        expect(recuperado.cpf).toBe('555.555.555-55');
    });

    it('Deve manipular documento com dados sensíveis tokenizados malformados', async () => {
        // Criar um cliente
        const novoCliente = await clienteRepository.addCliente({
            cpf: '666.666.666-66',
            nomeCliente: 'Cliente Malformado',
            email: 'malformado@example.com',
        });
        
        // Modificar o documento no banco para ter dados malformados
        await Cliente.updateOne(
            { clienteId: novoCliente.clienteId },
            { 
                $set: { 
                    'sensitiveData.email.metadata': null 
                } 
            }
        );
        
        // Recuperar o cliente deve ainda funcionar, mas o email será null
        const recuperado = await clienteRepository.getClienteByClienteId(novoCliente.clienteId);
        expect(recuperado.cpf).toBe('666.666.666-66');
        expect(recuperado.nomeCliente).toBe('Cliente Malformado');
        expect(recuperado.email).toBeNull();
    });
});