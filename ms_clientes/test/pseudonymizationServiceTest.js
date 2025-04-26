// test/pseudonymizationServiceTest.js
require('dotenv').config();
const PseudonymizationService = require('../src/core/services/pseudonymizationService');

describe('Testes do PseudonymizationService', () => {
    let pseudonymizationService;

    beforeEach(() => {
        // Configuramos o serviço com valores fixos para teste
        process.env.UUID_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';
        process.env.TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        pseudonymizationService = new PseudonymizationService();
    });

    it('Deve gerar o mesmo pseudônimo para o mesmo CPF', () => {
        const cpf = '123.456.789-09';
        
        const pseudonym1 = pseudonymizationService.generatePseudonymForCPF(cpf);
        const pseudonym2 = pseudonymizationService.generatePseudonymForCPF(cpf);
        
        expect(pseudonym1).toBe(pseudonym2);
    });

    it('Deve gerar pseudônimos diferentes para CPFs diferentes', () => {
        const cpf1 = '123.456.789-09';
        const cpf2 = '987.654.321-00';
        
        const pseudonym1 = pseudonymizationService.generatePseudonymForCPF(cpf1);
        const pseudonym2 = pseudonymizationService.generatePseudonymForCPF(cpf2);
        
        expect(pseudonym1).not.toBe(pseudonym2);
    });

    it('Deve tokenizar e detokenizar um valor corretamente', () => {
        const originalValue = 'Teste de Tokenização';
        
        const tokenized = pseudonymizationService.tokenize(originalValue);
        expect(tokenized.token).toBeDefined();
        expect(tokenized.metadata).toBeDefined();
        expect(tokenized.metadata.iv).toBeDefined();
        expect(tokenized.metadata.authTag).toBeDefined();
        
        const detokenized = pseudonymizationService.detokenize(tokenized);
        expect(detokenized).toBe(originalValue);
    });

    it('Deve manipular valores nulos sem erro', () => {
        expect(pseudonymizationService.generatePseudonymForCPF(null)).toBeNull();
        expect(pseudonymizationService.tokenize(null)).toBeNull();
        expect(pseudonymizationService.detokenize(null)).toBeNull();
    });

    it('Deve lidar com objetos de token malformados', () => {
        const badToken = { token: 'abc123', metadata: null };
        expect(pseudonymizationService.detokenize(badToken)).toBeNull();
        
        const incomplete = { metadata: { iv: 'abc', authTag: '123' } };
        expect(pseudonymizationService.detokenize(incomplete)).toBeNull();
    });
});