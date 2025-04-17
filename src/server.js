const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/setup');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configuração de sessão
app.use(session({
  secret: 'petstore-admin-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Middleware para verificar autenticação nas rotas de admin
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  // Para requisições API, retornar erro 401
  if (req.path.startsWith('/api/admin')) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  // Para outras requisições, redirecionar para login
  res.redirect('/login');
};

// Route to get all products
app.get('/api/produtos', (req, res) => {
  db.all("SELECT * FROM produtos", [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
    res.json(rows);
  });
});

// Route to get all categories
app.get('/api/categorias', (req, res) => {
  db.all("SELECT nome as categoria FROM categorias", [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
    res.json(rows);
  });
});

// Route to add item to cart
app.post('/api/carrinho', (req, res) => {
  const { produto_id, quantidade, sessao_id } = req.body;
  
  if (!sessao_id || !produto_id || !quantidade) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  // Check if product exists
  db.get("SELECT * FROM produtos WHERE id = ?", [produto_id], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Check if item already exists in cart
    db.get("SELECT * FROM carrinho WHERE produto_id = ? AND sessao_id = ?", 
      [produto_id, sessao_id], (err, cartItem) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao verificar carrinho' });
        }

        if (cartItem) {
          // Update quantity if item already exists
          db.run("UPDATE carrinho SET quantidade = quantidade + ? WHERE id = ?",
            [quantidade, cartItem.id], function(err) {
              if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar carrinho' });
              }
              res.json({ success: true, id: cartItem.id });
            });
        } else {
          // Add new item to cart
          db.run("INSERT INTO carrinho (produto_id, quantidade, sessao_id) VALUES (?, ?, ?)",
            [produto_id, quantidade, sessao_id], function(err) {
              if (err) {
                return res.status(500).json({ error: 'Erro ao adicionar ao carrinho' });
              }
              res.json({ success: true, id: this.lastID });
            });
        }
      });
  });
});

// Route to get cart items
app.get('/api/carrinho/:sessao_id', (req, res) => {
  const { sessao_id } = req.params;

  db.all(`
    SELECT c.id, c.quantidade, p.id as produto_id, p.nome, p.preco, p.imagem_url 
    FROM carrinho c
    JOIN produtos p ON c.produto_id = p.id
    WHERE c.sessao_id = ?
  `, [sessao_id], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Erro ao buscar carrinho' });
    }
    res.json(rows);
  });
});

// Route to update cart item quantity
app.put('/api/carrinho/:id', (req, res) => {
  const { id } = req.params;
  const { quantidade } = req.body;

  if (quantidade <= 0) {
    // Delete item if quantity is zero or negative
    db.run("DELETE FROM carrinho WHERE id = ?", [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao remover item' });
      }
      res.json({ success: true, deleted: true });
    });
  } else {
    // Update quantity
    db.run("UPDATE carrinho SET quantidade = ? WHERE id = ?", 
      [quantidade, id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao atualizar quantidade' });
        }
        res.json({ success: true });
      });
  }
});

// Route to delete cart item
app.delete('/api/carrinho/:id', (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM carrinho WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao remover item' });
    }
    res.json({ success: true });
  });
});

// Início das rotas de Admin

// Rota para login
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Rota para API de login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });
  }

  db.get("SELECT * FROM usuarios WHERE username = ? AND password = ?", 
    [username, password], (err, user) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Erro ao autenticar usuário' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Armazenar informações do usuário na sessão
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.nome = user.nome;
      
      res.json({ success: true, username: user.username, nome: user.nome });
    });
});

// Rota para verificar autenticação
app.get('/api/check-auth', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ 
      authenticated: true,
      username: req.session.username,
      nome: req.session.nome 
    });
  }
  res.status(401).json({ authenticated: false });
});

// Rota para logout
app.get('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
    }
    res.redirect('/login');
  });
});

