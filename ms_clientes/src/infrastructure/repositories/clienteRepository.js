// src/infrastructure/repositories/clienteRepository.js
const Cliente = require('../../core/domain/cliente');
const ClienteRepositoryInterface = require('../../core/repositoriesInterfaces/clienteRepositoryInterface');
const PseudonymizationService = require('../../core/services/pseudonymizationService');

class ClienteRepository extends ClienteRepositoryInterface {
    constructor() {
        super();
        this.pseudonymizationService = new PseudonymizationService();
    }

    /**
     * Adiciona um novo cliente com dados sensíveis pseudoanonimizados.
     * @param {Object} clienteData - Dados do cliente a ser adicionado.
     * @returns {Promise<Object>} O cliente recém-criado (com dados descriptografados para retorno).
     */
    async addCliente(clienteData) {
        const { cpf, nomeCliente, email, ...otherData } = clienteData;
        
        // Criamos o pseudônimo do CPF para buscas eficientes
        const cpfPseudonym = this.pseudonymizationService.generatePseudonymForCPF(cpf);
        
        // Tokenizamos os dados sensíveis
        const sensitiveData = {
            cpf: cpf ? this.pseudonymizationService.tokenize(cpf) : null,
            nomeCliente: nomeCliente ? this.pseudonymizationService.tokenize(nomeCliente) : null,
            email: email ? this.pseudonymizationService.tokenize(email) : null
        };
        
        // Criamos o documento no banco com os dados protegidos
        const cliente = new Cliente({
            ...otherData,
            cpfPseudonym,
            sensitiveData,
            registrado: Boolean(cpf || nomeCliente || email)
        });
        
        await cliente.save();
        
        // Retornamos o cliente com dados descriptografados
        return this._detokenizeClienteData(cliente);
    }

    /**
     * Busca um cliente pelo seu ID e descriptografa os dados sensíveis.
     * @param {String} clienteId - O ID do cliente.
     * @returns {Promise<Object>} O cliente encontrado com dados descriptografados.
     */
    async getClienteByClienteId(clienteId) {
        const cliente = await Cliente.findOne({ clienteId });
        if (!cliente) return null;
        
        return this._detokenizeClienteData(cliente);
    }

    /**
     * Busca um cliente pelo seu CPF usando o pseudônimo.
     * @param {String} cpf - O CPF do cliente.
     * @returns {Promise<Object>} O cliente encontrado com dados descriptografados.
     */
    async findClienteByCPF(cpf) {
        if (!cpf) return null;
        
        // Geramos o pseudônimo para o CPF de busca
        const cpfPseudonym = this.pseudonymizationService.generatePseudonymForCPF(cpf);
        
        // Usamos o pseudônimo para busca eficiente
        const cliente = await Cliente.findOne({ cpfPseudonym });
        if (!cliente) return null;
        
        return this._detokenizeClienteData(cliente);
    }

    /**
     * Retorna todos os clientes do repositório com dados descriptografados.
     * @returns {Promise<Array>} Lista de todos os clientes.
     */
    async getAllClientes() {
        const clientes = await Cliente.find({});
        return Promise.all(clientes.map(cliente => this._detokenizeClienteData(cliente)));
    }

    /**
     * Método auxiliar para detokenizar dados sensíveis de um cliente.
     * @private
     * @param {Object} cliente - Cliente com dados tokenizados.
     * @returns {Object} Cliente com dados detokenizados.
     */
    _detokenizeClienteData(cliente) {
        if (!cliente) return null;
        
        // Convertemos para objeto JavaScript para poder modificar
        const clienteObj = cliente.toObject ? cliente.toObject() : JSON.parse(JSON.stringify(cliente));
        
        // Para compatibilidade com o código existente, adicionamos os campos detokenizados
        if (clienteObj.sensitiveData) {
            if (clienteObj.sensitiveData.cpf) {
                clienteObj.cpf = this.pseudonymizationService.detokenize(clienteObj.sensitiveData.cpf);
            }
            
            if (clienteObj.sensitiveData.nomeCliente) {
                clienteObj.nomeCliente = this.pseudonymizationService.detokenize(clienteObj.sensitiveData.nomeCliente);
            }
            
            if (clienteObj.sensitiveData.email) {
                clienteObj.email = this.pseudonymizationService.detokenize(clienteObj.sensitiveData.email);
            }
        }
        
        // Removemos os dados sensíveis tokenizados da resposta
        delete clienteObj.sensitiveData;
        delete clienteObj.cpfPseudonym;
        
        return clienteObj;
    }
}

module.exports = ClienteRepository;