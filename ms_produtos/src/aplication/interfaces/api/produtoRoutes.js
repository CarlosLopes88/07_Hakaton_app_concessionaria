const express = require('express');

module.exports = (produtoRepository) => {
    if (!produtoRepository) {
        throw new Error("produtoRepository é obrigatório para inicializar produtoRoutes");
    }

    const router = express.Router();

    // Validação dos dados do produto
    const validateProduto = (produto) => {
        const errors = [];
        if (!produto.marca) errors.push('Marca do produto é obrigatória');
        if (!produto.modelo) errors.push('Modelo do produto é obrigatório');
        if (!produto.ano) errors.push('Ano do produto é obrigatório');
        if (!produto.cor) errors.push('Cor do produto é obrigatória');
        if (!produto.placa) errors.push('Placa do produto é obrigatória');
        if (!produto.preco || produto.preco <= 0) errors.push('Preço do produto deve ser maior que zero');
        return errors;
    };

    router.post('/', async (req, res) => {
        try {
            let produtos = Array.isArray(req.body) ? req.body : [req.body];

            // Validação inicial
            if (!produtos || produtos.length === 0) {
                return res.status(400).send({ message: "Dados do produto são obrigatórios" });
            }

            // Valida cada produto
            for (const produto of produtos) {
                const errors = validateProduto(produto);
                if (errors.length > 0) {
                    return res.status(400).send({ message: "Dados inválidos", errors });
                }
            }

            // Verifica veículos duplicados (mesma placa)
            const identificadores = produtos.map(p => `${p.placa}`);
            if (new Set(identificadores).size !== identificadores.length) {
                return res.status(400).send({ message: "Veículos com mesma placa, não podem ser duplicados." });
            }

            const novosProdutos = [];
            try {
                for (const produto of produtos) {
                    const novoProduto = await produtoRepository.addProduto(produto);
                    novosProdutos.push(novoProduto);
                }
            } catch (error) {
                if (error.message.includes('já existe')) {
                    return res.status(400).send({ message: "Produto já cadastrado com estes dados." });
                }
                throw error;
            }

            res.status(201).json(produtos.length === 1 ? novosProdutos[0] : novosProdutos);
        } catch (error) {
            console.error('Erro ao adicionar produtos:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    router.get('/', async (req, res) => {
        try {
            const produtos = await produtoRepository.getAllProdutos();
            if (produtos.length === 0) {
                return res.status(404).send({ message: "Nenhum veículo encontrado." });
            }
            res.json(produtos);
        } catch (error) {
            console.error('Erro ao buscar todos os veículos:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    router.get('/:produtoId', async (req, res) => {
        try {
            const produto = await produtoRepository.getProdutoByProdutoId(req.params.produtoId);
            if (!produto) {
                return res.status(404).send({ message: "Veículo não encontrado." });
            }
            res.status(200).json(produto);
        } catch (error) {
            console.error('Erro ao buscar veículo por ID:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    router.get('/marca/:marca', async (req, res) => {
        try {
            const produtos = await produtoRepository.getProdutosByMarca(req.params.marca);
            if (produtos.length === 0) {
                return res.status(404).send({ message: "Nenhum veículo encontrado desta marca." });
            }
            res.json(produtos);
        } catch (error) {
            console.error('Erro ao buscar veículos por marca:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    router.get('/modelo/:modelo', async (req, res) => {
        try {
            const produtos = await produtoRepository.getProdutosByModelo(req.params.modelo);
            if (produtos.length === 0) {
                return res.status(404).send({ message: "Nenhum veículo encontrado deste modelo." });
            }
            res.json(produtos);
        } catch (error) {
            console.error('Erro ao buscar veículos por modelo:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    router.get('/ano/:ano', async (req, res) => {
        try {
            const produtos = await produtoRepository.getProdutosByAno(req.params.ano);
            if (produtos.length === 0) {
                return res.status(404).send({ message: "Nenhum veículo encontrado deste ano." });
            }
            res.json(produtos);
        } catch (error) {
            console.error('Erro ao buscar veículos por ano:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    router.get('/placa/:placa', async (req, res) => {
        try {
            const produto = await produtoRepository.getProdutoByPlaca(req.params.placa);
            if (!produto) {
                return res.status(404).send({ message: "Placa não encontrado." });
            }
            res.status(200).json(produto);
        } catch (error) {
            console.error('Erro ao buscar veículo por Placa:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    router.get('/cor/:cor', async (req, res) => {
        try {
            const produtos = await produtoRepository.getProdutosByCor(req.params.cor);
            if (produtos.length === 0) {
                return res.status(404).send({ message: "Nenhum veículo encontrado desta cor." });
            }
            res.json(produtos);
        } catch (error) {
            console.error('Erro ao buscar veículos por cor:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    router.put('/:produtoId', async (req, res) => {
        try {
            // Verifica se o produto existe
            const existingProduct = await produtoRepository.getProdutoByProdutoId(req.params.produtoId);
            if (!existingProduct) {
                return res.status(404).send({ message: "Veículo não encontrado." });
            }

            // Atualiza o produto
            const updatedProduct = await produtoRepository.updateProduto(req.params.produtoId, req.body);
            res.status(200).json(updatedProduct);
        } catch (error) {
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    router.delete('/:produtoId', async (req, res) => {
        try {
            const result = await produtoRepository.deleteProduto(req.params.produtoId);
            if (!result) {
                return res.status(404).send({ message: "Veículo não encontrado." });
            }
            res.status(200).send({ message: "Veículo excluído com sucesso." });
        } catch (error) {
            console.error('Erro ao excluir veículo:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    return router;
};