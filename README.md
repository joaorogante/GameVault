# 🎮 GameVault — Plataforma de Jogos Online

## 1. Tema Escolhido

**GameVault** é uma plataforma de jogos online onde usuários podem se cadastrar, explorar um catálogo de jogos, escrever reviews, e adicionar amigos para receber recomendações. O sistema utiliza **Polyglot Persistence** com 4 bancos de dados diferentes, cada um escolhido pelo tipo de dado que armazena.

## 2. Justificativa dos Bancos de Dados

### 🗄️ PostgreSQL (Banco Relacional — RDB)
**Dados:** Usuários (cadastro, login, perfil)

**Justificativa:** Dados de usuários possuem estrutura fixa (nome, email, senha, data de cadastro) e restrições de integridade como unicidade de email. O banco relacional garante transações ACID, constraints e é ideal para dados estruturados que não mudam de schema.

### 📄 MongoDB (NoSQL — Document Storage — DB1)
**Dados:** Catálogo de jogos (nome, descrição, gêneros, plataformas, requisitos, imagens)

**Justificativa:** Jogos possuem dados semi-estruturados que variam entre si — um jogo de PC tem requisitos de sistema, um jogo mobile tem tamanho do app, um jogo de console tem classificação etária diferente. O modelo de documentos JSON permite campos flexíveis por documento sem necessidade de ALTER TABLE. Índices em arrays (gêneros, plataformas) otimizam buscas com filtros múltiplos.

### 🔑 Redis (NoSQL — Key-Value Store — DB2)
**Dados:** Reviews/avaliações dos jogos e rankings

**Justificativa:** Reviews são dados de leitura frequente e alta velocidade. Redis oferece estruturas como Hashes (para armazenar cada review), Sets (para agrupar reviews por jogo) e Sorted Sets (para ranquear jogos por nota média). A performance de O(1) para leitura é ideal para exibir ratings em tempo real.

### 🕸️ Neo4j (NoSQL — Graph Database — DB3)
**Dados:** Rede social de jogadores (amizades e recomendações)

**Justificativa:** Relações de amizade são naturalmente modeladas como grafos. Queries como "amigos em comum", "amigos dos meus amigos que jogam X" e "recomendações baseadas na rede social" são extremamente eficientes em bancos de grafos (traversal em O(k) onde k é a profundidade) e seriam muito custosas em bancos relacionais (múltiplos JOINs). Neo4j usa a linguagem Cypher que expressa essas queries de forma intuitiva.

### Arquitetura do Backend

O backend é implementado em **Node.js com Express**, dividido em 4 módulos de rotas:

| Serviço | Rota Base | Banco | Operações |
|---------|-----------|-------|-----------|
| Usuários | `/api/users` | PostgreSQL | CRUD de usuários |
| Jogos | `/api/games` | MongoDB | CRUD de jogos com filtros |
| Reviews | `/api/reviews` | Redis | CRUD de reviews e rankings |
| Social | `/api/social` | Neo4j | Amizades e recomendações |

```
Frontend (HTML/CSS/JS)
    ↕
Backend (Node.js + Express)
    ↕           ↕           ↕           ↕
PostgreSQL   MongoDB      Redis       Neo4j
(Usuários)   (Jogos)    (Reviews)   (Amizades)
```

## 3. Como Executar o Projeto

### Pré-requisitos

1. **Node.js** (v18+): https://nodejs.org

2. **PostgreSQL** — use **Neon** (gratuito online):
   - Acesse https://neon.tech → crie conta → crie um projeto
   - Copie a connection string

3. **MongoDB** — use **MongoDB Atlas** (gratuito online):
   - Acesse https://www.mongodb.com/atlas → crie conta → crie um cluster Free
   - Em Network Access, libere `0.0.0.0/0`
   - Copie a connection string

4. **Redis** — use **Redis Cloud** (gratuito online):
   - Acesse https://redis.com/try-free/ → crie conta → crie um database Free
   - Copie host, porta e senha

5. **Neo4j** — use **Neo4j AuraDB** (gratuito online):
   - Acesse https://neo4j.com/cloud/platform/aura-graph-database/ → crie conta → crie instância Free
   - Anote a URI, usuário e senha

### Passo 1 — Clonar o repositório

```bash
git clone <url-do-repositorio>
cd GameVault
```

### Passo 2 — Configurar os bancos de dados

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` com suas credenciais:

```env
POSTGRES_URL=postgresql://user:pass@host/dbname?sslmode=require
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/gamevault
REDIS_URL=redis://default:pass@host:port
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=sua_senha
PORT=3000
```

### Passo 3 — Instalar dependências e iniciar o backend

```bash
cd backend
npm install
node server.js
```

O backend inicia em `http://localhost:3000`

### Passo 4 — Abrir o frontend

Abra o arquivo `frontend/index.html` diretamente no navegador.

### Passo 5 — Testar

A interface possui 4 abas:
- **Usuários**: cadastrar, listar, editar, excluir (PostgreSQL)
- **Jogos**: cadastrar com gêneros/plataformas, listar, editar, excluir (MongoDB)
- **Reviews**: avaliar jogos com estrelas, ver reviews, ranking (Redis)
- **Social**: adicionar amigos, ver amigos, recomendações (Neo4j)

## 4. Estrutura do Projeto

```
GameVault/
├── README.md
├── .gitignore
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── config/
│   │   ├── postgres.js
│   │   ├── mongodb.js
│   │   ├── redis.js
│   │   └── neo4j.js
│   └── routes/
│       ├── users.js      (PostgreSQL)
│       ├── games.js      (MongoDB)
│       ├── reviews.js    (Redis)
│       └── social.js     (Neo4j)
└── frontend/
    └── index.html

```

## 5. Tecnologias

| Camada | Tecnologia | Finalidade |
|--------|-----------|------------|
| Frontend | HTML, CSS, JavaScript | Interface do usuário |
| Backend | Node.js, Express | API REST |
| RDB | PostgreSQL | Dados de usuários |
| DB1 | MongoDB (Document) | Catálogo de jogos |
| DB2 | Redis (Key-Value) | Reviews e rankings |
| DB3 | Neo4j (Graph) | Amizades e recomendações |
