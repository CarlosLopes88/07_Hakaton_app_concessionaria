const mongoose = require('mongoose');
const shortid = require('shortid');

const produtoSchema = new mongoose.Schema({
    produtoId: { type: String, default: shortid.generate },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    ano: { type: String, required: true },
    cor: { type: String, required: true },
    placa: { type: String, required: true },
    preco: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['reservado', 'Disponivel'], 
        default: 'Disponivel' 
    },
    reserva: {
        clienteId: { type: String, default: null },
        dataReserva: { type: Date, default: null }
    }
});

const Produto = mongoose.model('Produto', produtoSchema);

module.exports = Produto;