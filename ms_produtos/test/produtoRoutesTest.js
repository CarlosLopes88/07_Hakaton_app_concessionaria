const request = require('supertest');
const express = require('express');
const Produto = require('../src/core/domain/produto');
const ProdutoRepository = require('../src/infrastructure/repositories/produtoRepository');
const { connectToDatabase, disconnectDatabase, clearDatabase } = require('./testDbConnect');

describe('Testes das rotas de Veículo', () => {
    let app;
    let server;
    let db_test;
    
    beforeAll(async () => {
        // Configura o Express
        app = express();
        app.use(express.json());

        // Conecta ao MongoDB
        db_test = await connectToDatabase();
        
        // Configura as rotas
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        app.use('/api/produto', produtoRoutes(new ProdutoRepository()));
        
        // Inicia o servidor em uma porta diferente
        server = app.listen(3022);
    }, 30000);

    afterAll(async () => {
        await disconnectDatabase();
        if (server) {
            await server.close();
        }
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    it('Deve criar um novo veículo', async () => {
        const novoVeiculo = {
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        };

        const res = await request(app)
            .post('/api/produto')
            .send(novoVeiculo);

        expect(res.status).toBe(201);
        expect(res.body).toBeDefined();
        expect(res.body.marca).toBe('Toyota');
        expect(res.body.modelo).toBe('Corolla');
    });

    it('Deve validar veículo sem dados obrigatórios', async () => {
        const res = await request(app)
            .post('/api/produto')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(res.body.message).toBe('Dados inválidos');
    });

    it('Deve lidar com array vazio de veículos', async () => {
        const res = await request(app)
            .post('/api/produto')
            .send([]);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Dados do produto são obrigatórios');
    });

    it('Deve validar preço negativo', async () => {
        const veiculoInvalido = {
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: -10000
        };

        const res = await request(app)
            .post('/api/produto')
            .send(veiculoInvalido);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('Preço do produto deve ser maior que zero');
    });

    it('Deve rejeitar veículos com mesma placa', async () => {
        const veiculo1 = {
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00
        };

        await request(app)
            .post('/api/produto')
            .send(veiculo1);

        // Veículo com mesma placa, mas características diferentes
        const veiculo2 = {
            marca: 'Honda',
            modelo: 'Civic',
            ano: '2022',
            cor: 'Azul',
            placa: 'ABC1234', // Mesma placa
            preco: 110000.00
        };

        const res = await request(app)
            .post('/api/produto')
            .send(veiculo2);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Produto já cadastrado com estes dados');
    });

    it('Deve retornar 404 quando não existem veículos', async () => {
        const res = await request(app).get('/api/produto');
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Nenhum veículo encontrado.');
    });

    it('Deve retornar veículos por marca', async () => {
        const veiculo = await Produto.create({
            marca: 'Honda',
            modelo: 'Civic',
            ano: '2023',
            cor: 'Preto',
            placa: 'BCA4321',
            preco: 115000.00,
            status: 'Disponivel'
        });

        const res = await request(app)
            .get('/api/produto/marca/Honda');

        expect(res.status).toBe(200);
        expect(res.body[0].marca).toBe('Honda');
        expect(res.body[0].modelo).toBe('Civic');
    });

    it('Deve atualizar um veículo', async () => {
        const veiculo = await Produto.create({
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: '2023',
            cor: 'Prata',
            placa: 'ABC1234',
            preco: 120000.00,
            status: 'Disponivel'
        });

        const res = await request(app)
            .put(`/api/produto/${veiculo.produtoId}`)
            .send({
                cor: 'Branco',
                preco: 125000.00
            });

        expect(res.status).toBe(200);
        expect(res.body.cor).toBe('Branco');
        expect(res.body.preco).toBe(125000.00);
    });

    it('Deve deletar um veículo', async () => {
        const veiculo = await Produto.create({
            marca: 'Toyota',
            modelo: 'Hilux',
            ano: '2023',
            cor: 'Preto',
            placa: 'DCB1234',
            preco: 180000.00,
            status: 'Disponivel'
        });

        const res = await request(app)
            .delete(`/api/produto/${veiculo.produtoId}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Veículo excluído com sucesso.');

        const veiculoDeletado = await Produto.findOne({ produtoId: veiculo.produtoId });
        expect(veiculoDeletado).toBeNull();
    });

    it('Deve retornar 404 ao tentar atualizar veículo inexistente', async () => {
        const res = await request(app)
            .put('/api/produto/veiculoInexistente')
            .send({
                cor: 'Branco'
            });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Veículo não encontrado.');
    });

    it('Deve retornar 404 ao tentar deletar veículo inexistente', async () => {
        const res = await request(app)
            .delete('/api/produto/veiculoInexistente');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Veículo não encontrado.');
    });

    it('Deve retornar 404 ao buscar marca inexistente', async () => {
        const res = await request(app)
            .get('/api/produto/marca/MarcaInexistente');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Nenhum veículo encontrado desta marca.');
    });

    // Novos testes para melhorar a cobertura
    
    it('Deve lançar erro quando produtoRepository não é fornecido', () => {
        expect(() => {
            const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
            produtoRoutes();
        }).toThrow('produtoRepository é obrigatório para inicializar produtoRoutes');
    });

    it('Deve validar dados incompletos individualmente', async () => {
        const res = await request(app)
            .post('/api/produto')
            .send([{
                // Sem marca
                modelo: "Corolla",
                ano: "2023",
                cor: "Prata",
                placa: 'ABC1234',
                preco: 120000.00
            }]);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('Marca do produto é obrigatória');
    });

    it('Deve lidar com erro do servidor ao adicionar produto', async () => {
        // Mock para forçar um erro no método addProduto
        const mockProdutoRepository = new ProdutoRepository();
        jest.spyOn(mockProdutoRepository, 'addProduto').mockImplementationOnce(() => {
            throw new Error('Erro de servidor simulado');
        });
        
        // Configurar uma nova instância de app com o repositório mockado
        const testApp = express();
        testApp.use(express.json());
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        testApp.use('/api/produto', produtoRoutes(mockProdutoRepository));
        
        const res = await request(testApp)
            .post('/api/produto')
            .send({
                marca: "Toyota",
                modelo: "Corolla",
                ano: "2023",
                cor: "Prata",
                placa: 'ABC1234',
                preco: 120000.00
            });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });

    it('Deve lidar com erro do servidor ao buscar todos os produtos', async () => {
        const mockProdutoRepository = new ProdutoRepository();
        jest.spyOn(mockProdutoRepository, 'getAllProdutos').mockImplementationOnce(() => {
            throw new Error('Erro ao buscar produtos');
        });
        
        const testApp = express();
        testApp.use(express.json());
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        testApp.use('/api/produto', produtoRoutes(mockProdutoRepository));
        
        const res = await request(testApp).get('/api/produto');
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });

    it('Deve lidar com erro do servidor ao buscar por marca', async () => {
        const mockProdutoRepository = new ProdutoRepository();
        jest.spyOn(mockProdutoRepository, 'getProdutosByMarca').mockImplementationOnce(() => {
            throw new Error('Erro ao buscar por marca');
        });
        
        const testApp = express();
        testApp.use(express.json());
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        testApp.use('/api/produto', produtoRoutes(mockProdutoRepository));
        
        const res = await request(testApp).get('/api/produto/marca/Toyota');
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });

    it('Deve lidar com erro do servidor ao buscar por modelo', async () => {
        const mockProdutoRepository = new ProdutoRepository();
        jest.spyOn(mockProdutoRepository, 'getProdutosByModelo').mockImplementationOnce(() => {
            throw new Error('Erro ao buscar por modelo');
        });
        
        const testApp = express();
        testApp.use(express.json());
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        testApp.use('/api/produto', produtoRoutes(mockProdutoRepository));
        
        const res = await request(testApp).get('/api/produto/modelo/Corolla');
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });

    it('Deve lidar com erro do servidor ao buscar por ano', async () => {
        const mockProdutoRepository = new ProdutoRepository();
        jest.spyOn(mockProdutoRepository, 'getProdutosByAno').mockImplementationOnce(() => {
            throw new Error('Erro ao buscar por ano');
        });
        
        const testApp = express();
        testApp.use(express.json());
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        testApp.use('/api/produto', produtoRoutes(mockProdutoRepository));
        
        const res = await request(testApp).get('/api/produto/ano/2023');
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });

    it('Deve lidar com erro do servidor ao atualizar produto', async () => {
        // Criar um produto primeiro
        const veiculo = await Produto.create({
            marca: "Toyota",
            modelo: "Corolla",
            ano: "2023",
            cor: "Prata",
            placa: 'ABC1234',
            preco: 120000.00,
            status: "Disponivel"
        });
        
        // Mock para forçar erro na atualização
        const mockProdutoRepository = new ProdutoRepository();
        jest.spyOn(mockProdutoRepository, 'getProdutoByProdutoId').mockReturnValue(veiculo);
        jest.spyOn(mockProdutoRepository, 'updateProduto').mockImplementationOnce(() => {
            throw new Error('Erro ao atualizar');
        });
        
        const testApp = express();
        testApp.use(express.json());
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        testApp.use('/api/produto', produtoRoutes(mockProdutoRepository));
        
        const res = await request(testApp)
            .put(`/api/produto/${veiculo.produtoId}`)
            .send({
                cor: "Azul",
                preco: 125000.00
            });
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });

    it('Deve lidar com erro do servidor ao deletar produto', async () => {
        const mockProdutoRepository = new ProdutoRepository();
        jest.spyOn(mockProdutoRepository, 'deleteProduto').mockImplementationOnce(() => {
            throw new Error('Erro ao deletar');
        });
        
        const testApp = express();
        testApp.use(express.json());
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        testApp.use('/api/produto', produtoRoutes(mockProdutoRepository));
        
        const res = await request(testApp).delete('/api/produto/algumId');
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });

    // Testes adicionais para melhorar a cobertura das consultas por placa e cor
    it('Deve buscar veículo por placa', async () => {
        // Cria um veículo para teste
        const veiculo = await Produto.create({
            marca: 'Ford',
            modelo: 'Mustang',
            ano: '2023',
            cor: 'Vermelho',
            placa: 'MUS2023',
            preco: 350000.00,
            status: 'Disponivel'
        });
        
        // Faz a requisição GET para buscar por placa
        const res = await request(app)
            .get('/api/produto/placa/MUS2023');
            
        // Verifica a resposta
        expect(res.status).toBe(200);
        expect(res.body.placa).toBe('MUS2023');
        expect(res.body.marca).toBe('Ford');
        expect(res.body.modelo).toBe('Mustang');
    });

    it('Deve retornar 404 ao buscar placa inexistente', async () => {
        const res = await request(app)
            .get('/api/produto/placa/PLACA_INEXISTENTE');
            
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Placa não encontrado.');
    });

    it('Deve buscar veículos por cor', async () => {
        // Limpa o banco antes de testar
        await clearDatabase();
        
        // Cria veículos para teste
        await Produto.create({
            marca: 'Chevrolet',
            modelo: 'Camaro',
            ano: '2023',
            cor: 'Amarelo',
            placa: 'CAM2023',
            preco: 300000.00,
            status: 'Disponivel'
        });
        
        await Produto.create({
            marca: 'Dodge',
            modelo: 'Challenger',
            ano: '2022',
            cor: 'Amarelo',
            placa: 'CHA2022',
            preco: 280000.00,
            status: 'Disponivel'
        });
        
        // Faz a requisição GET para buscar por cor
        const res = await request(app)
            .get('/api/produto/cor/Amarelo');
            
        // Verifica a resposta
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].cor).toBe('Amarelo');
        expect(res.body[1].cor).toBe('Amarelo');
        
        // Verifica ordenação por preço
        expect(parseFloat(res.body[0].preco)).toBeGreaterThanOrEqual(parseFloat(res.body[1].preco));
    });

    it('Deve retornar 404 ao buscar cor inexistente', async () => {
        const res = await request(app)
            .get('/api/produto/cor/CorInexistente');
            
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Nenhum veículo encontrado desta cor.');
    });

    // Teste para verificar validação de erro em caso de falha na consulta
    it('Deve lidar com erro do servidor ao buscar por placa', async () => {
        const mockProdutoRepository = new ProdutoRepository();
        jest.spyOn(mockProdutoRepository, 'getProdutoByPlaca').mockImplementationOnce(() => {
            throw new Error('Erro ao buscar por placa');
        });
        
        const testApp = express();
        testApp.use(express.json());
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        testApp.use('/api/produto', produtoRoutes(mockProdutoRepository));
        
        const res = await request(testApp).get('/api/produto/placa/ABC1234');
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });

    it('Deve lidar com erro do servidor ao buscar por cor', async () => {
        const mockProdutoRepository = new ProdutoRepository();
        jest.spyOn(mockProdutoRepository, 'getProdutosByCor').mockImplementationOnce(() => {
            throw new Error('Erro ao buscar por cor');
        });
        
        const testApp = express();
        testApp.use(express.json());
        const produtoRoutes = require('../src/aplication/interfaces/api/produtoRoutes');
        testApp.use('/api/produto', produtoRoutes(mockProdutoRepository));
        
        const res = await request(testApp).get('/api/produto/cor/Prata');
        
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro no servidor');
    });
});