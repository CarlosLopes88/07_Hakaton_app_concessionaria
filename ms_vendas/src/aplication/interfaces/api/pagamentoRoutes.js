const express = require('express');

module.exports = (pagamentoService) => {
   if (!pagamentoService) {
       throw new Error("pagamentoService é obrigatório para inicializar pagamentoRoutes");
   }

   const router = express.Router();

   // Rota para criar pagamento de um pedido
   router.post('/:pedidoId', async (req, res) => {
    const { pedidoId } = req.params;
    try {
        const pagamento = await pagamentoService.criarPagamento(pedidoId);
        res.status(201).json({
            message: "Pagamento criado com sucesso",
            pagamento: {
                pedidoId: pagamento.pedidoId,
                valor: pagamento.valor,
                status: pagamento.status,
                qrCodeLink: pagamento.qrCodeLink
            }
        });
    } catch (error) {
        console.error('Erro ao criar pagamento:', error);
        
        if (error.message && (error.message.includes('não encontrado') || error.message.includes('Cliente não encontrado'))) {
            return res.status(404).json({ 
                message: error.message,
                error: error.message 
            });
        }

        if (error.message && error.message.includes('não está no status correto')) {
            return res.status(400).json({ 
                message: error.message,
                error: error.message 
            });
        }

        const statusCode = error.status || 500;
        return res.status(statusCode).json({ 
            message: error.message || "Erro interno no servidor",
            error: error.message || "Erro interno no servidor" 
        });
    }
   });

   // Rota para consultar status de pagamento
   router.get('/:pedidoId', async (req, res) => {
    const { pedidoId } = req.params;
    try {
        const pedido = await pagamentoService.consultarStatusPagamento(pedidoId);
        
        if (!pedido) {
            return res.status(404).json({ 
                message: "Pedido não encontrado" 
            });
        }
        
        res.status(200).json({
            pedidoId: pedido.pedidoId,
            statusPagamento: pedido.statusPagamento,
            total: pedido.total,
            veiculo: {
                marca: pedido.veiculo.marca,
                modelo: pedido.veiculo.modelo,
                ano: pedido.veiculo.ano,
                placa: pedido.veiculo.placa
            }
        });
    } catch (error) {
        console.error('Erro ao consultar status de pagamento:', error);
        const statusCode = error.status || 500;
        return res.status(statusCode).json({ 
            message: error.message || "Erro no servidor",
            error: error.message || "Erro interno no servidor" 
        });
    }
   });

   return router;
};