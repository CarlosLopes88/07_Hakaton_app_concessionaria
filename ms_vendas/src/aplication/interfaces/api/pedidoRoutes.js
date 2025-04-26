const express = require('express');

module.exports = (pedidoRepository, pedidoService) => {
    if (!pedidoRepository || !pedidoService) {
        throw new Error("pedidoRepository e pedidoService são obrigatórios");
    }

    const router = express.Router();

    // Cria um novo pedido
    router.post('/', async (req, res) => {
        try {
            // Validação básica
            if (!req.body || !req.body.cliente || !req.body.veiculoId) {
                return res.status(400).send({ 
                    message: "Dados inválidos. cliente e veiculoId são obrigatórios" 
                });
            }

            const novoPedido = await pedidoService.criarPedido(req.body);
            res.status(201).json({
                message: "Pedido criado com sucesso. Veículo reservado.",
                pedido: novoPedido
            });

        } catch (error) {
            console.error('Erro ao criar novo pedido:', error);
            
            // Verificar se é um erro de resposta da API (axios)
            if (error.response && error.response.status === 404) {
                return res.status(404).send({ 
                    message: error.response.data.message || 'Recurso não encontrado' 
                });
            } else if (error.message && error.message.includes('não encontrado')) {
                return res.status(404).send({ message: error.message });
            }
            
            if (error.response && error.response.status === 400) {
                return res.status(400).send({ 
                    message: error.response.data.message || 'Requisição inválida' 
                });
            } else if (error.message && (error.message.includes('inválido') || error.message.includes('não está disponível'))) {
                return res.status(400).send({ message: error.message });
            }
            
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    // Busca todos os pedidos
    router.get('/', async (req, res) => {
        try {
            const pedidos = await pedidoRepository.getAllPedidos();
            if (pedidos.length === 0) {
                return res.status(404).send({ message: "Nenhum pedido encontrado." });
            }
            res.json(pedidos);
        } catch (error) {
            console.error('Erro ao buscar todos os pedidos:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    // Rota para buscar pedidos ativos (não finalizados, não cancelados)
    router.get('/ativos', async (req, res) => {
        try {
            const pedidos = await pedidoRepository.getPedidos();
            if (pedidos.length === 0) {
                return res.status(404).send({ message: "Nenhum pedido ativo encontrado." });
            }
            res.json(pedidos);
        } catch (error) {
            console.error('Erro ao buscar pedidos ativos:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    // Rota para buscar pedidos por status
    router.get('/status/:status', async (req, res) => {
        try {
            const { status } = req.params;
            const pedidos = await pedidoRepository.getPedidosByStatus(status);
            
            if (pedidos.length === 0) {
                return res.status(404).send({ 
                    message: `Nenhum pedido com status '${status}' encontrado.` 
                });
            }
            
            res.json(pedidos);
        } catch (error) {
            console.error('Erro ao buscar pedidos por status:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    // Rota para buscar pedidos por cliente
    router.get('/cliente/:clienteId', async (req, res) => {
        try {
            const { clienteId } = req.params;
            const pedidos = await pedidoRepository.getPedidosByCliente(clienteId);
            
            if (pedidos.length === 0) {
                return res.status(404).send({ 
                    message: `Nenhum pedido encontrado para o cliente ${clienteId}.` 
                });
            }
            
            res.json(pedidos);
        } catch (error) {
            console.error('Erro ao buscar pedidos por cliente:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    // Busca um pedido específico pelo pedidoId
    router.get('/:pedidoId', async (req, res) => {
        try {
            const pedido = await pedidoRepository.getPedidoByPedidoId(req.params.pedidoId);
            if (!pedido) {
                return res.status(404).send({ message: "Pedido não encontrado." });
            }
            res.status(200).json(pedido);
        } catch (error) {
            console.error('Erro ao buscar pedido por ID:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    // Atualiza o status de um pedido específico
    router.put('/:pedidoId/status', async (req, res) => {
        try {
            const { pedidoId } = req.params;
            const { novoStatus } = req.body;
    
            if (!novoStatus) {
                return res.status(400).send({ message: "Dados inválidos. novoStatus é obrigatório" });
            }
    
            // Verificar se o status é válido
            const statusValidos = ['EmProcessamento', 'Reservado', 'PagamentoEmProcessamento', 'PagamentoAprovado', 'Finalizado', 'Cancelado'];
            if (!statusValidos.includes(novoStatus)) {
                return res.status(400).send({ 
                    message: `Status inválido. Valores permitidos: ${statusValidos.join(', ')}` 
                });
            }
    
            // Chamar o coordenador SAGA para atualizar status
            let pedidoAtualizado;
            
            if (novoStatus === 'Cancelado') {
                // Se estiver cancelando, usar a lógica de cancelamento
                pedidoAtualizado = await pedidoService.cancelarPedido(pedidoId);
            } else {
                // Para outros status, atualizar normalmente
                pedidoAtualizado = await pedidoRepository.updatePedidoStatus(pedidoId, novoStatus);
                await pedidoRepository.addStatusHistory(pedidoId, novoStatus);
            }
            
            if (!pedidoAtualizado) {
                return res.status(404).send({ message: "Pedido não encontrado." });
            }
    
            res.status(200).json({
                message: `Status do pedido atualizado para '${novoStatus}'`,
                pedido: pedidoAtualizado
            });
        } catch (error) {
            console.error('Erro ao atualizar status do pedido:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    return router;
};