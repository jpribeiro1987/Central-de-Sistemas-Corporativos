const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8090;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hsaspd';
const DATA_DIR = process.env.DATA_DIR || __dirname;

// Armazenamento em memória de tokens de sessão válidos
const activeTokens = new Set();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, imagens)
app.use(express.static(path.join(__dirname)));

// Rotas de Páginas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Middleware de Autenticação Administrativa
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (token && (activeTokens.has(token) || token === ADMIN_PASSWORD)) {
    return next();
  }
  return res.status(401).json({ error: 'Não autorizado. Senha de administrador necessária.' });
}

// ==================== ROTAS DE AUTENTICAÇÃO ====================

// Login de Administrador
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Informe a senha de acesso.' });
  }

  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.add(token);
    return res.json({ success: true, message: 'Autenticado com sucesso.', token });
  }

  return res.status(401).json({ error: 'Senha incorreta. Tente novamente.' });
});

// Validação de Sessão
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (token && (activeTokens.has(token) || token === ADMIN_PASSWORD)) {
    return res.json({ valid: true });
  }
  return res.status(401).json({ valid: false });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    activeTokens.delete(token);
  }
  return res.json({ success: true, message: 'Sessão encerrada.' });
});

// ==================== BANCO DE DADOS ====================

const dbPath = path.join(DATA_DIR, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log(`Conectado ao banco de dados SQLite em: ${dbPath}`);
    initDB();
  }
});

// Criação das tabelas e Carga Inicial
function initDB() {
  // 1. Tabela de Links
  db.run(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    theme TEXT NOT NULL,
    icon TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Erro ao criar tabela links:', err.message);
      return;
    }

    db.get('SELECT COUNT(*) as count FROM links', (err, row) => {
      if (err) {
        console.error('Erro ao verificar registros:', err.message);
        return;
      }

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
        stmt.finalize((err) => {
          if (err) console.error('Erro na carga inicial de links:', err.message);
          else console.log('Carga inicial de 10 links concluída com sucesso!');
        });
      }
    });
  });

  // 2. Tabela de Escala de Plantão TI
  db.run(`CREATE TABLE IF NOT EXISTS plantao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    technician TEXT NOT NULL,
    phone TEXT,
    period TEXT,
    secondary TEXT,
    notes TEXT,
    active INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Erro ao criar tabela plantao:', err.message);
      return;
    }

    db.get('SELECT COUNT(*) as count FROM plantao', (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('Inserindo plantão padrão da T.I...');
        db.run(
          `INSERT INTO plantao (technician, phone, period, secondary, notes, active) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            'Plantão T.I. Hospitalar',
            '(38) 99999-0000',
            'Plantão Noturno e Fins de Semana',
            'Ramal Interno 253',
            'Acionamento exclusivo para urgências e sistemas assistenciais',
            1
          ]
        );
      }
    });
  });
}

// ==================== ROTAS DE ESCALA DE PLANTÃO ====================

// LER Plantão Ativo (Público - para exibição no portal)
app.get('/api/plantao', (req, res) => {
  db.get('SELECT * FROM plantao ORDER BY id DESC LIMIT 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      return res.json({
        active: 0,
        technician: 'Nenhum plantonista configurado',
        phone: '',
        period: '',
        secondary: '',
        notes: ''
      });
    }
    res.json(row);
  });
});

// ATUALIZAR Plantão (Protegido por Senha)
app.put('/api/plantao', requireAdminAuth, (req, res) => {
  const { technician, phone, period, secondary, notes, active } = req.body;

  if (!technician) {
    return res.status(400).json({ error: 'O nome do plantonista é obrigatório.' });
  }

  const isActive = active === false || active === 0 ? 0 : 1;

  db.get('SELECT id FROM plantao ORDER BY id DESC LIMIT 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row) {
      const sql = `UPDATE plantao SET 
        technician = ?, 
        phone = ?, 
        period = ?, 
        secondary = ?, 
        notes = ?, 
        active = ?, 
        updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`;

      db.run(sql, [technician, phone || '', period || '', secondary || '', notes || '', isActive, row.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Escala de plantão atualizada com sucesso!' });
      });
    } else {
      const sql = `INSERT INTO plantao (technician, phone, period, secondary, notes, active) VALUES (?, ?, ?, ?, ?, ?)`;
      db.run(sql, [technician, phone || '', period || '', secondary || '', notes || '', isActive], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Escala de plantão cadastrada com sucesso!' });
      });
    }
  });
});

// ==================== ROTAS DE CRUD DE LINKS ====================

// LER (Listar todos os links - Rota pública para carregar o portal)
app.get('/api/links', (req, res) => {
  db.all('SELECT * FROM links ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CRIAR (Adicionar novo link - Protegido por Senha)
app.post('/api/links', requireAdminAuth, (req, res) => {
  const { title, description, url, theme, icon } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: 'Título e URL são obrigatórios.' });
  }
  const sql = `INSERT INTO links (title, description, url, theme, icon) VALUES (?, ?, ?, ?, ?)`;
  
  db.run(sql, [title, description || '', url, theme || 'theme-blue', icon || ''], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.status(201).json({ id: this.lastID, title, description, url, theme, icon });
  });
});

// EDITAR (Atualizar link existente - Protegido por Senha)
app.put('/api/links/:id', requireAdminAuth, (req, res) => {
  const { title, description, url, theme, icon } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: 'Título e URL são obrigatórios.' });
  }
  const sql = `UPDATE links SET title = ?, description = ?, url = ?, theme = ?, icon = ? WHERE id = ?`;

  db.run(sql, [title, description || '', url, theme || 'theme-blue', icon || '', req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Link não encontrado' });
    res.json({ message: 'Link atualizado com sucesso' });
  });
});

// EXCLUIR (Remover um link - Protegido por Senha)
app.delete('/api/links/:id', requireAdminAuth, (req, res) => {
  db.run(`DELETE FROM links WHERE id = ?`, req.params.id, function(err) {
    if (err) return res.status(400).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Link não encontrado' });
    res.json({ message: 'Link excluído com sucesso' });
  });
});

// Inicializar Servidor
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` Servidor Portal HSA Ativo!`);
  console.log(` Portal Principal:       http://localhost:${PORT}`);
  console.log(` Painel Administrativo:  http://localhost:${PORT}/admin`);
  console.log(` Senha do Admin:        ${ADMIN_PASSWORD}`);
  console.log(` API Endpoint:          http://localhost:${PORT}/api/links`);
  console.log(` API Plantão:           http://localhost:${PORT}/api/plantao`);
  console.log(`======================================================\n`);
});
