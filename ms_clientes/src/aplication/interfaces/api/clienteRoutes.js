const express = require('express');

module.exports = (clienteRepository) => {
    const router = express.Router();

    // Rota para verificar e/ou registrar um novo cliente
    router.post('/', async (req, res) => {
        const { cpf, nomeCliente, email } = req.body;
        try {
            let cliente = await clienteRepository.findClienteByCPF(cpf);
            if (cliente) {
                return res.status(200).send({ message: "Cliente já registrado.", cliente });
            }
            if (!cpf && !nomeCliente && !email) {
                return res.status(200).send({ message: "Continuando como anônimo." });
            }
            cliente = await clienteRepository.addCliente(req.body);
            res.status(201).send(cliente);
        } catch (error) {
            console.error('Erro ao adicionar cliente:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    // Rota para buscar cliente por ID amigável
    router.get('/:clienteId', async (req, res) => {
        try {
            const cliente = await clienteRepository.getClienteByClienteId(req.params.clienteId);
            if (!cliente) {
                return res.status(404).send({ message: "Cliente não encontrado." });
            }
            res.status(200).json(cliente);
        } catch (error) {
            console.error('Erro ao buscar cliente por ID:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    // Rota para buscar todos os clientes
    router.get('/', async (req, res) => {
        try {
            const clientes = await clienteRepository.getAllClientes();
            if (clientes.length === 0) {
                return res.status(404).send({ message: "Nenhum cliente encontrado." });
            }
            res.status(200).json(clientes);
        } catch (error) {
            console.error('Erro ao buscar todos os clientes:', error);
            res.status(500).send({ message: "Erro no servidor", error: error.message });
        }
    });

    return router;
};
