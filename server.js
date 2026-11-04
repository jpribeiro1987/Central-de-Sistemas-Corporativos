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

// Helper de Data Local (Horário de Brasília UTC-3)
function getTodayLocalDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now); // Retorna 'YYYY-MM-DD'
}

// Formatar data 'YYYY-MM-DD' para 'DD/MM/YYYY'
function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Calcular diferença em dias entre duas datas (YYYY-MM-DD)
function calculateDaysDiff(date1Str, date2Str) {
  if (!date1Str || !date2Str) return 0;
  const d1 = new Date(date1Str + 'T00:00:00');
  const d2 = new Date(date2Str + 'T00:00:00');
  const diffMs = d2 - d1;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Determinar status do plantão em relação à data atual
function calculateShiftStatus(shift, todayStr) {
  if (shift.active === 0 || shift.active === false) return 'inativo';
  if (!shift.start_date || !shift.end_date) return 'vigente';
  
  if (todayStr >= shift.start_date && todayStr <= shift.end_date) {
    return 'vigente';
  } else if (todayStr < shift.start_date) {
    return 'agendado';
  } else {
    return 'vencido';
  }
}

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

  // 2. Tabela de Escala de Plantão TI com Suporte a Período de Datas
  db.run(`CREATE TABLE IF NOT EXISTS plantao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    technician TEXT NOT NULL,
    phone TEXT,
    start_date TEXT,
    end_date TEXT,
    period TEXT,
    secondary TEXT,
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Erro ao criar tabela plantao:', err.message);
      return;
    }

    // Migração de schema: adicionar colunas start_date, end_date e created_at caso não existam
    db.all('PRAGMA table_info(plantao)', (err, columns) => {
      if (!err && columns) {
        const colNames = columns.map(c => c.name);
        if (!colNames.includes('start_date')) {
          db.run('ALTER TABLE plantao ADD COLUMN start_date TEXT');
        }
        if (!colNames.includes('end_date')) {
          db.run('ALTER TABLE plantao ADD COLUMN end_date TEXT');
        }
        if (!colNames.includes('created_at')) {
          db.run('ALTER TABLE plantao ADD COLUMN created_at DATETIME');
        }

        // Se houver registro legado sem start_date/end_date, configurar com base no período atual
        db.get('SELECT id, technician, start_date, end_date FROM plantao ORDER BY id ASC LIMIT 1', (err, row) => {
          if (!err && row && (!row.start_date || !row.end_date)) {
            db.run(`UPDATE plantao SET start_date = '2026-11-03', end_date = '2026-11-10' WHERE id = ?`, [row.id]);
          }
        });
      }
    });

    db.get('SELECT COUNT(*) as count FROM plantao', (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('Inserindo plantão padrão da T.I...');
        const today = getTodayLocalDate();
        db.run(
          `INSERT INTO plantao (technician, phone, start_date, end_date, period, secondary, notes, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'Plantão T.I. Hospitalar',
            '(38) 99999-0000',
            today,
            today,
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

// LER Plantão Ativo de Hoje (Público - para exibição no portal principal)
// Seleciona automaticamente o plantonista da data atual!
app.get('/api/plantao', (req, res) => {
  const today = getTodayLocalDate();

  // 1. Buscar plantão ativo onde a data de hoje está entre o início e o fim (inclusive)
  const sqlCurrent = `SELECT * FROM plantao 
    WHERE active = 1 
      AND (start_date IS NULL OR start_date <= ?) 
      AND (end_date IS NULL OR end_date >= ?)
    ORDER BY 
      CASE WHEN start_date IS NOT NULL THEN start_date ELSE '1970-01-01' END DESC,
      id DESC 
    LIMIT 1`;

  db.get(sqlCurrent, [today, today], (err, current) => {
    if (err) return res.status(500).json({ error: err.message });

    // Buscar o próximo plantão agendado futuro
    const sqlNext = `SELECT * FROM plantao 
      WHERE active = 1 AND start_date > ? 
      ORDER BY start_date ASC, id ASC 
      LIMIT 1`;

    db.get(sqlNext, [today], (errNext, nextPlantao) => {
      if (errNext) console.error('Erro ao buscar próximo plantão:', errNext);

      if (current) {
        const daysRemaining = current.end_date ? calculateDaysDiff(today, current.end_date) : null;
        return res.json({
          ...current,
          active: 1,
          is_current: true,
          today,
          status: 'vigente',
          days_remaining: daysRemaining,
          next: nextPlantao || null
        });
      }

      // Se nenhum plantão está vigente hoje (expirou ou não agendado para hoje)
      return res.json({
        active: 0,
        is_current: false,
        today,
        technician: nextPlantao ? `Próximo: ${nextPlantao.technician}` : 'Nenhum plantonista em escala hoje',
        phone: nextPlantao ? nextPlantao.phone : '',
        period: nextPlantao ? `Início em ${formatDateBR(nextPlantao.start_date)}` : '',
        secondary: '',
        notes: nextPlantao 
          ? `Plantão anterior encerrado. Próximo início previsto para ${formatDateBR(nextPlantao.start_date)}. Em emergências, acione o Ramal 253.`
          : 'Nenhum plantão ativo no momento. Em emergências, contate a Coordenação de T.I. no Ramal 253.',
        status: 'sem_escala',
        next: nextPlantao || null
      });
    });
  });
});

// LISTAR Todas as Escalas de Plantão (Pública/Admin - com status de cada uma)
app.get('/api/plantoes', (req, res) => {
  const today = getTodayLocalDate();
  const sql = `SELECT * FROM plantao ORDER BY 
    CASE 
      WHEN active = 1 AND (start_date IS NULL OR start_date <= '${today}') AND (end_date IS NULL OR end_date >= '${today}') THEN 1
      WHEN active = 1 AND start_date > '${today}' THEN 2
      WHEN active = 1 AND end_date < '${today}' THEN 3
      ELSE 4
    END ASC,
    start_date DESC,
    id DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const items = rows.map(row => {
      const status = calculateShiftStatus(row, today);
      const daysRemaining = row.end_date ? calculateDaysDiff(today, row.end_date) : null;
      const daysUntilStart = row.start_date ? calculateDaysDiff(today, row.start_date) : null;
      return {
        ...row,
        status,
        days_remaining: daysRemaining,
        days_until_start: daysUntilStart
      };
    });

    res.json({
      today,
      total: items.length,
      current_count: items.filter(i => i.status === 'vigente').length,
      scheduled_count: items.filter(i => i.status === 'agendado').length,
      expired_count: items.filter(i => i.status === 'vencido').length,
      inactive_count: items.filter(i => i.status === 'inativo').length,
      items
    });
  });
});

// CRIAR Nova Escala de Plantão (Protegido por Senha)
app.post('/api/plantao', requireAdminAuth, (req, res) => {
  const { technician, phone, start_date, end_date, period, secondary, notes, active } = req.body;

  if (!technician || !technician.trim()) {
    return res.status(400).json({ error: 'O nome do técnico plantonista é obrigatório.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'O telefone/WhatsApp de contato é obrigatório.' });
  }
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'As datas de início e fim do plantão são obrigatórias.' });
  }
  if (start_date > end_date) {
    return res.status(400).json({ error: 'A data de início não pode ser maior que a data de término.' });
  }

  const isActive = active === false || active === 0 ? 0 : 1;
  const formattedPeriod = period && period.trim() ? period.trim() : `${formatDateBR(start_date)} a ${formatDateBR(end_date)}`;

  const sql = `INSERT INTO plantao (technician, phone, start_date, end_date, period, secondary, notes, active, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

  db.run(sql, [technician.trim(), phone.trim(), start_date, end_date, formattedPeriod, secondary ? secondary.trim() : '', notes ? notes.trim() : '', isActive], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      success: true,
      id: this.lastID,
      message: 'Escala de plantão cadastrada com sucesso!'
    });
  });
});

// ATUALIZAR Plantão por ID (Protegido por Senha)
app.put('/api/plantao/:id', requireAdminAuth, (req, res) => {
  const { technician, phone, start_date, end_date, period, secondary, notes, active } = req.body;
  const id = req.params.id;

  if (!technician || !technician.trim()) {
    return res.status(400).json({ error: 'O nome do técnico plantonista é obrigatório.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'O telefone/WhatsApp de contato é obrigatório.' });
  }
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'As datas de início e fim do plantão são obrigatórias.' });
  }
  if (start_date > end_date) {
    return res.status(400).json({ error: 'A data de início não pode ser maior que a data de término.' });
  }

  const isActive = active === false || active === 0 ? 0 : 1;
  const formattedPeriod = period && period.trim() ? period.trim() : `${formatDateBR(start_date)} a ${formatDateBR(end_date)}`;

  const sql = `UPDATE plantao SET 
    technician = ?, 
    phone = ?, 
    start_date = ?, 
    end_date = ?, 
    period = ?, 
    secondary = ?, 
    notes = ?, 
    active = ?, 
    updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?`;

  db.run(sql, [technician.trim(), phone.trim(), start_date, end_date, formattedPeriod, secondary ? secondary.trim() : '', notes ? notes.trim() : '', isActive, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Plantão não encontrado.' });
    res.json({ success: true, message: 'Escala de plantão atualizada com sucesso!' });
  });
});

