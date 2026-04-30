# GameVault - Plataforma de Jogos Online

GameVault e uma plataforma web para cadastro de usuarios, catalogo de jogos, reviews e recursos sociais. O projeto usa **Polyglot Persistence**, com um banco diferente para cada tipo de dado.

## Bancos Utilizados

| Banco | Uso no projeto | Rotas |
| --- | --- | --- |
| PostgreSQL | Usuarios, cadastro e login | `/api/users` |
| MongoDB | Catalogo de jogos | `/api/games` |
| Redis | Reviews, avaliacoes e ranking | `/api/reviews` |
| Neo4j | Amizades e sugestoes sociais | `/api/social` |

## Funcionalidades

- Login obrigatorio antes de acessar o painel.
- Cadastro de usuario pela tela `cadastro.html`.
- Painel protegido em `app.html`.
- CRUD de usuarios no PostgreSQL.
- CRUD de jogos no MongoDB.
- Reviews com nota usando Redis.
- Amizades e sugestoes usando Neo4j.

## Estrutura

```text
GameVault/
|-- backend/
|   |-- server.js
|   |-- package.json
|   |-- .env
|   |-- config/
|   |   |-- postgres.js
|   |   |-- mongodb.js
|   |   |-- redis.js
|   |   `-- neo4j.js
|   `-- routes/
|       |-- users.js
|       |-- games.js
|       |-- reviews.js
|       `-- social.js
`-- frontend/
    |-- index.html      # login
    |-- cadastro.html   # cadastro
    `-- app.html        # painel principal protegido
```

## Configuracao do `.env`

Crie/edite o arquivo `backend/.env`:

```env
POSTGRES_URL=postgresql://user:pass@host/dbname?sslmode=require

MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/?appName=Cluster0
MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1

REDIS_URL=redis://default:pass@host:port

NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=sua_senha
NEO4J_DATABASE=neo4j

PORT=3000
```

Observacoes:

- `MONGODB_DNS_SERVERS` foi adicionado porque em algumas redes o Node falha ao resolver URLs `mongodb+srv`.
- Use `redis://` se o seu Redis Cloud nao estiver com TLS habilitado. Use `rediss://` apenas em endpoint Redis com TLS.
- O nome correto da variavel do Neo4j no projeto e `NEO4J_USERNAME`.
- Nao publique o `.env` com credenciais reais.

## Como Rodar

### 1. Instalar dependencias do backend

```powershell
cd backend
npm install
```

### 2. Rodar a API

```powershell
npm start
```

A API fica em:

```text
http://localhost:3000
```

Teste rapido:

```text
http://localhost:3000/api/health
```

### 3. Rodar o frontend por porta local

Em outro terminal, a partir da raiz do projeto:

```powershell
cd frontend
python -m http.server 5500
```

Abra no navegador:

```text
http://localhost:5500
```

Fluxo esperado:

```text
Login -> app.html
Cadastro -> app.html
Sem login -> volta para index.html
```

## Rotas Principais

### Usuarios

```http
POST   /api/users
POST   /api/users/login
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
```

### Jogos

```http
POST   /api/games
GET    /api/games
GET    /api/games/:id
PUT    /api/games/:id
DELETE /api/games/:id
```

### Reviews

```http
POST   /api/reviews
GET    /api/reviews/game/:gameId
GET    /api/reviews/top
PUT    /api/reviews/:id
DELETE /api/reviews/:id
```

### Social

```http
POST   /api/social/friends
GET    /api/social/friends/:userId
GET    /api/social/common/:userId1/:userId2
GET    /api/social/suggestions/:userId
GET    /api/social/players
PUT    /api/social/players/:userId
DELETE /api/social/friends/:userId/:friendId
```

## Login e Seguranca

O login atual usa a rota `POST /api/users/login` e salva o usuario no `localStorage` com a chave `gamevault_user`. Isso protege a navegacao do frontend, mas ainda e uma autenticacao simples para fins de projeto.

Para producao, o ideal seria:

- Salvar senha com hash usando `bcrypt`.
- Usar JWT ou sessao de servidor.
- Proteger rotas do backend com middleware de autenticacao.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Relacional | PostgreSQL |
| Documentos | MongoDB |
| Key-value | Redis |
| Grafo | Neo4j |
