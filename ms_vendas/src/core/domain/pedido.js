const mongoose = require('mongoose');
const shortid = require('shortid');

const pedidoSchema = new mongoose.Schema({
    pedidoId: { type: String, default: shortid.generate },
    cliente: {
        type: String,
        required: true
    },
    veiculo: {
        veiculoId: { type: String, required: true },
        modelo: { type: String, required: true },
        marca: { type: String, required: true },
        ano: { type: Number, required: true },
        preco: { type: Number, required: true },
        placa: { type: String, required: true }
    },
    total: { type: Number, required: true },
    status: { 
        type: String, 
        required: true, 
        enum: ['EmProcessamento', 'Reservado', 'PagamentoEmProcessamento', 'PagamentoAprovado', 'Finalizado', 'Cancelado'],
        default: 'EmProcessamento' 
    },
    dataPedido: { type: Date, default: Date.now },
    statusPagamento: { 
        type: String, 
        enum: ['Pendente', 'EmProcessamento', 'Aprovado', 'Recusado', 'Cancelado'],
        default: 'Pendente' 
    },
    pagamentoId: { type: String },
    historicoStatus: [{
        status: String,
        data: { type: Date, default: Date.now }
    }]
});

const Pedido = mongoose.model('Pedido', pedidoSchema);

module.exports = Pedido;