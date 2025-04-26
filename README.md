# Tech Challenge - App Concessionária

Este é um sistema de gerenciamento de pedidos para uma concessionária de veículos, desenvolvido como projeto de arquitetura de microserviços. 

## Visão Geral

O sistema é composto por três microserviços (Clientes, Produtos e Vendas) implementando os princípios da Clean Architecture. A aplicação oferece segurança avançada para dados de clientes através de pseudoanonimização e tokenização. O sistema utiliza o padrão SAGA para coordenação de transações distribuídas entre os microserviços, utilizando infraestrutura escalável na AWS com serviços como EKS (Kubernetes), API Gateway, DocumentDB e Cognito.

## Repositórios

Você pode acessar os repositórios do projeto nos seguintes links:

- **Infraestrutura do banco de dados (DocumentDB)**: [01_tcf4_infra_documentdb](https://github.com/CarlosLopes88/01_infra_documentdb)
- **Infraestrutura do Kubernetes (EKS - Cliente)**: [02_tcf4_infra_eks_cliente](https://github.com/CarlosLopes88/02_infra_eks_cliente)
- **Infraestrutura do Kubernetes (EKS - Produto)**: [03_tcf4_infra_eks_produto](https://github.com/CarlosLopes88/03_infra_eks_produto)
- **Infraestrutura do Kubernetes (EKS - Venda)**: [04_tcf4_infra_eks_venda](https://github.com/CarlosLopes88/04_infra_eks_pedidopgto)
- **Cognito (JWT)**: [05_tcf4_infra_cognito](https://github.com/CarlosLopes88/05_infra_cognito)
- **API Gateway**: [06_tcf4_infra_apigateway](https://github.com/CarlosLopes88/06_infra_apigateway)
- **App concessionária**: [07_app_concessionaria](https://github.com/CarlosLopes88/07)

## Tecnologias Envolvidas

- **Backend**: Node.js e Express.js
- **Banco de Dados**: MongoDB/DocumentDB
- **Autenticação**: AWS Cognito
- **Orquestração de Containers**: Kubernetes (EKS)
- **API Gateway**: AWS API Gateway
- **Containerização**: Docker
- **Automação de Infraestrutura**: Terraform
- **CI/CD**: GitHub Actions
- **Testes**: Jest e SonarQube Cloud

## Microserviços

### 1. Microserviço de Clientes
- **Responsabilidades**: Gerenciamento e cadastro de clientes
- **Segurança de Dados**: Implementa pseudoanonimização e tokenização de dados sensíveis (CPF, nome, email)
- **APIs**: Endpoints para cadastro, consulta e gestão de clientes
- **Banco de Dados**: Coleção dedicada no DocumentDB

### 2. Microserviço de Produtos (Veículos)
- **Responsabilidades**: Gerenciamento do catálogo de veículos
- **Funcionalidades**: Cadastro, pesquisa e manipulação do estoque de veículos
- **Recursos**: Busca por marca, modelo, ano, cor e placa
- **Banco de Dados**: Coleção dedicada no DocumentDB

### 3. Microserviço de Vendas (Pedidos e Pagamentos)
- **Responsabilidades**: Gerenciamento de pedidos e processamento de pagamentos
- **SAGA Pattern**: Coordenação de transações distribuídas
- **Fluxo de Pagamento**: Integração com gateway de pagamento (PagSeguro)
- **Estados do Pedido**: EmProcessamento, Reservado, PagamentoEmProcessamento, PagamentoAprovado, Finalizado, Cancelado
- **Banco de Dados**: Coleção dedicada no DocumentDB

## Segurança de Dados

O sistema implementa várias camadas de segurança para proteger dados sensíveis dos clientes:

1. **Pseudoanonimização**:
   - Utilização da técnica UUID v5 para gerar pseudônimos determinísticos para CPFs
   - Permite buscas eficientes sem expor os dados reais
   - Implementada no core da aplicação (src/core/services/pseudonymizationService.js)

2. **Tokenização de Dados Sensíveis**:
   - CPF, nome e email são criptografados com AES-256-GCM antes de serem armazenados
   - Tokens armazenam os dados criptografados junto com metadados (IV e authTag)
   - Chaves de criptografia gerenciadas via variáveis de ambiente

3. **Proteção de Acesso com AWS Cognito**:
   - Autenticação dos usuários via JWT
   - Validação de tokens via API Gateway
   - Controle centralizado de acessos

4. **Isolamento de Rede**:
   - Comunicação segura entre microserviços via rede interna Kubernetes
   - DocumentDB isolado em VPC dedicada
   - Acesso restrito via Security Groups

## Padrão SAGA para Transações Distribuídas

O sistema implementa o padrão SAGA para coordenar transações que envolvem múltiplos microserviços, garantindo consistência de dados e permitindo compensações em caso de falhas.

### Implementação
- **SagaCoordinator**: Classe central que coordena o fluxo de transações (src/core/saga/sagaCoordinator.js)
- **Orquestração**: Abordagem de orquestração com o Microserviço de Vendas como coordenador

### Fluxos Principais

#### Criação de Pedido:
1. **Verificar Cliente**: Confirma existência do cliente
2. **Verificar Veículo**: Confirma existência e disponibilidade do veículo
3. **Reservar Veículo**: Altera status do veículo para "Reservado"
4. **Criar Pedido**: Registra o pedido com status "Reservado"

**Compensações**:
- Se falha após reserva do veículo: Libera o veículo (status "Disponível")

#### Pagamento:
1. **Processar Pagamento**: Integração com gateway (PagSeguro)
2. **Atualizar Status**: Atualiza status do pedido para "PagamentoEmProcessamento"
3. **Aguardar Confirmação**: Via webhook ou simulação

#### Finalização do Pedido:
1. **Confirmar Pagamento**: Verifica aprovação do pagamento
2. **Remover Veículo**: Remove veículo do estoque
3. **Finalizar Pedido**: Atualiza status do pedido para "Finalizado"

#### Cancelamento:
1. **Liberar Veículo**: Se reservado, altera status do veículo para "Disponível"
2. **Cancelar Pedido**: Atualiza status do pedido para "Cancelado"
3. **Cancelar Pagamento**: Se em processamento, cancela o pagamento

### Benefícios
- **Consistência Eventual**: Garante que os dados fiquem consistentes mesmo entre diferentes serviços
- **Resiliência**: Permite recuperação de falhas parciais através de compensações
- **Isolamento**: Cada microserviço mantém controle sobre seus próprios dados

## Arquitetura na AWS

### Principais Componentes AWS:

- **DocumentDB**: Banco de dados compatível com MongoDB para armazenamento
- **EKS (Elastic Kubernetes Service)**: Orquestração de containers dos microserviços
- **API Gateway**: Centraliza as chamadas aos microserviços, validando tokens JWT
- **Cognito**: Autenticação e autorização de usuários
- **ECR (Elastic Container Registry)**: Armazenamento de imagens Docker
- **VPC, Security Groups, etc**: Infraestrutura de rede segura

### Diagrama de Arquitetura

<img align="center" src="https://github.com/CarlosLopes88/07_Hakaton_app_concessionaria/Diagrama hakaton 2.png">

## Automação de Deploys

A infraestrutura é gerida pelo **Terraform**, que define e aplica os recursos de infraestrutura na AWS. O deploy da aplicação é automatizado com **GitHub Actions**, que dispara workflows para criar a infraestrutura e realizar o deploy do código sempre que houver um push na branch `main`.

Cada repositório possui workflows YAML dedicados para automatizar o processo:

- **deploy_documentdb**: Deploy do DocumentDB
- **deploy_eks**: Provisionamento do cluster EKS e deploy dos 3 serviços (clientes, produtos e pedidos/pagamentos)
- **deploy_cognito**: Deploy do Cognito
- **deploy_apigateway**: Deploy do API Gateway

## Como Executar o Projeto

### Usando Docker (Desenvolvimento Local)

```bash
# Criar rede para comunicação entre serviços
docker network create app-network

# Microserviço de Clientes
cd microservice_cliente
docker build -t microservice_cliente:latest .
docker run -d --name mongodb-cliente --network app-network -e MONGO_INITDB_ROOT_USERNAME=docdb_admin -e MONGO_INITDB_ROOT_PASSWORD=docdb_admin_password -e MONGO_INITDB_DATABASE=clientesdb -p 27017:27017 mongo:latest
docker run -d --name microservice_cliente --network app-network -p 3001:3001 microservice_cliente:latest

# Microserviço de Produtos
cd microservice_produtos
docker build -t microservice_produto:latest .
docker run -d --name mongodb-produto --network app-network -e MONGO_INITDB_ROOT_USERNAME=docdb_admin -e MONGO_INITDB_ROOT_PASSWORD=docdb_admin_password -e MONGO_INITDB_DATABASE=produtodb -p 27018:27017 mongo:latest
docker run -d --name microservice_produto --network app-network -p 3002:3002 microservice_produto:latest

# Microserviço de Vendas
cd microservice_venda
docker build -t microservice_venda:latest .
docker run -d --name mongodb-venda --network app-network -e MONGO_INITDB_ROOT_USERNAME=docdb_admin -e MONGO_INITDB_ROOT_PASSWORD=docdb_admin_password -e MONGO_INITDB_DATABASE=vendasdb -p 27019:27017 mongo:latest
docker run -d --name microservice_venda --network app-network -p 3003:3003 microservice_venda:latest
```

### Usando Kubernetes (Desenvolvimento Local)

```bash
# Criar namespaces
kubectl create namespace microservice-cliente
kubectl create namespace microservice-produto
kubectl create namespace microservice-venda

# Deployment Microserviço Cliente
kubectl apply -f k8s/clientemongodbdeploy.yaml
kubectl apply -f k8s/clientemongodbdeployservice.yaml
kubectl apply -f k8s/clientedeployment.yaml
kubectl apply -f k8s/clientedeploymentservice.yaml
kubectl apply -f k8s/clientehpa.yaml

# Deployment Microserviço Produto
kubectl apply -f k8s/produtomongodbdeploy.yaml
kubectl apply -f k8s/produtomongodbdeployservice.yaml
kubectl apply -f k8s/produtodeployment.yaml
kubectl apply -f k8s/produtodeploymentservice.yaml
kubectl apply -f k8s/produtohpa.yaml

# Deployment Microserviço Venda
kubectl apply -f k8s/vendamongodbdeploy.yaml
kubectl apply -f k8s/vendamongodbdeployservice.yaml
kubectl apply -f k8s/vendadeployment.yaml
kubectl apply -f k8s/vendadeploymentservice.yaml
kubectl apply -f k8s/vendahpa.yaml
```

## Documentação das APIs

### Microserviço de Clientes (porta 3001)
- **POST /api/cliente**: Criar/registrar cliente
- **GET /api/cliente/:clienteId**: Buscar cliente por ID
- **GET /api/cliente**: Listar todos os clientes

### Microserviço de Produtos (porta 3002)
- **POST /api/produto**: Cadastrar veículo
- **GET /api/produto**: Listar veículos
- **GET /api/produto/:produtoId**: Buscar veículo por ID
- **GET /api/produto/marca/:marca**: Buscar por marca
- **GET /api/produto/modelo/:modelo**: Buscar por modelo
- **GET /api/produto/ano/:ano**: Buscar por ano
- **GET /api/produto/placa/:placa**: Buscar por placa
- **GET /api/produto/cor/:cor**: Buscar por cor
- **PUT /api/produto/:produtoId**: Atualizar veículo
- **DELETE /api/produto/:produtoId**: Excluir veículo

### Microserviço de Vendas (porta 3003)
- **POST /api/pedido**: Criar pedido
- **GET /api/pedido**: Listar pedidos
- **GET /api/pedido/:pedidoId**: Buscar pedido por ID
- **GET /api/pedido/ativos**: Listar pedidos ativos
- **GET /api/pedido/status/:status**: Buscar por status
- **GET /api/pedido/cliente/:clienteId**: Buscar por cliente
- **PUT /api/pedido/:pedidoId/status**: Atualizar status
- **POST /api/pagamento/:pedidoId**: Criar pagamento
- **GET /api/pagamento/:pedidoId**: Consultar pagamento
- **POST /api/webhook/pagseguro**: Webhook para PagSeguro
- **POST /api/webhook/simulacao/:pedidoId/:status**: Simulação de pagamento

## SECRETS a serem criadas para CI/CD:

### 01_tcf4_infra_documentdb:
- **`AWS_ACCESS_KEY_ID`**: Chave de acesso AWS.
- **`AWS_SECRET_ACCESS_KEY`**: Chave secreta da AWS.
- **`AWS_REGION`**: Região AWS (ex: `us-east-1`).
- **`DB_MASTER_USERNAME`**: Nome de usuário do banco de dados DocumentDB.
- **`DB_MASTER_PASSWORD`**: Senha do banco de dados DocumentDB.
- **`DOCDB_USERNAME`**: Senha do banco de dados DocumentDB.

### 02_tcf4_infra_eks_cliente:
- **`AWS_ACCESS_KEY_ID`**: Chave de acesso AWS.
- **`AWS_SECRET_ACCESS_KEY`**: Chave secreta da AWS.
- **`AWS_REGION`**: Região AWS (ex: `us-east-1`).
- **`DB_MASTER_USERNAME`**: Nome de usuário do banco de dados DocumentDB.
- **`DB_MASTER_PASSWORD`**: Senha do banco de dados DocumentDB.
- **`DOCDB_USERNAME`**: Senha do banco de dados DocumentDB.
- **`DOCDB_CLUSTER_ENDPOINT_CLI`**: Endpoint banco de dados cliente.

### 03_tcf4_infra_eks_produto:
- **`AWS_ACCESS_KEY_ID`**: Chave de acesso AWS.
- **`AWS_SECRET_ACCESS_KEY`**: Chave secreta da AWS.
- **`AWS_REGION`**: Região AWS (ex: `us-east-1`).
- **`DB_MASTER_USERNAME`**: Nome de usuário do banco de dados DocumentDB.
- **`DB_MASTER_PASSWORD`**: Senha do banco de dados DocumentDB.
- **`DOCDB_USERNAME`**: Senha do banco de dados DocumentDB.
- **`DOCDB_CLUSTER_ENDPOINT_PRO`**: Endpoint banco de dados produtos.

### 04_tcf4_infra_eks_pedidopgto:
- **`AWS_ACCESS_KEY_ID`**: Chave de acesso AWS.
- **`AWS_SECRET_ACCESS_KEY`**: Chave secreta da AWS.
- **`AWS_REGION`**: Região AWS (ex: `us-east-1`).
- **`DB_MASTER_USERNAME`**: Nome de usuário do banco de dados DocumentDB.
- **`DB_MASTER_PASSWORD`**: Senha do banco de dados DocumentDB.
- **`DOCDB_USERNAME`**: Senha do banco de dados DocumentDB.
- **`DOCDB_CLUSTER_ENDPOINT_CLI`**: Endpoint banco de dados cliente.
- **`DOCDB_CLUSTER_ENDPOINT_PRO`**: Endpoint banco de dados produtos.
- **`DOCDB_CLUSTER_ENDPOINT_PED`**: Endpoint banco de dados pedidos e pagamento.
- **`PAGSEGURO_TOKEN`**: Token para integração do pagseguro.

### 05_tcf4_infra_cognito:
- **`AWS_ACCESS_KEY_ID`**: Chave de acesso AWS.
- **`AWS_SECRET_ACCESS_KEY`**: Chave secreta da AWS.
- **`AWS_REGION`**: Região AWS (ex: `us-east-1`).

### 06_tcf4_infra_apigateway:
- **`AWS_ACCESS_KEY_ID`**: Chave de acesso AWS.
- **`AWS_SECRET_ACCESS_KEY`**: Chave secreta da AWS.
- **`AWS_REGION`**: Região AWS (ex: `us-east-1`).
- **`URL_LB_CL`**: Endpoint loadbalancer eks cliente.
- **`URL_LB_PRO`**: Endpoint loadbalancer eks produtos.
- **`URL_LB_PED`**: Endpoint loadbalancer eks pedido pagamento.
- **`COGNITO`**: Endpoint do cognito user pool arn.