// Main JavaScript for Pet Ração website

// Global variables
let products = [];
let cart = [];
let categories = [];
let currentCategory = 'todos';
const sessionId = generateSessionId();

// DOM elements
const productsContainer = document.getElementById('products-container');
const cartButton = document.getElementById('cart-button');
const cartModal = document.getElementById('cart-modal');
const closeCartButton = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartCountElement = document.getElementById('cart-count');
const cartTotalElement = document.getElementById('cart-total');
const checkoutButton = document.getElementById('checkout-button');
const emptyCartMessage = document.getElementById('empty-cart-message');
const categoryFiltersContainer = document.querySelector('.flex.flex-wrap.justify-center.mb-8.gap-2');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Fetch categories from the API
    fetchCategories();
    
    // Fetch products from the API
    fetchProducts();
    
    // Fetch cart items if there are any
    fetchCart();
    
    // Setup event listeners
    setupEventListeners();
});

// Generate a unique session ID for the cart
function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Fetch categories from the API
async function fetchCategories() {
    try {
        const response = await fetch('http://108.181.223.53:3000/api/categorias');
        categories = await response.json();
        renderCategoryFilters();
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Fetch products from the API
async function fetchProducts() {
    try {
        const response = await fetch('http://108.181.223.53:3000/api/produtos');
        products = await response.json();
        
        // Parse categorias JSON string to array if it's stored as string
        products = products.map(product => {
            if (typeof product.categorias === 'string') {
                try {
                    product.categorias = JSON.parse(product.categorias);
                } catch (e) {
                    product.categorias = [];
                }
            }
            return product;
        });
        
        renderProducts();
    } catch (error) {
        console.error('Error fetching products:', error);
        productsContainer.innerHTML = `<p class="col-span-full text-center text-red-500">Erro ao carregar produtos. Por favor, tente novamente mais tarde.</p>`;
    }
}

// Filter products by category
function filterProducts() {
    if (currentCategory === 'todos') {
        return products;
    }
    
    return products.filter(product => 
        product.categorias && 
        product.categorias.includes(currentCategory)
    );
}

// Render products in the container
function renderProducts() {
    const filteredProducts = filterProducts();
    
    if (!filteredProducts.length) {
        productsContainer.innerHTML = `<p class="col-span-full text-center">Nenhum produto disponível nesta categoria.</p>`;
        return;
    }
    
    productsContainer.innerHTML = filteredProducts.map(product => `
        <div class="product-card bg-white rounded-lg shadow-md overflow-hidden">
            <div class="product-image-container bg-gray-50">
                <img src="${product.imagem_url}" alt="${product.nome}" class="product-image">
            </div>
            <div class="p-4">
                <h4 class="text-lg font-semibold mb-2 text-pet-orange">${product.nome}</h4>
                <p class="text-gray-600 text-sm mb-3">${product.descricao}</p>
                ${product.categorias.includes('promocoes') ? 
                    `<div class="mb-2"><span class="bg-pet-yellow text-pet-orange text-xs font-bold px-2 py-1 rounded-full">Promoção</span></div>` : ''}
                <div class="flex justify-between items-center">
                    <span class="text-xl font-bold text-pet-orange">R$ ${product.preco.toFixed(2)}</span>
                    <button 
                        class="add-to-cart-btn text-white px-3 py-1 rounded transition duration-200"
                        data-id="${product.id}"
                    >
                        <i class="fas fa-plus mr-1"></i> Adicionar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to the "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', () => {
            const productId = parseInt(button.getAttribute('data-id'));
            addToCart(productId);
        });
    });
}

// Fetch cart items from the API
async function fetchCart() {
    try {
        const response = await fetch(`http://108.181.223.53:3000/api/carrinho/${sessionId}`);
        cart = await response.json();
        updateCartUI();
    } catch (error) {
        console.error('Error fetching cart:', error);
    }
}

// Add a product to the cart
async function addToCart(productId) {
    try {
        const response = await fetch('http://108.181.223.53:3000/api/carrinho', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                produto_id: productId,
                quantidade: 1,
                sessao_id: sessionId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Animation for the added product
            const productCard = document.querySelector(`.add-to-cart-btn[data-id="${productId}"]`).closest('.product-card');
            productCard.classList.add('bg-pet-yellow-light');
            
            // Animation for cart icon
            const cartIcon = document.querySelector('#cart-button i');
            cartIcon.classList.add('animate-bounce');
            
            setTimeout(() => {
                productCard.classList.remove('bg-pet-yellow-light');
                cartIcon.classList.remove('animate-bounce');
            }, 700);
            
            // Refresh cart
            fetchCart();
        }
    } catch (error) {
        console.error('Error adding product to cart:', error);
    }
}

// Update cart item quantity
async function updateCartItemQuantity(cartItemId, newQuantity) {
    try {
        const response = await fetch(`http://108.181.223.53:3000/api/carrinho/${cartItemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quantidade: newQuantity
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            fetchCart();
        }
    } catch (error) {
        console.error('Error updating cart item:', error);
    }
}

// Remove an item from the cart
async function removeCartItem(cartItemId) {
    try {
        const response = await fetch(`http://108.181.223.53:3000/api/carrinho/${cartItemId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            fetchCart();
        }
    } catch (error) {
        console.error('Error removing cart item:', error);
    }
}

// Update the cart UI (count, items, total)
function updateCartUI() {
    // Update cart count
    const cartCount = cart.reduce((total, item) => total + item.quantidade, 0);
    cartCountElement.textContent = cartCount;
    
    // Update checkout button state
    checkoutButton.disabled = cartCount === 0;
    
    // Toggle empty cart message
    emptyCartMessage.style.display = cart.length === 0 ? 'block' : 'none';
    
    // Update cart items
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p id="empty-cart-message" class="text-center text-gray-500 py-8">Seu carrinho está vazio</p>`;
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item flex items-center py-3 last:border-0">
                <div class="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    <img src="${item.imagem_url}" alt="${item.nome}" class="w-full h-full object-contain">
                </div>
                <div class="ml-4 flex-grow">
                    <h5 class="font-semibold text-gray-800">${item.nome}</h5>
                    <p class="text-gray-600 text-sm">R$ ${item.preco.toFixed(2)} cada</p>
                </div>
                <div class="flex items-center ml-4">
                    <button class="quantity-btn w-8 h-8 flex items-center justify-center rounded-full border" data-id="${item.id}" data-action="decrease">
                        <i class="fas fa-minus text-xs"></i>
                    </button>
                    <span class="mx-2 w-6 text-center">${item.quantidade}</span>
                    <button class="quantity-btn w-8 h-8 flex items-center justify-center rounded-full border" data-id="${item.id}" data-action="increase">
                        <i class="fas fa-plus text-xs"></i>
                    </button>
                </div>
                <div class="ml-4 text-right">
                    <p class="font-semibold text-pet-orange">R$ ${(item.preco * item.quantidade).toFixed(2)}</p>
                    <button class="remove-btn text-red-500 text-sm hover:text-red-700" data-id="${item.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to quantity buttons
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', () => {
                const cartItemId = button.getAttribute('data-id');
                const action = button.getAttribute('data-action');
                const cartItem = cart.find(item => item.id.toString() === cartItemId);
                
                if (cartItem) {
                    let newQuantity = cartItem.quantidade;
                    
                    if (action === 'increase') {
                        newQuantity += 1;
                    } else if (action === 'decrease') {
                        newQuantity -= 1;
                    }
                    
                    updateCartItemQuantity(cartItemId, newQuantity);
                }
            });
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', () => {
                const cartItemId = button.getAttribute('data-id');
                removeCartItem(cartItemId);
            });
        });
    }
    
    // Update cart total
    const total = cart.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    cartTotalElement.textContent = `R$ ${total.toFixed(2)}`;
}

// Setup event listeners
function setupEventListeners() {
    // Cart open/close
    cartButton.addEventListener('click', () => {
        cartModal.classList.remove('hidden');
    });
    
    closeCartButton.addEventListener('click', () => {
        cartModal.classList.add('hidden');
    });
    
    // Close modal when clicking outside
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.classList.add('hidden');
        }
    });
    
    // Checkout button
    checkoutButton.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Seu carrinho está vazio. Adicione produtos antes de finalizar a compra.');
            return;
        }
        
        // Here you would normally redirect to checkout page or show payment options
        alert('Obrigado pela sua compra! Em breve entraremos em contato para finalizar seu pedido.');
        
        // Clear cart (this is just for demo purposes)
        cart.forEach(item => {
            removeCartItem(item.id);
        });
    });
    
    // Scroll animations for sections
    const animateSections = () => {
        const sections = document.querySelectorAll('section');
        const windowHeight = window.innerHeight;
        
        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;
            if (sectionTop < windowHeight * 0.75) {
                section.classList.add('animated');
            }
        });
    };
    
    // Initial check for visible sections
    animateSections();
    
    // Check again on scroll
    window.addEventListener('scroll', animateSections);
}

// Render category filters
function renderCategoryFilters() {
    // Always include the "Todos" filter
    let filtersHTML = `
        <button class="category-filter px-4 py-2 rounded-full bg-pet-orange text-white font-medium hover:bg-pet-yellow transition-colors duration-300 active" data-category="todos">
            Todos
        </button>
    `;
    
    // Add a filter for each category from the API
    categories.forEach(category => {
        filtersHTML += `
            <button class="category-filter px-4 py-2 rounded-full bg-white text-pet-orange font-medium border border-pet-orange hover:bg-pet-yellow-light transition-colors duration-300" data-category="${category.categoria}">
                ${category.categoria}
            </button>
        `;
    });
    
    // Update the filters container
    categoryFiltersContainer.innerHTML = filtersHTML;
    
    // Add event listeners to the category filters
    document.querySelectorAll('.category-filter').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all filters
            document.querySelectorAll('.category-filter').forEach(btn => {
                btn.classList.remove('active', 'bg-pet-orange', 'text-white');
                btn.classList.add('bg-white', 'text-pet-orange');
            });
            
            // Add active class to the clicked filter
            button.classList.remove('bg-white', 'text-pet-orange');
            button.classList.add('active', 'bg-pet-orange', 'text-white');
            
            // Set the current category and re-render products
            currentCategory = button.getAttribute('data-category');
            renderProducts();
        });
    });
} 