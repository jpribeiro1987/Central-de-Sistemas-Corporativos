# Portal de Acessos Institucional & Escala de Plantão TI
### Hospital Santo Antônio (HSA)

Aplicação desenvolvida para centralizar e gerenciar o acesso rápido aos sistemas corporativos do hospital e exibir a **escala de plantão da equipe de T.I.** em tempo real, com backend em **Node.js + Express**, banco relacional leve **SQLite** e frontend responsivo em **HTML5/CSS3/JavaScript**.

---

## 🐳 Executando com Docker (Porta 8090)

O projeto está totalmente preparado para ser executado em ambiente de containers Docker.

### Opção 1: Atalho Rápido para Docker (Windows)
Dê um duplo clique no arquivo:
👉 `iniciar_docker.bat`

Ele verifica se o Docker está ativo, constrói a imagem, sobe o container em segundo plano e abre o navegador em `http://localhost:8090`.

### Opção 2: Via Docker Compose (Terminal)
```bash
# Iniciar em segundo plano
docker compose up -d --build

# Ver logs do container
docker logs -f portal-acessos-hsa

# Parar o container
docker compose down
```

### Opção 3: Via Docker CLI Tradicional
```bash
# 1. Construir a imagem
docker build -t portal-acessos-hsa .

# 2. Executar o container mapeando a porta 8090 e o volume do banco
docker run -d \
  --name portal-acessos-hsa \
  -p 8090:8090 \
  -v "$(pwd)/database.sqlite:/app/database.sqlite" \
  --restart always \
  portal-acessos-hsa
```

> **Persistência de Dados:** O arquivo `database.sqlite` é mapeado via volume (`./database.sqlite:/app/database.sqlite`), garantindo que qualquer link cadastrado ou alteração no plantão continue salvo mesmo após reiniciar ou recriar o container.

---

## 🚀 Execução Direta sem Docker (Node.js)

Se preferir rodar diretamente no servidor Windows/Linux sem Docker:

### Atalho Direto:
👉 `iniciar_servidor.bat`

### Pelo Terminal:
```bash
npm start
# ou
node server.js
```

---

## 🌐 Endereços de Acesso (Porta 8090)

* **Portal Público de Acessos:** [http://localhost:8090](http://localhost:8090)
* **Painel Administrativo:** [http://localhost:8090/admin](http://localhost:8090/admin) (Senha: `hsaspd`)
* **API de Links:** [http://localhost:8090/api/links](http://localhost:8090/api/links)
* **API do Plantão:** [http://localhost:8090/api/plantao](http://localhost:8090/api/plantao)

---

## 🔐 Segurança do Painel Administrativo

* O Painel Administrativo (`/admin` e `/admin.html`) é protegido por senha.
* **Senha padrão:** `hsaspd` (pode ser sobrescrita pela variável de ambiente `ADMIN_PASSWORD`).
* Todas as rotas de alteração de dados (`POST`, `PUT`, `DELETE`) exigem autenticação.

---

## 📁 Estrutura de Arquivos

* `Dockerfile` - Configuração da imagem Docker otimizada baseada em Node 20.
* `docker-compose.yml` - Orquestração Docker com porta 8090 e persistência de volume.
* `.dockerignore` - Exclusões do build Docker.
* `iniciar_docker.bat` - Atalho executável para subir com Docker.
* `server.js` - Servidor backend (Express + SQLite) configurado na porta 8090.
* `index.html` - Página principal do portal.
* `admin.html` - Painel de controle para gerenciar links e a escala de plantão da TI.
* `database.sqlite` - Banco de dados SQLite local.
* `iniciar_servidor.bat` - Script executável para inicialização local rápida.
* `package.json` - Dependências do projeto (`express`, `sqlite3`, `cors`).
