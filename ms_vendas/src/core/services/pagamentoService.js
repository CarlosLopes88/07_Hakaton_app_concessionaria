const axios = require('axios');
require('dotenv').config();

const cliente_url_loadbalancer = process.env.CLIENTE_ENDPOINT;
const produto_url_loadbalancer = process.env.PRODUTO_ENDPOINT;

class PagamentoService {
    constructor(pedidoRepository, pagamentoHttpClient) {
        if (!pedidoRepository || !pagamentoHttpClient) {
            throw new Error('PedidoRepository e PagamentoHttpClient são obrigatórios');
        }
        this.pedidoRepository = pedidoRepository;
        this.pagamentoHttpClient = pagamentoHttpClient;
    }

    async criarPagamento(pedidoId) {
        try {
            const pedido = await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
            if (!pedido) {
                const error = new Error('Pedido não encontrado');
                error.status = 404;
                throw error;
            }

            // Verificar se o pedido está no status correto
            if (pedido.status !== 'Reservado') {
                const error = new Error('Pedido não está no status correto para pagamento');
                error.status = 400;
                throw error;
            }

            try {
                const clienteResponse = await axios.get(`http://${cliente_url_loadbalancer}/api/cliente/${pedido.cliente}`);
                const cliente = clienteResponse.data;

                if (!cliente) {
                    const error = new Error('Cliente não encontrado');
                    error.status = 404;
                    throw error;
                }

                // Construir o corpo da requisição para o PagSeguro
                const requestBody = this._construirRequestBodyVeiculo(pedido, cliente);

                console.log('Payload enviado ao PagSeguro:', requestBody);

                const response = await this.pagamentoHttpClient.criarPagamento(requestBody);
                const qrCodeLink = response.data.qr_codes[0].links[1].href;

                const pagamento = {
                    pagamentoId: response.data.id,
                    pedidoId: pedidoId,
                    veiculoId: pedido.veiculo.veiculoId,
                    valor: pedido.total,
                    status: 'EmProcessamento',
                    qrCodeLink: qrCodeLink,
                    detalhesTransacao: {
                        transacaoId: response.data.id,
                        gateway: 'PagSeguro',
                        dadosBrutos: response.data
                    }
                };

                // Atualizar status do pedido para em processamento de pagamento
                await this.pedidoRepository.updatePedidoStatus(pedidoId, 'PagamentoEmProcessamento');
                await this.pedidoRepository.updateStatusPagamento(pedidoId, 'EmProcessamento');
                await this.pedidoRepository.addStatusHistory(pedidoId, 'PagamentoEmProcessamento');

                return pagamento;

            } catch (error) {
                if (error.response?.status === 404) {
                    const newError = new Error('Cliente não encontrado');
                    newError.status = 404;
                    throw newError;
                }
                throw error;
            }
        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            if (!error.status) {
                error.status = 500;
            }
            throw error;
        }
    }

    _construirRequestBodyVeiculo(pedido, cliente) {
        // Adaptar para o contexto de veículos
        return {
            reference_id: pedido.pedidoId,
            customer: {
                name: cliente.nomeCliente,
                email: cliente.email,
                tax_id: cliente.cpf,
                phones: [{
                    country: "55",
                    area: "41",
                    number: "999999999",
                    type: "MOBILE"
                }]
            },
            items: [{
                name: `${pedido.veiculo.marca} ${pedido.veiculo.modelo} ${pedido.veiculo.ano}`,
                quantity: 1,
                unit_amount: pedido.total * 100
            }],
            qr_codes: [{
                amount: {
                    value: pedido.total * 100
                },
                expiration_date: new Date(Date.now() + 3600 * 1000).toISOString()
            }],
            shipping: {
                address: {
                    street: "meu endereço",
                    number: "0000",
                    complement: "loja 01",
                    locality: "Meu bairro",
                    city: "Curitiba",
                    region_code: "PR",
                    country: "BRA",
                    postal_code: "80000000"
                }
            },
            notification_urls: ["https://meusite.com/notificacoes"]
        };
    }

    async confirmarPagamento(pedidoId, statusPagamento) {
        try {
            const pedido = await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
            
            if (!pedido) {
                throw new Error('Pedido não encontrado');
            }
            
            if (statusPagamento === 'Aprovado') {
                // Atualizar status do pagamento
                await this.pedidoRepository.updateStatusPagamento(pedidoId, 'Aprovado');
                
                // Atualizar status do pedido
                await this.pedidoRepository.updatePedidoStatus(pedidoId, 'PagamentoAprovado');
                await this.pedidoRepository.addStatusHistory(pedidoId, 'PagamentoAprovado');
                
                // Chamar o serviço para finalizar o pedido (usando a importação dinâmica)
                const PedidoService = require('./pedidoService');
                const pedidoService = new PedidoService(this.pedidoRepository);
                await pedidoService.finalizarPedido(pedidoId);
                
            } else if (statusPagamento === 'Recusado' || statusPagamento === 'Cancelado') {
                // Atualizar status do pagamento
                await this.pedidoRepository.updateStatusPagamento(pedidoId, statusPagamento);
                
                // Cancelar o pedido
                const PedidoService = require('./pedidoService');
                const pedidoService = new PedidoService(this.pedidoRepository);
                await pedidoService.cancelarPedido(pedidoId);
            }
            
            return await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
        } catch (error) {
            console.error('Erro ao confirmar pagamento:', error);
            throw error;
        }
    }

    async consultarStatusPagamento(pedidoId, atualizarStatus = false) {
        try {
            const pedido = await this.pedidoRepository.getPedidoByPedidoId(pedidoId);
            
            if (!pedido) {
                return null;
            }
            
            // Se solicitado atualização e tiver pagamentoId, consulta gateway
            if (atualizarStatus && pedido.pagamentoId) {
                try {
                    const pagamentoStatus = await this.pagamentoHttpClient.consultarPagamento(pedido.pagamentoId);
                    
                    // Mapear status do PagSeguro para status do nosso sistema
                    let statusPagamento;
                    switch (pagamentoStatus.data.status) {
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
                    
                    // Atualizar status se diferente do atual
                    if (statusPagamento !== pedido.statusPagamento) {
                        return await this.confirmarPagamento(pedidoId, statusPagamento);
                    }
                } catch (error) {
                    console.error('Erro ao consultar status no gateway:', error);
                    // Apenas log, não propaga o erro
                }
            }
            
            return pedido;
        } catch (error) {
            console.error('Erro ao consultar status de pagamento:', error);
            throw error;
        }
    }
}

module.exports = PagamentoService;