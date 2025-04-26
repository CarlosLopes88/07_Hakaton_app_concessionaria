const mongoose = require('mongoose');

describe('Database Connection Tests', () => {
    const originalEnv = process.env;
    
    beforeEach(() => {
        // Backup das variáveis de ambiente
        process.env = {
            DOCDB_USERNAME: 'docdb_admin',
            DOCDB_PASSWORD: 'docdb_admin_password',
            DOCDB_CLUSTER_ENDPOINT_CLI: 'mongodb-cliente',
            DOCDB_DBNAME: 'clientesdb',
            DOCDB_DBPORT: '27017',
        };
        
        // Limpar cache para recarregar o módulo entre testes
        jest.resetModules();
    });

    afterEach(() => {
        // Restaura as variáveis de ambiente
        process.env = originalEnv;
        
        // Restaurar qualquer mock
        jest.restoreAllMocks();
    });

    it('Deve conectar ao banco de dados com sucesso', async () => {
        const { connectToDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
        expect(connection).toBeDefined();
        expect(connection.readyState).toBe(1); // 1 = conectado
        await connection.close();
    });

    it('Deve falhar ao conectar com variáveis de ambiente faltando', async () => {
        process.env.DOCDB_USERNAME = undefined;
        const { connectToDatabase } = require('./testDbConnect');
        
        await expect(connectToDatabase())
            .rejects
            .toThrow('Environment variables are not set correctly.');
    });

    it('Deve limpar o banco de dados com sucesso', async () => {
        const { connectToDatabase, clearDatabase, disconnectDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
        
        // Cria uma collection de teste
        await connection.createCollection('test_collection');
        
        await clearDatabase();
        
        const collections = await connection.db.collections();
        expect(collections).toHaveLength(0);
        
        await disconnectDatabase();
    });

    it('Deve lidar com erro ao limpar banco', async () => {
        const { clearDatabase } = require('./testDbConnect');
        
        await expect(clearDatabase())
            .rejects
            .toThrow();
    });

    it('Deve desconectar do banco com sucesso', async () => {
        const { connectToDatabase, disconnectDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
        
        await disconnectDatabase();
        expect(connection.readyState).toBe(0); // 0 = desconectado
    });

    it('Deve lidar com erro na desconexão', async () => {
        const { disconnectDatabase } = require('./testDbConnect');
        
        await expect(disconnectDatabase())
            .rejects
            .toThrow();
    });
    
    // Novos testes para melhorar cobertura
    
    it('Deve lidar com erros na conexão do MongoDB', async () => {
        // Forçar um erro de conexão com host inválido
        process.env.DOCDB_CLUSTER_ENDPOINT_CLI = 'host_invalido';
        
        const { connectToDatabase } = require('./testDbConnect');
        
        // O método vai gerar um erro de conexão
        await expect(connectToDatabase())
            .rejects
            .toThrow();
    });
    
    it('Deve lidar com tentativa de limpeza sem conexão ativa', async () => {
        const { clearDatabase } = require('./testDbConnect');
        
        // Mock para estado de conexão fechada
        const originalReadyState = mongoose.connection.readyState;
        jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
        
        await expect(clearDatabase())
            .rejects
            .toThrow('Database not connected');
            
        // Restaurar
        jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(originalReadyState);
    });
    
    it('Deve lidar com erro ao criar coleção', async () => {
        const { connectToDatabase, clearDatabase, disconnectDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
        
        // Mock para falha na operação deleteMany
        const collections = {
            test: {
                deleteMany: jest.fn().mockRejectedValue(new Error('Erro ao deletar'))
            }
        };
        
        // Salvar o original
        const originalCollections = connection.collections;
        
        // Substituir temporariamente
        connection.collections = collections;
        
        // Deve lançar erro
        await expect(clearDatabase())
            .rejects
            .toThrow('Erro ao deletar');
            
        // Restaurar
        connection.collections = originalCollections;
        
        await disconnectDatabase();
    });
    
    it('Deve tratar erro ao conectar no MongoDB', async () => {
        // Mock de mongoose.connect para simular erro
        jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('Falha na conexão'));
        
        const { connectToDatabase } = require('./testDbConnect');
        
        await expect(connectToDatabase())
            .rejects
            .toThrow('Falha na conexão');
    });
    
    it('Deve lidar com eventos de erro na conexão', async () => {
        // Simular um evento de erro na conexão
        const { connectToDatabase, disconnectDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
        
        // Espionar console.error
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Emitir um evento de erro
        mongoose.connection.emit('error', new Error('Erro de conexão'));
        
        // Verificar se o console.error foi chamado
        expect(consoleErrorSpy).toHaveBeenCalled();
        
        consoleErrorSpy.mockRestore();
        await disconnectDatabase();
    });
    
    it('Deve detectar quando já está desconectado', async () => {
        const { disconnectDatabase } = require('./testDbConnect');
        
        // Mock para estado de conexão já fechada
        jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
        
        // Não deve lançar erro
        await disconnectDatabase();
    });
});