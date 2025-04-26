const mongoose = require('mongoose');

const pagamentoSchema = new mongoose.Schema({
    pagamentoId: { type: String, required: true },
    pedidoId: { type: String, required: true },
    veiculoId: { type: String, required: true },
    valor: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['Pendente', 'EmProcessamento', 'Aprovado', 'Recusado', 'Cancelado'],
        default: 'Pendente' 
    },
    qrCodeLink: { type: String, required: true },
    dataPagamento: { type: Date, default: Date.now },
    dataAtualizacao: { type: Date },
    metodo: { type: String, default: 'PIX' },
    detalhesTransacao: {
        transacaoId: { type: String },
        gateway: { type: String, default: 'PagSeguro' },
        dadosBrutos: { type: Object }
    }
});

// Atualiza a data de atualização automaticamente
pagamentoSchema.pre('save', function(next) {
    this.dataAtualizacao = new Date();
    next();
});

const Pagamento = mongoose.model('Pagamento', pagamentoSchema);

module.exports = Pagamento;