describe('Database Connection Tests', () => {
    let mongoose;
    const originalEnv = process.env;
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;
    
    beforeEach(() => {
        console.error = jest.fn();
        console.log = jest.fn();
        jest.resetModules();
        mongoose = require('mongoose');
        process.env = {
            DOCDB_USERNAME: 'docdb_admin',
            DOCDB_PASSWORD: 'docdb_admin_password',
            DOCDB_CLUSTER_ENDPOINT_PED: 'mongodb-venda',
            DOCDB_DBNAME: 'vendasdb',
            DOCDB_DBPORT: '27017'
        };
    });
 
    afterEach(() => {
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
        process.env = originalEnv;
        jest.clearAllMocks();
    });
 
    it('Deve conectar ao banco de dados com sucesso', async () => {
        const { connectToDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
        expect(connection).toBeDefined();
        expect(connection.readyState).toBe(1);
        await connection.close();
    });
 
    it('Deve falhar ao conectar com variáveis de ambiente faltando', async () => {
        process.env.DOCDB_USERNAME = undefined;
        const { connectToDatabase } = require('./testDbConnect');
        await expect(connectToDatabase()).rejects.toThrow('Environment variables are not set correctly.');
    });
 
    it('Deve testar eventos de erro de conexão', async () => {
        const { connectToDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
 
        // Forçar evento de erro
        const testError = new Error('Test MongoDB Error');
        mongoose.connection.emit('error', testError);
 
        expect(console.error).toHaveBeenCalledWith(
            'MongoDB connection error:',
            testError
        );
 
        await connection.close();
    });
 
    it('Deve testar evento de conexão aberta', async () => {
        const { connectToDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
 
        // Forçar evento open
        mongoose.connection.emit('open');
 
        expect(console.log).toHaveBeenCalledWith(
            'Connected to MongoDB Test Database'
        );
 
        await connection.close();
    });
 
    it('Deve testar erro específico de conexão', async () => {
        // Mock do mongoose.connect para forçar erro
        jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('Specific connection error'));
        const { connectToDatabase } = require('./testDbConnect');
 
        await expect(connectToDatabase())
            .rejects
            .toThrow('Specific connection error');
 
        expect(console.error).toHaveBeenCalledWith(
            'Error connecting to database:',
            expect.any(Error)
        );
    });
 
    it('Deve testar erro específico de desconexão', async () => {
        const { connectToDatabase, disconnectDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
        
        jest.spyOn(mongoose.connection, 'close').mockRejectedValue(new Error('Failed to disconnect'));
 
        await expect(disconnectDatabase())
            .rejects
            .toThrow('Failed to disconnect');
 
        expect(console.error).toHaveBeenCalledWith(
            'Error disconnecting from database:',
            expect.any(Error)
        );
    });
 
    it('Deve testar erro específico ao limpar banco', async () => {
        const { connectToDatabase, clearDatabase } = require('./testDbConnect');
        await connectToDatabase();
 
        // Mock readyState para simular conexão ativa
        jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
 
        // Mock collections para forçar erro
        const mockCollections = {
            test: {
                deleteMany: jest.fn().mockRejectedValue(new Error('Failed to clear collections'))
            }
        };
        
        jest.spyOn(mongoose.connection, 'collections', 'get').mockReturnValue(mockCollections);
 
        await expect(clearDatabase())
            .rejects
            .toThrow('Failed to clear collections');
 
        expect(console.error).toHaveBeenCalledWith(
            'Error clearing database:',
            expect.any(Error)
        );
    });
 
    it('Deve limpar o banco de dados com sucesso', async () => {
        const { connectToDatabase, clearDatabase, disconnectDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
        
        // Mock para simular coleções
        const mockCollections = {
            test: {
                deleteMany: jest.fn().mockResolvedValue({})
            }
        };
        
        jest.spyOn(mongoose.connection, 'collections', 'get').mockReturnValue(mockCollections);
        
        await clearDatabase();
        
        expect(mockCollections.test.deleteMany).toHaveBeenCalledWith({});
        
        await disconnectDatabase();
    });
 
    it('Deve lidar com erro ao limpar banco desconectado', async () => {
        const { clearDatabase } = require('./testDbConnect');
        jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
        await expect(clearDatabase()).rejects.toThrow('Database not connected');
    });
 
    it('Deve desconectar do banco com sucesso', async () => {
        const { connectToDatabase, disconnectDatabase } = require('./testDbConnect');
        const connection = await connectToDatabase();
        
        // Mock do método close para simular desconexão bem-sucedida
        jest.spyOn(mongoose.connection, 'close').mockResolvedValue(undefined);
        jest.spyOn(mongoose.connection, 'readyState', 'get')
            .mockReturnValueOnce(1)  // Conectado antes da desconexão
            .mockReturnValueOnce(0); // Desconectado após
        
        await disconnectDatabase();
        
        expect(mongoose.connection.close).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('Disconnected from MongoDB');
    });
 
    it('Deve lidar com desconexão quando banco já está desconectado', async () => {
        const { disconnectDatabase } = require('./testDbConnect');
        jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
        await expect(disconnectDatabase()).resolves.not.toThrow();
    });
});