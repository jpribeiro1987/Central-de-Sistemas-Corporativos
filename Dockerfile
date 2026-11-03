# Imagem base oficial do Node.js (versão LTS leve baseada em Debian com suporte nativo ao SQLite3)
FROM node:20-slim

# Definir diretório de trabalho dentro do container
WORKDIR /app

# Definir variáveis de ambiente padrão
ENV NODE_ENV=production \
    PORT=8090 \
    ADMIN_PASSWORD=hsaspd

# Copiar arquivos de definição de pacotes
COPY package*.json ./

# Instalar dependências de produção
RUN npm install --omit=dev

# Copiar o restante dos arquivos do projeto
COPY . .

# Expor a porta 8090
EXPOSE 8090

# Volume para persistência do banco de dados SQLite
VOLUME ["/app/data"]

# Checagem de integridade (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8090/api/links', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Comando de inicialização
CMD ["node", "server.js"]
