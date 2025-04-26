describe('Database Connection Tests', () => {
    const originalEnv = process.env;
    
    beforeEach(() => {
        // Backup das variáveis de ambiente
        process.env = {
            DOCDB_USERNAME: 'docdb_admin',
            DOCDB_PASSWORD: 'docdb_admin_password',
            DOCDB_CLUSTER_ENDPOINT_PRO: 'mongodb-produto',
            DOCDB_DBNAME: 'produtodb',
            DOCDB_DBPORT: '27017'
        };
    });

    afterEach(() => {
        // Restaura as variáveis de ambiente
        process.env = originalEnv;
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
});