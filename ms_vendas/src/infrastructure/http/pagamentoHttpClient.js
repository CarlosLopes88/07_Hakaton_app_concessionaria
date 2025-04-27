const axios = require('axios');
require('dotenv').config();

class PagamentoHttpClient {
    constructor(options = {}) {
        this.token = options.token || process.env.PAGSEGURO_TOKEN;
        this.baseUrl = options.baseUrl || 'https://sandbox.api.pagseguro.com';
        this.httpClient = options.httpClient || axios;

        if (!this.token) {
            throw new Error("Token do PagSeguro não configurado");
        }
    }

    async makeRequest(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': this.token
        };

        let response;
        try {
            if (method === 'GET') {
                response = await this.httpClient.get(url, { headers });
            } else if (method === 'POST') {
                response = await this.httpClient.post(url, data, { headers });
            } else {
                throw new Error(`Método HTTP não suportado: ${method}`);
            }
            
            console.log(`Resposta da ${method === 'GET' ? 'consulta' : 'API'} PagSeguro:`, response.data);
            return response;
        } catch (error) {
            return this._handleRequestError(error, method);
        }
    }

    _handleRequestError(error, method) {
        if (error.response) {
            console.error(`Erro HTTP na ${method === 'GET' ? 'consulta' : 'requisição'}:`, error.response.status);
            console.error("Dados retornados pela API:", JSON.stringify(error.response.data, null, 2));
            throw new Error(`Erro na ${method === 'GET' ? 'consulta ao' : 'API do'} PagSeguro: ${error.response.status}`);
        } else {
            console.error(`Erro na requisição de ${method === 'GET' ? 'consulta' : ''}:`, error.message);
            throw error;
        }
    }

    async criarPagamento(requestBody) {
        console.log("Enviando requisição para o PagSeguro...");
        return this.makeRequest('POST', '/orders', requestBody);
    }

    async consultarPagamento(pagamentoId) {
        console.log(`Consultando pagamento ${pagamentoId} no PagSeguro...`);
        return this.makeRequest('GET', `/orders/${pagamentoId}`);
    }
}

module.exports = PagamentoHttpClient;