# Guia de Implementação: Portal de Acessos Dinâmico (CRUD)

Este documento contém todas as instruções e códigos necessários para transformar o portal de acessos estático do hospital em uma aplicação dinâmica, onde os links podem ser gerenciados (Criados, Editados e Excluídos) através de um painel administrativo.

---

## 1. Arquitetura do Sistema

Para um ambiente hospitalar interno, a abordagem mais eficiente e leve é:
*   **Frontend Público (Portal):** HTML/CSS/JS (Vanilla) - adaptado para consumir a API.
*   **Frontend Admin (Painel):** HTML/CSS/JS (Vanilla) puro, sem necessidade de frameworks pesados.
*   **Backend (Servidor da API):** Node.js com o framework Express.
*   **Banco de Dados:** SQLite (banco relacional leve que salva os dados em um único arquivo local, dispensando a instalação de servidores de banco de dados pesados como MySQL ou SQL Server).

### Estrutura de Dados (Schema)
Cada botão será salvo no banco de dados com as seguintes informações:
*   `id`: Identificador único numérico (Autoincremento).
*   `title`: Nome do sistema (Ex: "Sistema de Custos").
*   `description`: Subtítulo (Ex: "Gestão Financeira").
*   `url`: O link de destino (Ex: "http://192.168.252.248:8083/").
*   `theme`: A classe CSS da cor do botão (Ex: "theme-teal").
*   `icon`: O código SVG literal do ícone.

---

## 2. Configuração do Backend (Node.js + SQLite)

O backend será responsável por fornecer os dados para a página inicial e processar as alterações feitas no painel administrativo.

### Passo a passo para iniciar:
1. Crie uma pasta no seu computador/servidor para o projeto (ex: `portal-hospital`).
2. Abra o terminal nessa pasta.
3. Inicialize o projeto Node.js e instale as dependências executando os comandos abaixo:

```bash
npm init -y
npm install express sqlite3 cors
```

4. Crie um arquivo chamado `server.js` e cole o código abaixo. Este script cria o banco de dados automaticamente e insere a carga inicial dos links caso o banco esteja vazio.

**Código do `server.js`:**

