const Produto = require('../../core/domain/produto');
const ProdutoRepositoryInterface = require('../../core/repositoriesInterfaces/produtoRepositoryInterface');

class ProdutoRepository extends ProdutoRepositoryInterface {
    async addProduto(produtoData) {
        const existingProduct = await Produto.findOne({ 
            placa: produtoData.placa,
        });
        
        if (existingProduct) {
            throw new Error('Produto com estes dados já existe.');
        }
        
        const produto = new Produto(produtoData);
        await produto.save();
        return produto;
    }

    async getAllProdutos() {
        return Produto.find({}).sort({ preco: -1 }); // Do mais caro para o mais barato
    }

    async getProdutoByProdutoId(produtoId) {
        return Produto.findOne({ produtoId });
    }

    async getProdutosByMarca(marca) {
        return Produto.find({ marca }).sort({ preco: -1 }); // Do mais caro para o mais barato
    }

    async getProdutosByModelo(modelo) {
        return Produto.find({ modelo }).sort({ preco: -1 }); // Do mais caro para o mais barato
    }

    async getProdutosByAno(ano) {
        return Produto.find({ ano }).sort({ preco: -1 }); // Do mais caro para o mais barato
    }

    async getProdutoByPlaca(placa) {
        return Produto.findOne({ placa });
    }

    async getProdutosByCor(cor) {
        return Produto.find({ cor }).sort({ preco: -1 }); // Do mais caro para o mais barato
    }

    async updateProduto(produtoId, updateData) {
        return Produto.findOneAndUpdate({ produtoId }, updateData, { new: true });
    }

    async deleteProduto(produtoId) {
        return Produto.findOneAndDelete({ produtoId });
    }
}

module.exports = ProdutoRepository;