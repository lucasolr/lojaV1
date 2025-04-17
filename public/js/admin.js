document.addEventListener('DOMContentLoaded', function() {
    // Variáveis globais
    let produtos = [];
    let categorias = [];
    let produtoModal;
    let categoriaModal;

    // Inicialização
    function init() {
        // Inicializar os modais Bootstrap
        produtoModal = new bootstrap.Modal(document.getElementById('produtoModal'));
        categoriaModal = new bootstrap.Modal(document.getElementById('categoriaModal'));
        
        // Configurar navegação
        setupNavigation();
        
        // Carregar dados iniciais
        loadProdutos();
        loadCategorias();
        
        // Setup event listeners
        setupEventListeners();
    }

    // Navegação entre seções
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Skip if link is external
                if (this.getAttribute('target') === '_blank') return;
                
                // Remover classe ativa de todos os links
                navLinks.forEach(l => l.classList.remove('active'));
                
                // Adicionar classe ativa ao link clicado
                this.classList.add('active');
                
                // Mostrar seção correspondente
                const sectionId = this.getAttribute('data-section');
                const sections = document.querySelectorAll('.section-content');
                
                sections.forEach(section => {
                    section.classList.remove('active');
                });
                
                document.getElementById(sectionId).classList.add('active');
            });
        });
    }

    // Carregar produtos da API
    function loadProdutos() {
        fetch('http://108.181.223.53:3000/api/produtos')
            .then(response => response.json())
            .then(data => {
                produtos = data;
                updateProdutosTable();
                updateDashboard();
            })
            .catch(error => console.error('Erro ao carregar produtos:', error));
    }

    // Carregar categorias da API
    function loadCategorias() {
        fetch('http://108.181.223.53:3000/api/admin/categorias')
            .then(response => response.json())
            .then(data => {
                categorias = data;
                updateCategoriasList();
                updateProdutoCategorias();
                updateDashboard();
            })
            .catch(error => console.error('Erro ao carregar categorias:', error));
    }

    // Atualizar tabela de produtos
    function updateProdutosTable() {
        const tableBody = document.getElementById('produtos-table');
        tableBody.innerHTML = '';
        
        if (produtos.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center py-4">
                    <div class="text-muted mb-3">
                        <i class="bi bi-box-seam" style="font-size: 2rem;"></i>
                        <p class="mt-2">Nenhum produto cadastrado</p>
                    </div>
                    <button class="btn btn-primary btn-sm" id="empty-add-produto-btn">
                        <i class="bi bi-plus-circle"></i> Adicionar Produto
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
            
            // Adicionar event listener para o botão de adicionar
            document.getElementById('empty-add-produto-btn').addEventListener('click', function() {
                resetProdutoForm();
                document.getElementById('produtoModalLabel').textContent = 'Adicionar Produto';
                produtoModal.show();
            });
            
            return;
        }
        
        produtos.forEach(produto => {
            const row = document.createElement('tr');
            
            // Converter string JSON para array, se necessário
            let categoriasArray = [];
            if (produto.categorias) {
                try {
                    categoriasArray = typeof produto.categorias === 'string' ? 
                        JSON.parse(produto.categorias) : produto.categorias;
                } catch (e) {
                    console.error('Erro ao parsear categorias:', e);
                }
            }
            
            // Formatar categorias como pills
            const categoriasHtml = categoriasArray.map(cat => 
                `<span class="categoria-pill">${cat}</span>`
            ).join('');
            
            row.innerHTML = `
                <td>${produto.id}</td>
                <td><img src="${produto.imagem_url || 'https://placehold.co/100x100?text=Sem+Imagem'}" alt="${produto.nome}"></td>
                <td>${produto.nome}</td>
                <td>R$ ${parseFloat(produto.preco).toFixed(2)}</td>
                <td>${categoriasHtml}</td>
                <td>
                    <button class="btn btn-sm btn-primary btn-action edit-btn" data-id="${produto.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-action delete-btn" data-id="${produto.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Adicionar event listeners para os botões de editar e deletar
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editProduto(id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteProduto(id);
            });
        });
    }

    // Atualizar lista de categorias
    function updateCategoriasList() {
        const list = document.getElementById('categorias-list');
        list.innerHTML = '';
        
        if (categorias.length === 0) {
            list.innerHTML = '<li class="list-group-item text-center text-muted">Nenhuma categoria cadastrada</li>';
            return;
        }
        
        categorias.forEach(categoria => {
            // Contar quantos produtos usam esta categoria
            const produtosComCategoria = produtos.filter(p => {
                try {
                    const cats = typeof p.categorias === 'string' ? 
                        JSON.parse(p.categorias) : p.categorias;
                    return cats.includes(categoria.categoria);
                } catch (e) {
                    return false;
                }
            }).length;
            
            const item = document.createElement('li');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <span class="badge bg-primary rounded-pill me-2">${produtosComCategoria}</span>
                    <span>${categoria.categoria}</span>
                </div>
                <button class="btn btn-sm btn-danger delete-categoria-btn" data-categoria="${categoria.categoria}">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            
            list.appendChild(item);
        });
        
        // Adicionar event listeners para os botões de deletar categoria
        document.querySelectorAll('.delete-categoria-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const categoria = this.getAttribute('data-categoria');
                if (confirm(`Tem certeza que deseja excluir a categoria "${categoria}"?`)) {
                    // Verificar se a categoria está sendo usada por algum produto
                    const produtosComCategoria = produtos.filter(p => {
                        try {
                            const cats = typeof p.categorias === 'string' ? 
                                JSON.parse(p.categorias) : p.categorias;
                            return cats.includes(categoria);
                        } catch (e) {
                            return false;
                        }
                    });
                    
                    if (produtosComCategoria.length > 0) {
                        if (confirm(`Esta categoria está sendo usada por ${produtosComCategoria.length} produto(s). Deseja removê-la de todos esses produtos?`)) {
                            // Remover a categoria de todos os produtos
                            removerCategoriaDosProdutos(categoria);
                        }
                    } else {
                        // Remover a categoria da lista
                        removerCategoria(categoria);
                    }
                }
            });
        });
    }

    // Remover categoria da lista
    function removerCategoria(categoria) {
        // Atualizar a lista local
        categorias = categorias.filter(c => c.categoria !== categoria);
        
        // Atualizar a interface
        updateCategoriasList();
        updateProdutoCategorias();
        updateDashboard();
    }

    // Remover categoria de todos os produtos
    function removerCategoriaDosProdutos(categoria) {
        // Contador para requests concluídos
        let completedRequests = 0;
        const produtosAAtualizar = produtos.filter(p => {
            try {
                const cats = typeof p.categorias === 'string' ? 
                    JSON.parse(p.categorias) : p.categorias;
                return cats.includes(categoria);
            } catch (e) {
                return false;
            }
        });
        
        if (produtosAAtualizar.length === 0) {
            removerCategoria(categoria);
            return;
        }
        
        produtosAAtualizar.forEach(produto => {
            try {
                let cats = typeof produto.categorias === 'string' ? 
                    JSON.parse(produto.categorias) : produto.categorias;
                
                // Remover a categoria
                cats = cats.filter(c => c !== categoria);
                
                // Atualizar o produto
                fetch(`http://108.181.223.53:3000/api/admin/produtos/${produto.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...produto,
                        categorias: cats
                    })
                })
                .then(() => {
                    completedRequests++;
                    if (completedRequests === produtosAAtualizar.length) {
                        loadProdutos();
                        removerCategoria(categoria);
                    }
                })
                .catch(error => console.error('Erro ao atualizar produto:', error));
            } catch (e) {
                console.error('Erro ao processar categorias:', e);
                completedRequests++;
            }
        });
    }

    // Atualizar checkboxes de categorias no modal de produto
    function updateProdutoCategorias() {
        const container = document.getElementById('produto-categorias-container');
        container.innerHTML = '';
        
        if (categorias.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhuma categoria cadastrada. Adicione categorias primeiro.</p>';
            return;
        }
        
        categorias.forEach(categoria => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input categoria-checkbox" type="checkbox" 
                       id="cat-${categoria.categoria}" value="${categoria.categoria}">
                <label class="form-check-label" for="cat-${categoria.categoria}">
                    ${categoria.categoria}
                </label>
            `;
            
            container.appendChild(div);
        });
    }

    // Atualizar dashboard
    function updateDashboard() {
        document.getElementById('total-produtos').textContent = produtos.length;
        document.getElementById('total-categorias').textContent = categorias.length;
        
        // Verifica se há produtos ou categorias
        if (produtos.length === 0 && categorias.length === 0) {
            // Adicionar uma mensagem de boas vindas ao painel
            const dashboardContent = document.getElementById('dashboard');
            if (!document.getElementById('welcome-message')) {
                const welcomeMsg = document.createElement('div');
                welcomeMsg.id = 'welcome-message';
                welcomeMsg.className = 'alert alert-info mt-4';
                welcomeMsg.innerHTML = `
                    <h4 class="alert-heading"><i class="bi bi-info-circle"></i> Bem-vindo ao Painel Admin!</h4>
                    <p>Seu painel administrativo está pronto para uso. Para começar:</p>
                    <ol>
                        <li>Adicione algumas <a href="#" class="alert-link" id="go-to-categorias">categorias</a> para seus produtos</li>
                        <li>Em seguida, cadastre seus <a href="#" class="alert-link" id="go-to-produtos">produtos</a> atribuindo as categorias criadas</li>
                    </ol>
                    <hr>
                    <p class="mb-0">Os produtos e categorias cadastrados serão exibidos na loja para seus clientes.</p>
                `;
                dashboardContent.appendChild(welcomeMsg);
                
                // Adicionar event listeners para os links
                document.getElementById('go-to-categorias').addEventListener('click', function(e) {
                    e.preventDefault();
                    document.querySelector('.nav-link[data-section="categorias"]').click();
                });
                
                document.getElementById('go-to-produtos').addEventListener('click', function(e) {
                    e.preventDefault();
                    document.querySelector('.nav-link[data-section="produtos"]').click();
                });
            }
        } else if (document.getElementById('welcome-message')) {
            document.getElementById('welcome-message').remove();
        }
        
        // Contagem de produtos em promoção
        let promocoes = 0;
        produtos.forEach(produto => {
            let cats = [];
            try {
                cats = typeof produto.categorias === 'string' ? 
                    JSON.parse(produto.categorias) : produto.categorias;
            } catch (e) {
                console.error('Erro ao parsear categorias:', e);
            }
            
            if (cats.includes('promocoes')) {
                promocoes++;
            }
        });
        
        document.getElementById('produtos-promocao').textContent = promocoes;
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Botão Adicionar Produto
        document.getElementById('add-produto-btn').addEventListener('click', function() {
            resetProdutoForm();
            document.getElementById('produtoModalLabel').textContent = 'Adicionar Produto';
            produtoModal.show();
        });
        
        // Form de Produto
        document.getElementById('produto-form').addEventListener('submit', function(e) {
            e.preventDefault();
            saveProduto();
        });
        
        // Form de Categoria
        document.getElementById('categoria-form').addEventListener('submit', function(e) {
            e.preventDefault();
            saveCategoria();
        });
    }

    // Resetar form de produto
    function resetProdutoForm() {
        document.getElementById('produto-id').value = '';
        document.getElementById('produto-nome').value = '';
        document.getElementById('produto-preco').value = '';
        document.getElementById('produto-descricao').value = '';
        document.getElementById('produto-imagem').value = '';
        
        // Desmarcar todas as checkboxes
        document.querySelectorAll('.categoria-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    // Preparar modal para edição
    function editProduto(id) {
        const produto = produtos.find(p => p.id == id);
        if (!produto) return;
        
        document.getElementById('produtoModalLabel').textContent = 'Editar Produto';
        document.getElementById('produto-id').value = produto.id;
        document.getElementById('produto-nome').value = produto.nome;
        document.getElementById('produto-preco').value = produto.preco;
        document.getElementById('produto-descricao').value = produto.descricao || '';
        document.getElementById('produto-imagem').value = produto.imagem_url || '';
        
        // Marcar categorias do produto
        let produtoCategorias = [];
        try {
            produtoCategorias = typeof produto.categorias === 'string' ? 
                JSON.parse(produto.categorias) : produto.categorias;
        } catch (e) {
            console.error('Erro ao parsear categorias:', e);
        }
        
        document.querySelectorAll('.categoria-checkbox').forEach(checkbox => {
            checkbox.checked = produtoCategorias.includes(checkbox.value);
        });
        
        produtoModal.show();
    }

    // Salvar produto (criar ou atualizar)
    function saveProduto() {
        const id = document.getElementById('produto-id').value;
        const nome = document.getElementById('produto-nome').value;
        const preco = document.getElementById('produto-preco').value;
        const descricao = document.getElementById('produto-descricao').value;
        const imagem_url = document.getElementById('produto-imagem').value;
        
        // Coletar categorias selecionadas
        const categoriasChecked = Array.from(document.querySelectorAll('.categoria-checkbox:checked'))
            .map(checkbox => checkbox.value);
        
        const produto = {
            nome,
            preco: parseFloat(preco),
            descricao,
            imagem_url,
            categorias: categoriasChecked
        };
        
        const url = id ? `http://108.181.223.53:3000/api/admin/produtos/${id}` : 'http://108.181.223.53:3000/api/admin/produtos';
        const method = id ? 'PUT' : 'POST';
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(produto)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao salvar produto');
            }
            return response.json();
        })
        .then(() => {
            produtoModal.hide();
            loadProdutos(); // Recarregar produtos
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao salvar produto: ' + error.message);
        });
    }

    // Deletar produto
    function deleteProduto(id) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        
        fetch(`/api/admin/produtos/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Erro ao deletar produto');
                });
            }
            return response.json();
        })
        .then(() => {
            loadProdutos(); // Recarregar produtos
        })
        .catch(error => {
            console.error('Erro:', error);
            alert(error.message);
        });
    }

    // Salvar categoria
    function saveCategoria() {
        const nome = document.getElementById('categoria-nome').value;
        
        if (!nome) return;
        
        fetch('http://108.181.223.53:3000/api/admin/categorias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nome })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Erro ao salvar categoria');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Categoria adicionada:', data);
            document.getElementById('categoria-nome').value = '';
            categoriaModal.hide(); // Fechar o modal após adicionar
            loadCategorias(); // Recarregar categorias
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao salvar categoria: ' + error.message);
        });
    }

    // Inicializar a aplicação
    init();
}); 