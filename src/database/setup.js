const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a new database connection
const dbPath = path.join(__dirname, 'petstore.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      descricao TEXT,
      imagem_url TEXT,
      categorias TEXT
    )
  `);

  // Shopping cart table
  db.run(`
    CREATE TABLE IF NOT EXISTS carrinho (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      sessao_id TEXT NOT NULL,
      FOREIGN KEY (produto_id) REFERENCES produtos (id)
    )
  `);

  // Admin users table
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nome TEXT,
      email TEXT,
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if admin user exists, if not create default admin
  db.get("SELECT COUNT(*) as count FROM usuarios", [], (err, row) => {
    if (err) {
      console.error("Erro ao verificar usuários:", err.message);
      return;
    }

    if (row.count === 0) {
      // Hash padrão para "admin123" - em produção você deve usar bcrypt
      const defaultPassword = "admin123";
      
      db.run("INSERT INTO usuarios (username, password, nome, email) VALUES (?, ?, ?, ?)",
        ["admin", defaultPassword, "Administrador", "admin@petstore.com"],
        function(err) {
          if (err) {
            console.error("Erro ao criar usuário admin:", err.message);
            return;
          }
          console.log("Usuário admin criado com sucesso");
        }
      );
    }
  });

  // Criação da tabela de categorias (só para referência)
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      nome TEXT PRIMARY KEY
    )
  `);
});

module.exports = db; 