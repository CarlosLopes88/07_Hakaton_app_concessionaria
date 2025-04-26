# Use uma imagem oficial do Node.js como base
FROM node:20.12.0

# Cria um diretório para armazenar os arquivos da aplicação
WORKDIR /microservice_produtos

# Copia os arquivos do package.json
COPY package.json /microservice_produtos

# Copia todos os arquivos do projeto para o diretório de trabalho
COPY . /microservice_produtos

# Instale as dependências do projeto
RUN npm install

# Exponha a porta que será usada pelo servidor
EXPOSE 3002

# Comando para executar a aplicação
CMD ["npm", "start"]
