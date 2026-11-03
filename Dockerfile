# ========================================================
# Estágio 1: Builder (Compilação do SQLite3 na GLIBC nativa)
# ========================================================
FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependências necessárias para compilação C/C++ do SQLite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências
COPY package*.json ./

# Forçar a compilação a partir do código-fonte nativo para evitar incompatibilidade de GLIBC
RUN npm install --build-from-source=sqlite3 --omit=dev

# ========================================================
# Estágio 2: Runner (Imagem final leve e pronta para produção)
# ========================================================
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8090 \
    ADMIN_PASSWORD=hsaspd

# Copiar os módulos compilados do estágio anterior
COPY --from=builder /app/node_modules ./node_modules

# Copiar os arquivos da aplicação
COPY . .

# Expor a porta 8090
EXPOSE 8090

# Checagem de integridade (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8090/api/links', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Comando de inicialização
CMD ["node", "server.js"]
