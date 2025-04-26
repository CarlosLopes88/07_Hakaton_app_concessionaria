const express = require('express');

module.exports = (pedidoRepository, pagamentoService) => {
    if (!pedidoRepository || !pagamentoService) {
        throw new Error("pedidoRepository e pagamentoService são obrigatórios para inicializar webhookRoutes");
    }

    const router = express.Router();

    // Endpoint para receber notificações do PagSeguro
    router.post('/pagseguro', async (req, res) => {
        const notification = req.body;
        console.log('Notificação do PagSeguro recebida:', notification);

        try {
            // Verifique o tipo de evento e processe conforme necessário
            if (notification.event === 'transaction') {
                const transaction = notification.data;
                const pedidoId = transaction.reference_id; // ID do pedido usado como referência

                // Mapear status do PagSeguro para status do nosso sistema
                let statusPagamento;
                switch (transaction.status) {
                    case 'PAID':
                        statusPagamento = 'Aprovado';
                        break;
                    case 'DECLINED':
                    case 'CANCELED':
                        statusPagamento = 'Recusado';
                        break;
                    default:
                        statusPagamento = 'Pendente';
                }

                // Processar a notificação de pagamento usando o serviço
                await pagamentoService.confirmarPagamento(pedidoId, statusPagamento);

                console.log(`Pedido ${pedidoId} atualizado para status de pagamento ${statusPagamento}`);
            }

            // Responder à requisição do webhook
            res.status(200).send('Notificação recebida e processada com sucesso');
        } catch (error) {
            console.error('Erro ao processar notificação do PagSeguro:', error);
            
            // Ainda retornamos 200 para o PagSeguro para evitar reenvios
            // mas logamos o erro para investigação
            res.status(200).send('Notificação recebida, mas houve um erro no processamento');
        }
    });

    // Endpoint para simular notificações de pagamento (útil para testes)
    router.post('/simulacao/:pedidoId/:status', async (req, res) => {
        const { pedidoId, status } = req.params;
        
        if (!['Aprovado', 'Recusado', 'Cancelado'].includes(status)) {
            return res.status(400).json({ 
                message: "Status inválido. Use 'Aprovado', 'Recusado' ou 'Cancelado'."
            });
        }
        
        try {
            const pedido = await pagamentoService.confirmarPagamento(pedidoId, status);
            
            res.status(200).json({
                message: `Simulação de pagamento ${status} processada com sucesso`,
                pedido
            });
        } catch (error) {
            console.error('Erro ao processar simulação de pagamento:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    return router;
};