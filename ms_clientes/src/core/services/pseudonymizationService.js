// src/core/services/pseudonymizationService.js
require('dotenv').config();
const crypto = require('crypto');
const { v5: uuidv5 } = require('uuid');

class PseudonymizationService {
  constructor() {
    // Namespace fixo para geração de UUIDs determinísticos
    this.namespace = process.env.UUID_NAMESPACE || '1b671a64-40d5-491e-99b0-da01ff1f3341';
    
    // Chave para tokenização com possibilidade de detokenização
    // Importante: deve ser uma chave hexadecimal de 32 bytes (64 caracteres)
    this.encryptionKey = process.env.TOKEN_ENCRYPTION_KEY || 
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  }

  // Gera um pseudônimo determinístico para CPF (sempre o mesmo para o mesmo CPF)
  generatePseudonymForCPF(cpf) {
    if (!cpf) return null;
    return uuidv5(cpf.replace(/[^0-9]/g, ''), this.namespace);
  }

  // Tokeniza dados sensíveis com possibilidade de recuperação
  tokenize(value) {
    if (!value) return null;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm', 
      Buffer.from(this.encryptionKey, 'hex'), 
      iv
    );
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
      token: encrypted,
      metadata: {
        iv: iv.toString('hex'),
        authTag
      }
    };
  }

  // Recupera valor original do token
  detokenize(tokenData) {
    if (!tokenData || !tokenData.token || !tokenData.metadata) return null;
    
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm', 
        Buffer.from(this.encryptionKey, 'hex'),
        Buffer.from(tokenData.metadata.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(tokenData.metadata.authTag, 'hex'));
      let decrypted = decipher.update(tokenData.token, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Erro ao detokenizar:', error);
      return null;
    }
  }
}

module.exports = PseudonymizationService;