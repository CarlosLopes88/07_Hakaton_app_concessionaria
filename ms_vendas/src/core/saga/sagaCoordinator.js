const PedidoSaga = require('./pedidoSaga');

/**
 * Coordenador de SAGA para orquestrar transações distribuídas
 * e garantir consistência entre microserviços
 */
class SagaCoordinator {
    constructor(pedidoRepository) {
        this.pedidoSaga = new PedidoSaga(pedidoRepository);
        this.pedidoRepository = pedidoRepository;
    }

    /**
     * Executa a saga de criação de pedido
     * @param {Object} pedidoData 
     * @returns {Promise<Object>}
     */
    async executarCriacaoPedido(pedidoData) {
        const { cliente: clienteId, veiculoId } = pedidoData;
        let veiculo = null;

        try {
            // Passo 1: Verificar cliente
            console.log('SAGA: Verificando cliente...');
            const cliente = await this.pedidoSaga.verificarCliente(clienteId);
            
            // Passo 2: Verificar veículo
            console.log('SAGA: Verificando veículo...');
            veiculo = await this.pedidoSaga.verificarVeiculo(veiculoId);
            
            // Passo 3: Reservar veículo
            console.log('SAGA: Reservando veículo...');
            await this.pedidoSaga.reservarVeiculo(veiculoId, clienteId);
            
            // Passo 4: Criar pedido
            console.log('SAGA: Criando pedido...');
            const novoPedido = {
                cliente: clienteId,
                veiculo: {
                    veiculoId: veiculo.produtoId,
                    modelo: veiculo.modelo,
                    marca: veiculo.marca,
                    ano: veiculo.ano,
                    preco: veiculo.preco,
                    placa: veiculo.placa
                },
                total: veiculo.preco,
                status: 'Reservado',
                historicoStatus: [{ status: 'EmProcessamento' }, { status: 'Reservado' }]
            };
            
            const pedidoCriado = await this.pedidoSaga.criarPedido(novoPedido);
            console.log('SAGA: Pedido criado com sucesso!', pedidoCriado.pedidoId);
            
            return pedidoCriado;
            
        } catch (error) {
            // Execução de compensações
            console.error('SAGA: Erro durante criação de pedido:', error.message);
            
            // Se chegamos ao passo de reservar o veículo, precisamos liberá-lo
            if (veiculo && error.message !== 'Veículo não encontrado' && 
                error.message !== 'Veículo não está disponível para venda') {
                console.log('SAGA: Executando compensação - liberando veículo...');
                await this.pedidoSaga.liberarVeiculo(veiculoId);
            }
            
            throw error;
        }
    }

    /**
     * Executa a saga de finalização de pedido após pagamento aprovado
     * @param {String} pedidoId 
     * @returns {Promise<Object>}
     */
    async executarFinalizacaoPedido(pedidoId) {
        try {
            // Passo 1: Verificar pedido
            console.log('SAGA: Verificando pedido para finalização...');
            const pedido = await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
            
            if (!pedido) {
                throw new Error('Pedido não encontrado');
            }
            
            if (pedido.statusPagamento !== 'Aprovado') {
                throw new Error('Pagamento não aprovado para finalização');
            }
            
            // Passo 2: Remover veículo do estoque
            console.log('SAGA: Removendo veículo do estoque...');
            await this.pedidoSaga.removerVeiculo(pedido.veiculo.veiculoId);
            
            // Passo 3: Finalizar pedido
            console.log('SAGA: Atualizando status do pedido para Finalizado...');
            const pedidoAtualizado = await this.pedidoSaga.atualizarStatusPedido(pedidoId, 'Finalizado');
            
            console.log('SAGA: Pedido finalizado com sucesso!', pedidoId);
            return pedidoAtualizado;
            
        } catch (error) {
            console.error('SAGA: Erro durante finalização de pedido:', error.message);
            
            // Não implementamos compensações para remoção de veículo
            // pois é uma operação final - seria necessário um processo manual
            // ou um sistema de alertas para administradores
            
            throw error;
        }
    }

    /**
     * Executa a saga de cancelamento de pedido
     * @param {String} pedidoId 
     * @param {String} motivoCancelamento 
     * @returns {Promise<Object>}
     */
    async executarCancelamentoPedido(pedidoId, motivoCancelamento) {
        try {
            // Passo 1: Verificar pedido
            console.log('SAGA: Verificando pedido para cancelamento...');
            const pedido = await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
            
            if (!pedido) {
                throw new Error('Pedido não encontrado');
            }
            
            // Passo 2: Se o pedido está com veículo reservado, liberar o veículo
            if (pedido.status === 'Reservado' || pedido.status === 'PagamentoEmProcessamento') {
                console.log('SAGA: Liberando veículo reservado...');
                await this.pedidoSaga.liberarVeiculo(pedido.veiculo.veiculoId);
            }
            
            // Passo 3: Cancelar pedido
            console.log('SAGA: Atualizando status do pedido para Cancelado...');
            const pedidoAtualizado = await this.pedidoSaga.atualizarStatusPedido(pedidoId, 'Cancelado');
            
            // Passo 4: Atualizar status de pagamento (se necessário)
            if (pedido.statusPagamento === 'Pendente' || pedido.statusPagamento === 'EmProcessamento') {
                console.log('SAGA: Atualizando status de pagamento para Cancelado...');
                await this.pedidoSaga.atualizarStatusPagamento(pedidoId, 'Cancelado');
            }
            
            console.log('SAGA: Pedido cancelado com sucesso!', pedidoId);
            return pedidoAtualizado;
            
        } catch (error) {
            console.error('SAGA: Erro durante cancelamento de pedido:', error.message);
            throw error;
        }
    }

    /**
     * Executa a saga de processamento de pagamento
     * @param {String} pedidoId 
     * @param {String} statusPagamento 
     * @returns {Promise<Object>}
     */
    async processarNotificacaoPagamento(pedidoId, statusPagamento) {
        try {
            // Passo 1: Verificar pedido
            console.log('SAGA: Processando notificação de pagamento...');
            const pedido = await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
            
            if (!pedido) {
                throw new Error('Pedido não encontrado');
            }
            
            // Passo 2: Atualizar status de pagamento
            console.log(`SAGA: Atualizando status de pagamento para ${statusPagamento}...`);
            await this.pedidoSaga.atualizarStatusPagamento(pedidoId, statusPagamento);
            
            // Passo 3: Processar conforme o status de pagamento
            if (statusPagamento === 'Aprovado') {
                console.log('SAGA: Pagamento aprovado, atualizando status do pedido...');
                await this.pedidoSaga.atualizarStatusPedido(pedidoId, 'PagamentoAprovado');
                
                // Finalizar o pedido (remover veículo do estoque)
                return this.executarFinalizacaoPedido(pedidoId);
                
            } else if (statusPagamento === 'Recusado' || statusPagamento === 'Cancelado') {
                console.log('SAGA: Pagamento recusado/cancelado, cancelando pedido...');
                return this.executarCancelamentoPedido(pedidoId, 'Pagamento ' + statusPagamento);
            }
            
            return await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
            
        } catch (error) {
            console.error('SAGA: Erro durante processamento de pagamento:', error.message);
            throw error;
        }
    }
}

module.exports = SagaCoordinator;