```javascript
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Inicialização do Banco de Dados SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    initDB();
  }
});

// Criação da tabela e Carga Inicial
function initDB() {
  db.run(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    theme TEXT NOT NULL,
    icon TEXT NOT NULL
  )`, () => {
    db.get('SELECT COUNT(*) as count FROM links', (err, row) => {
      if (row.count === 0) {
        console.log('Banco vazio. Inserindo carga inicial de links...');
        const initialData = [
          ['Faça seu Chamado', 'Suporte Técnico TI', 'http://192.168.245.2/glpi/marketplace/formcreator/front/formdisplay.php?id=1', 'theme-blue', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'],
          ['WebMail', 'E-mail Corporativo', 'http://webmail.hospitalsantoantonio.org.br/', 'theme-sky', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M2 4l10 8 10-8"></path></svg>'],
          ['Sistema de Custos', 'Gestão Financeira', 'http://192.168.252.248:8083/', 'theme-teal', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>'],
          ['Portal SPDATA', 'ERP Hospitalar', 'https://portal.spdata.com.br/', 'theme-indigo', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 17 22 12"></polyline></svg>'],
          ['DRG', 'Classificação DRG Brasil', 'http://192.168.252.248:8085/login', 'theme-violet', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'],
          ['Painel Coordenadores', 'Gestão de Chamados GLPI', 'http://192.168.245.2/glpi/', 'theme-orange', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>'],
          ['Imagens Radiológicas', 'Laudos e Imagens (PACS)', 'https://resultados.hospitalsantoantonio.org.br/login', 'theme-slate', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'],
          ['Sistema da Qualidade', 'Portal SGQ', 'http://sg.hsa/', 'theme-emerald', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'],
          ['Pedido de Compras', 'Gestão de Compras', 'http://compras.hsa:8080/', 'theme-rose', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>'],
          ['Sistema de Indicadores', 'Painel BI (Dashboard)', 'http://bi.hsa:8089/', 'theme-amber', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>']
        ];

        const stmt = db.prepare(`INSERT INTO links (title, description, url, theme, icon) VALUES (?, ?, ?, ?, ?)`);
        initialData.forEach(link => stmt.run(link));
        stmt.finalize();
        console.log('Carga inicial concluída.');
      }
    });
  });
}

// LER (Listar todos os links)
app.get('/api/links', (req, res) => {
  db.all('SELECT * FROM links', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CRIAR (Adicionar novo link)
app.post('/api/links', (req, res) => {
  const { title, description, url, theme, icon } = req.body;
  const sql = `INSERT INTO links (title, description, url, theme, icon) VALUES (?, ?, ?, ?, ?)`;
  
  db.run(sql, [title, description, url, theme, icon], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, title, description, url, theme, icon });
  });
});

// EDITAR (Atualizar link existente)
app.put('/api/links/:id', (req, res) => {
  const { title, description, url, theme, icon } = req.body;
  const sql = `UPDATE links SET title = ?, description = ?, url = ?, theme = ?, icon = ? WHERE id = ?`;

  db.run(sql, [title, description, url, theme, icon, req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Link não encontrado' });
    res.json({ message: 'Link atualizado com sucesso' });
  });
});

// EXCLUIR (Remover um link)
app.delete('/api/links/:id', (req, res) => {
  db.run(`DELETE FROM links WHERE id = ?`, req.params.id, function(err) {
    if (err) return res.status(400).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Link não encontrado' });
    res.json({ message: 'Link excluído com sucesso' });
  });
});

// Inicializar Servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
```

**Para iniciar o servidor:** execute `node server.js` no terminal.

---

## 3. O Painel Administrativo (Frontend)

Este arquivo é a tela onde a TI fará o gerenciamento dos botões, consumindo as rotas que criamos acima.
Crie um arquivo chamado `admin.html` e cole o código abaixo. Para segurança em produção, recomenda-se hospedar este arquivo em um diretório protegido por senha no servidor.

**Código do `admin.html`:**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - Portal de Acessos</title>
  
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 2rem;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    h1, h2 { color: #1e293b; }
    
    /* Formulário */
    .form-card {
      background: #ffffff;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }
    .form-group {
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
    }
    .form-group label {
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    .form-group input, .form-group select, .form-group textarea {
      padding: 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-family: inherit;
      font-size: 1rem;
    }
    .form-group textarea { resize: vertical; min-height: 80px; }
    
    .btn-group {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      font-size: 1rem;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-secondary { background: #64748b; color: #fff; }
    .btn-danger { background: #ef4444; color: #fff; padding: 0.4rem 0.8rem; font-size: 0.875rem; }
    .btn-edit { background: #f59e0b; color: #fff; padding: 0.4rem 0.8rem; font-size: 0.875rem; margin-right: 0.5rem; }

    /* Tabela */
    .table-card {
      background: #ffffff;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th, td {
      padding: 1rem;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
    }
    .icon-preview svg { width: 24px; height: 24px; display: block; }
  </style>
</head>
<body>

  <div class="container">
    <h1>Painel Administrativo</h1>
    
    <!-- Formulário de Cadastro/Edição -->
    <div class="form-card">
      <h2 id="formTitle">Novo Link</h2>
      <form id="linkForm">
        <input type="hidden" id="linkId">
        
        <div class="form-group">
          <label for="title">Título do Sistema</label>
          <input type="text" id="title" required placeholder="Ex: Sistema de Custos">
        </div>
        
        <div class="form-group">
          <label for="description">Descrição</label>
          <input type="text" id="description" required placeholder="Ex: Gestão Financeira">
        </div>
        
        <div class="form-group">
          <label for="url">URL do Sistema</label>
          <input type="url" id="url" required placeholder="http://...">
        </div>
        
        <div class="form-group">
          <label for="theme">Tema (Cor)</label>
          <select id="theme" required>
            <option value="theme-blue">Azul Escuro (TI)</option>
            <option value="theme-sky">Azul Claro (Webmail)</option>
            <option value="theme-teal">Verde Água (Custos)</option>
            <option value="theme-indigo">Índigo (SPDATA)</option>
            <option value="theme-violet">Roxo (DRG)</option>
            <option value="theme-orange">Laranja (Coordenadores)</option>
            <option value="theme-slate">Cinza Escuro (Radiologia)</option>
            <option value="theme-emerald">Verde Esmeralda (Qualidade)</option>
            <option value="theme-rose">Rosa/Vermelho (Compras)</option>
            <option value="theme-amber">Âmbar/Amarelo (Indicadores)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="icon">Ícone (Código SVG)</label>
          <textarea id="icon" required placeholder="<svg>...</svg>"></textarea>
        </div>
        
        <div class="btn-group">
          <button type="submit" class="btn-primary" id="btnSubmit">Salvar Link</button>
          <button type="button" class="btn-secondary" onclick="resetForm()">Cancelar</button>
        </div>
      </form>
    </div>

    <!-- Tabela de Links -->
    <div class="table-card">
      <h2>Links Cadastrados</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Ícone</th>
            <th>Título</th>
            <th>URL</th>
            <th>Tema</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          <!-- Linhas injetadas via JS -->
        </tbody>
      </table>
    </div>
  </div>

  <script>
    const API_URL = 'http://localhost:3000/api/links';
    
    // Carregar dados ao iniciar a página
    document.addEventListener('DOMContentLoaded', fetchLinks);

    // Submissão do formulário
    document.getElementById('linkForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('linkId').value;
      const payload = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        url: document.getElementById('url').value,
        theme: document.getElementById('theme').value,
        icon: document.getElementById('icon').value
      };

      try {
        const method = id ? 'PUT' : 'POST';
        const endpoint = id ? `${API_URL}/${id}` : API_URL;
        
        const res = await fetch(endpoint, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Erro ao salvar os dados.');
        
        resetForm();
        fetchLinks();
        alert('Link salvo com sucesso!');
      } catch (error) {
        console.error(error);
        alert('Falha de conexão. A API está rodando?');
      }
    });

    // Buscar Links e preencher tabela
    async function fetchLinks() {
      try {
        const res = await fetch(API_URL);
        const links = await res.json();
        
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        links.forEach(link => {
          const tr = document.createElement('tr');
          
          tr.innerHTML = `
            <td>${link.id}</td>
            <td class="icon-preview">${link.icon}</td>
            <td><strong>${link.title}</strong><br><small>${link.description}</small></td>
            <td><a href="${link.url}" target="_blank">Acessar</a></td>
            <td><code>${link.theme}</code></td>
            <td>
              <button class="btn-edit" onclick='editLink(${JSON.stringify(link)})'>Editar</button>
              <button class="btn-danger" onclick="deleteLink(${link.id})">Excluir</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      } catch (error) {
        console.error(error);
        document.getElementById('tableBody').innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Erro ao conectar com a API. Certifique-se de que o servidor Node está rodando.</td></tr>`;
      }
    }

    // Preencher formulário para edição
    function editLink(link) {
      document.getElementById('formTitle').innerText = `Editando: ${link.title}`;
      document.getElementById('btnSubmit').innerText = 'Atualizar Link';
      
      document.getElementById('linkId').value = link.id;
      document.getElementById('title').value = link.title;
      document.getElementById('description').value = link.description;
      document.getElementById('url').value = link.url;
      document.getElementById('theme').value = link.theme;
      document.getElementById('icon').value = link.icon;
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Excluir Link
    async function deleteLink(id) {
      if (!confirm('Tem certeza que deseja excluir este link? A página principal não o exibirá mais.')) return;

      try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir.');
        fetchLinks();
      } catch (error) {
        console.error(error);
        alert('Erro ao excluir.');
      }
    }

    // Limpar formulário
    function resetForm() {
      document.getElementById('linkForm').reset();
      document.getElementById('linkId').value = '';
      document.getElementById('formTitle').innerText = 'Novo Link';
      document.getElementById('btnSubmit').innerText = 'Salvar Link';
    }
  </script>
</body>
</html>
```

## Próximos Passos
Após colocar o servidor no ar, o último passo será modificar o arquivo estático original (`index.html`) fornecido anteriormente. Você precisará esvaziar o conteúdo fixo de dentro da tag `<main class="grid-container">` e utilizar a função `fetch('http://localhost:3000/api/links')` do Javascript para criar e injetar os botões no HTML dinamicamente, da mesma forma que fizemos com as linhas da tabela no `admin.html`.