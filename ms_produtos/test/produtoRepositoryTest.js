const Produto = require('../src/core/domain/produto');
const ProdutoRepository = require('../src/infrastructure/repositories/produtoRepository');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');

describe('Testes do ProdutoRepository', () => {
    let produtoRepository;
    let db_test;

    beforeAll(async () => {
        db_test = await connectToDatabase();
        produtoRepository = new ProdutoRepository();
    }, 30000);

    afterAll(async () => {
        // Limpa o banco após todos os testes serem concluídos
        await clearDatabase();
        await disconnectDatabase();
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    it('Deve adicionar um novo veículo', async () => {
        const veiculo = await produtoRepository.addProduto({
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        });

        expect(veiculo.produtoId).toBeDefined();
        expect(veiculo.marca).toBe('Toyota');
        expect(veiculo.modelo).toBe('Corolla');
    });

    it('Deve falhar ao adicionar veículo com mesma placa', async () => {
        const veiculoData = {
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        };

        await produtoRepository.addProduto(veiculoData);
        
        // Tentar adicionar outro veículo com a mesma placa, mas marca, modelo ou ano diferentes
        const veiculoDataDuplicado = {
            marca: 'Honda', // Marca diferente
            modelo: 'Civic', // Modelo diferente
            ano: '2022', // Ano diferente
            cor: 'Azul',
            placa: 'ABC1234', // Mesma placa
            preco: 110000.00
        };
        
        await expect(produtoRepository.addProduto(veiculoDataDuplicado))
            .rejects
            .toThrow('Produto com estes dados já existe.');
    });

    it('Deve buscar veículo por ID', async () => {
        const novoVeiculo = await produtoRepository.addProduto({
            marca: 'Honda',
            modelo: 'Civic',
            ano: '2023',
            cor: 'Preto',
            placa: 'BCA4321',
            preco: 115000.00
        });

        const veiculoEncontrado = await produtoRepository.getProdutoByProdutoId(novoVeiculo.produtoId);
        expect(veiculoEncontrado).toBeDefined();
        expect(veiculoEncontrado.marca).toBe('Honda');
        expect(veiculoEncontrado.modelo).toBe('Civic');
    });

    it('Deve retornar null para ID inexistente', async () => {
        const veiculo = await produtoRepository.getProdutoByProdutoId('id_inexistente');
        expect(veiculo).toBeNull();
    });

    it('Deve retornar veículos por marca', async () => {
        await produtoRepository.addProduto({
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        });

        await produtoRepository.addProduto({
            marca: 'Honda',
            modelo: 'Civic',
            ano: '2023',
            cor: 'Preto',
            placa: 'BCA4321',
            preco: 115000.00
        });

        const veiculos = await produtoRepository.getProdutosByMarca('Toyota');
        expect(veiculos).toHaveLength(1);
        expect(veiculos[0].marca).toBe('Toyota');
        expect(veiculos[0].modelo).toBe('Corolla');
    });

    it('Deve retornar veículos ordenados por preço (mais caro para mais barato)', async () => {
        await produtoRepository.addProduto({
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        });

        await produtoRepository.addProduto({
            marca: 'Honda',
            modelo: 'Civic',
            ano: '2023',
            cor: 'Preto',
            placa: 'BCA4321',
            preco: 130000.00
        });

        const veiculos = await produtoRepository.getAllProdutos();
        expect(veiculos.length).toBeGreaterThan(1);
        expect(veiculos[0].preco).toBeGreaterThanOrEqual(veiculos[1].preco);
    });

    it('Deve atualizar um veículo', async () => {
        const veiculo = await produtoRepository.addProduto({
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        });

        const veiculoAtualizado = await produtoRepository.updateProduto(veiculo.produtoId, {
            cor: 'Branco',
            preco: 125000.00
        });

        expect(veiculoAtualizado.cor).toBe('Branco');
        expect(veiculoAtualizado.preco).toBe(125000.00);
        // Os campos não atualizados devem permanecer iguais
        expect(veiculoAtualizado.marca).toBe('Toyota');
        expect(veiculoAtualizado.modelo).toBe('Corolla');
    });

    it('Deve deletar um veículo', async () => {
        const veiculo = await produtoRepository.addProduto({
            marca: 'Toyota',
            modelo: 'Hilux',
            ano: '2023',
            cor: 'Preto',
            placa: 'DCB1234',
            preco: 180000.00
        });

        const deletado = await produtoRepository.deleteProduto(veiculo.produtoId);
        expect(deletado).toBeDefined();

        const buscaVeiculo = await produtoRepository.getProdutoByProdutoId(veiculo.produtoId);
        expect(buscaVeiculo).toBeNull();
    });

    // Testes adicionais para melhorar a cobertura
    it('Deve buscar veículo por placa', async () => {
        // Cria veículo de teste
        const veiculoData = {
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        };
        
        await produtoRepository.addProduto(veiculoData);
        
        // Busca pelo método a ser testado
        const veiculoEncontrado = await produtoRepository.getProdutoByPlaca('ABC1234');
        
        // Verifica se o veículo foi encontrado corretamente
        expect(veiculoEncontrado).toBeDefined();
        expect(veiculoEncontrado.placa).toBe('ABC1234');
        expect(veiculoEncontrado.marca).toBe('Toyota');
        expect(veiculoEncontrado.modelo).toBe('Corolla');
    });

    it('Deve retornar null ao buscar placa inexistente', async () => {
        const resultado = await produtoRepository.getProdutoByPlaca('PLACA_INEXISTENTE');
        expect(resultado).toBeNull();
    });

    it('Deve buscar veículos por cor', async () => {
        // Limpa o banco antes de testar
        await clearDatabase();
        
        // Adiciona veículos com cores diferentes
        await produtoRepository.addProduto({
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        });
        
        await produtoRepository.addProduto({
            marca: 'Honda',
            modelo: 'Civic',
            ano: '2023',
            cor: 'Preto',
            placa: 'DEF5678',
            preco: 115000.00
        });
        
        await produtoRepository.addProduto({
            marca: 'Volkswagen',
            modelo: 'Golf',
            ano: '2022',
            cor: 'Prata',
            placa: 'GHI9012',
            preco: 90000.00
        });
        
        // Busca veículos por cor
        const veiculosPrata = await produtoRepository.getProdutosByCor('Prata');
        
        // Verificações
        expect(veiculosPrata).toBeDefined();
        expect(veiculosPrata).toHaveLength(2);
        expect(veiculosPrata[0].cor).toBe('Prata');
        expect(veiculosPrata[1].cor).toBe('Prata');
        
        // Verifica ordenação por preço (decrescente)
        expect(veiculosPrata[0].preco).toBeGreaterThan(veiculosPrata[1].preco);
    });

    it('Deve retornar array vazio ao buscar cor inexistente', async () => {
        const veiculos = await produtoRepository.getProdutosByCor('Cor_Inexistente');
        expect(veiculos).toBeDefined();
        expect(veiculos).toHaveLength(0);
    });
});