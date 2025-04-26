// src/core/domain/cliente.js
const mongoose = require('mongoose');
const shortid = require('shortid');

// Esquema para dados tokenizados
const tokenSchema = new mongoose.Schema({
  token: { type: String },
  metadata: {
    iv: { type: String },
    authTag: { type: String }
  }
}, { _id: false });

const clienteSchema = new mongoose.Schema({
  clienteId: { type: String, default: shortid.generate },
  
  // Pseudônimo do CPF (determinístico, permite busca eficiente)
  cpfPseudonym: { type: String, index: true },
  
  // Dados sensíveis tokenizados
  sensitiveData: {
    cpf: tokenSchema,
    nomeCliente: tokenSchema,
    email: tokenSchema
  },
  
  // Campos não-sensíveis
  registrado: { type: Boolean, default: false },
  dataRegistro: { type: Date, default: Date.now }
});

// Para compatibilidade com código existente que usa esses campos
clienteSchema.virtual('cpf').get(function() {
  return '[DADOS PROTEGIDOS]';
});

clienteSchema.virtual('nomeCliente').get(function() {
  return '[DADOS PROTEGIDOS]';
});

clienteSchema.virtual('email').get(function() {
  return '[DADOS PROTEGIDOS]';
});

// Índice para permitir busca rápida por cpfPseudonym
clienteSchema.index({ cpfPseudonym: 1 });

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;