// Rota para buscar categorias (com autenticação)
app.get('/api/admin/categorias', isAuthenticated, (req, res) => {
  // Consultar a tabela de categorias diretamente
  db.all("SELECT nome as categoria FROM categorias", [], (err, categoriasDaTabela) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
    
    // Também consultar categorias nos produtos para garantir que nenhuma seja perdida
    db.all("SELECT categorias FROM produtos", [], (err, rows) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Erro ao buscar categorias de produtos' });
      }
      
      // Extrair todas as categorias dos produtos
      let categoriasDosProdutos = [];
      rows.forEach(row => {
        try {
          const cats = JSON.parse(row.categorias || '[]');
          categoriasDosProdutos = [...categoriasDosProdutos, ...cats];
        } catch (e) {
          console.error('Erro ao processar categorias:', e);
        }
      });
      
      // Adicionar categorias dos produtos que ainda não existem na tabela categorias
      const categoriasExistentes = new Set(categoriasDaTabela.map(c => c.categoria));
      const novasCategorias = [...new Set(categoriasDosProdutos)].filter(cat => !categoriasExistentes.has(cat));
      
      // Inserir novas categorias encontradas nos produtos na tabela categorias
      if (novasCategorias.length > 0) {
        const stmt = db.prepare("INSERT OR IGNORE INTO categorias (nome) VALUES (?)");
        novasCategorias.forEach(cat => {
          stmt.run(cat);
        });
        stmt.finalize();
        
        // Adicionar as novas categorias ao resultado
        novasCategorias.forEach(cat => {
          categoriasDaTabela.push({ categoria: cat });
        });
      }
      
      // Retornar todas as categorias
      res.json(categoriasDaTabela);
    });
  });
});

// Rota para criar um produto (com autenticação)
app.post('/api/admin/produtos', isAuthenticated, (req, res) => {
  const { nome, preco, descricao, imagem_url, categorias } = req.body;
  
  if (!nome || !preco) {
    return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
  }

  db.run(
    "INSERT INTO produtos (nome, preco, descricao, imagem_url, categorias) VALUES (?, ?, ?, ?, ?)",
    [nome, preco, descricao, imagem_url, JSON.stringify(categorias || [])],
    function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Erro ao criar produto' });
      }
      res.json({ id: this.lastID, nome, preco, descricao, imagem_url, categorias });
    }
  );
});

// Rota para atualizar um produto (com autenticação)
app.put('/api/admin/produtos/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { nome, preco, descricao, imagem_url, categorias } = req.body;
  
  if (!nome || !preco) {
    return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
  }

  db.run(
    "UPDATE produtos SET nome = ?, preco = ?, descricao = ?, imagem_url = ?, categorias = ? WHERE id = ?",
    [nome, preco, descricao, imagem_url, JSON.stringify(categorias || []), id],
    function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Erro ao atualizar produto' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      
      res.json({ id, nome, preco, descricao, imagem_url, categorias });
    }
  );
});

// Rota para deletar um produto (com autenticação)
app.delete('/api/admin/produtos/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;

  // Primeiro removemos o produto de todos os carrinhos
  db.run("DELETE FROM carrinho WHERE produto_id = ?", [id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Erro ao remover produto dos carrinhos' });
    }
    
    // Agora podemos excluir o produto
    db.run("DELETE FROM produtos WHERE id = ?", [id], function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Erro ao deletar produto' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      
      res.json({ success: true });
    });
  });
});

// Rota para adicionar uma nova categoria (com autenticação)
app.post('/api/admin/categorias', isAuthenticated, (req, res) => {
  const { nome } = req.body;
  
  if (!nome) {
    return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
  }

  // Como as categorias são armazenadas como JSON em cada produto, 
  // não precisamos realmente de uma tabela separada, mas vamos manter por organização
  
  // Vamos verificar se a categoria já existe em algum produto
  db.all("SELECT categorias FROM produtos", [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Erro ao verificar produtos' });
    }
    
    // Adicionar a categoria à tabela para referência
    db.run("CREATE TABLE IF NOT EXISTS categorias (nome TEXT PRIMARY KEY)", function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Erro ao configurar tabela de categorias' });
      }

      db.run("INSERT OR IGNORE INTO categorias (nome) VALUES (?)", [nome], function(err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ error: 'Erro ao adicionar categoria' });
        }
        
        // Responder com o formato esperado pelo frontend
        res.json({ 
          success: true, 
          categoria: nome 
        });
      });
    });
  });
});

// Fim das rotas de Admin

// Rota para o painel administrativo (com autenticação)
app.get('/admin', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Serve the main HTML file for all routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Para acessar de outros dispositivos na rede use: http://SEU_IP_LOCAL:${PORT}`);
}); 