// ATUALIZAR Plantão Genérico (Compatibilidade com chamadas sem :id)
app.put('/api/plantao', requireAdminAuth, (req, res) => {
  const { id, technician, phone, start_date, end_date, period, secondary, notes, active } = req.body;

  if (!technician) {
    return res.status(400).json({ error: 'O nome do plantonista é obrigatório.' });
  }

  const isActive = active === false || active === 0 ? 0 : 1;
  const targetId = id || null;

  const doUpdate = (plantaoId) => {
    const formattedPeriod = period && period.trim() ? period.trim() : (start_date && end_date ? `${formatDateBR(start_date)} a ${formatDateBR(end_date)}` : '');
    const sql = `UPDATE plantao SET 
      technician = ?, 
      phone = ?, 
      start_date = COALESCE(?, start_date), 
      end_date = COALESCE(?, end_date), 
      period = ?, 
      secondary = ?, 
      notes = ?, 
      active = ?, 
      updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?`;

    db.run(sql, [technician, phone || '', start_date || null, end_date || null, formattedPeriod, secondary || '', notes || '', isActive, plantaoId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Escala de plantão atualizada com sucesso!' });
    });
  };

  if (targetId) {
    doUpdate(targetId);
  } else {
    db.get('SELECT id FROM plantao ORDER BY id DESC LIMIT 1', [], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        doUpdate(row.id);
      } else {
        const today = getTodayLocalDate();
        const sql = `INSERT INTO plantao (technician, phone, start_date, end_date, period, secondary, notes, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [technician, phone || '', start_date || today, end_date || today, period || '', secondary || '', notes || '', isActive], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message: 'Escala de plantão cadastrada com sucesso!' });
        });
      }
    });
  }
});

// EXCLUIR Escala de Plantão (Protegido por Senha)
app.delete('/api/plantao/:id', requireAdminAuth, (req, res) => {
  db.run(`DELETE FROM plantao WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Plantão não encontrado.' });
    res.json({ success: true, message: 'Escala de plantão excluída com sucesso!' });
  });
});

// ALTERAR Status Ativo/Inativo do Plantão (Protegido por Senha)
app.patch('/api/plantao/:id/toggle', requireAdminAuth, (req, res) => {
  db.run(`UPDATE plantao SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Plantão não encontrado.' });
    res.json({ success: true, message: 'Status do plantão alterado com sucesso!' });
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
  console.log(` API Plantão (Hoje):    http://localhost:${PORT}/api/plantao`);
  console.log(` API Plantões (Lista):  http://localhost:${PORT}/api/plantoes`);
  console.log(`======================================================\n`);
});
