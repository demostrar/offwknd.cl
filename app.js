// CONFIGURACIÓN
const WHATSAPP_PHONE = "56912345678"; // Reemplaza con tu número real
const INSTAGRAM_USER = "offwknd.cl";   // Tu usuario de Instagram

let cart = [];
let selectedSizesMap = {};
let currentCategory = "all";
let searchQuery = "";

const formatCLP = (amount) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(amount);
};

// Referencias DOM
const productsGrid = document.getElementById("productsGrid");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartCount = document.getElementById("cartCount");
const cartItemsContainer = document.getElementById("cartItemsContainer");
const cartTotalDisplay = document.getElementById("cartTotalDisplay");
const whatsappOrderBtn = document.getElementById("whatsappOrderBtn");
const instagramOrderBtn = document.getElementById("instagramOrderBtn");
const searchInput = document.getElementById("searchInput");
const toast = document.getElementById("toast");

// Formulario
const cartFormSection = document.getElementById("cartFormSection");
const custNameInput = document.getElementById("custName");
const custAddressInput = document.getElementById("custAddress");
const custPhoneInput = document.getElementById("custPhone");
const formErrorMsg = document.getElementById("formErrorMsg");

// Renderizar Productos
function renderProducts() {
  let filtered = currentCategory === "all"
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === currentCategory);

  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: #6b7280;">
        No hay prendas disponibles en esta categoría.
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(item => {
    const selectedSize = selectedSizesMap[item.id] || item.sizes[0];

    return `
      <div class="product-card">
        <div class="card-img-wrap">
          <img src="${item.img}" alt="${item.name}" class="card-img" loading="lazy">
          ${item.badge ? `<span class="card-badge">${item.badge}</span>` : ''}
        </div>

        <div class="card-body">
          <span class="card-cat-label">${item.categoryLabel}</span>
          <h3 class="card-title">${item.name}</h3>
          <div class="card-price">${formatCLP(item.price)}</div>

          <span class="size-header-label">TALLA:</span>
          <div class="size-selector">
            ${item.sizes.map(sz => `
              <button 
                class="size-btn ${sz === selectedSize ? 'selected' : ''}" 
                onclick="chooseCardSize(${item.id}, '${sz}')">
                ${sz}
              </button>
            `).join('')}
          </div>

          <button class="btn-card-add" onclick="addToCart(${item.id})">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
            Agregar al Carrito
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

window.chooseCardSize = (productId, size) => {
  selectedSizesMap[productId] = size;
  renderProducts();
};

window.addToCart = (productId) => {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const size = selectedSizesMap[productId] || product.sizes[0];
  const itemIndex = cart.findIndex(c => c.id === product.id && c.size === size);

  // Asegurar que tome la primera foto de images o img si existe
  const mainImage = (product.images && product.images.length > 0) 
    ? product.images[0] 
    : (product.img || '');

  if (itemIndex > -1) {
    cart[itemIndex].qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      img: mainImage, // <-- Guarda la URL correcta
      size: size,
      qty: 1
    });
  }

  updateCartUI();
  showToast(`¡${product.name} (${size}) agregado!`);
};

window.modifyQty = (idx, step) => {
  cart[idx].qty += step;
  if (cart[idx].qty <= 0) {
    cart.splice(idx, 1);
  }
  updateCartUI();
};

function updateCartUI() {
  const totalItems = cart.reduce((acc, c) => acc + c.qty, 0);
  const totalPrice = cart.reduce((acc, c) => acc + (c.price * c.qty), 0);

  cartCount.textContent = totalItems;
  cartTotalDisplay.textContent = formatCLP(totalPrice);

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div style="text-align: center; color: #9ca3af; padding-top: 4rem;">
        <i data-lucide="shopping-bag" style="width: 44px; height: 44px; opacity: 0.3; margin-bottom: 0.5rem;"></i>
        <p>Tu carrito está vacío</p>
      </div>
    `;
    if (cartFormSection) cartFormSection.style.display = "none";
    whatsappOrderBtn.disabled = true;
    instagramOrderBtn.disabled = true;
  } else {
    if (cartFormSection) cartFormSection.style.display = "block";
    cartItemsContainer.innerHTML = cart.map((c, i) => `
      <div class="cart-item">
        <img src="${c.img}" alt="${c.name}" class="cart-item-thumb">
        <div class="cart-item-meta">
          <h4>${c.name}</h4>
          <div class="cart-item-size">Talla: <strong>${c.size}</strong> · ${formatCLP(c.price * c.qty)}</div>
          <div class="cart-item-ctrl">
            <button class="btn-qty" onclick="modifyQty(${i}, -1)">-</button>
            <span style="font-size: 0.85rem; font-weight: 700;">${c.qty}</span>
            <button class="btn-qty" onclick="modifyQty(${i}, 1)">+</button>
          </div>
        </div>
      </div>
    `).join('');
    whatsappOrderBtn.disabled = false;
    instagramOrderBtn.disabled = false;
  }

  if (window.lucide) lucide.createIcons();
}

// Función auxiliar para validar datos y armar el texto del pedido
function prepareOrderText() {
  if (cart.length === 0) return null;

  const name = custNameInput.value.trim();
  const address = custAddressInput.value.trim();
  const phone = custPhoneInput.value.trim();

  [custNameInput, custAddressInput, custPhoneInput].forEach(inp => inp.classList.remove("input-error"));
  formErrorMsg.classList.remove("visible");

  let hasError = false;
  if (!name) { custNameInput.classList.add("input-error"); hasError = true; }
  if (!address) { custAddressInput.classList.add("input-error"); hasError = true; }
  if (!phone) { custPhoneInput.classList.add("input-error"); hasError = true; }

  if (hasError) {
    formErrorMsg.classList.add("visible");
    return null;
  }

  const total = cart.reduce((acc, c) => acc + (c.price * c.qty), 0);

  let msg = `¡Hola OFFWKND! Quiero confirmar mi pedido desde la web:\n\n`;
  msg += `*Cliente:* ${name}\n`;
  msg += `*Teléfono:* ${phone}\n`;
  msg += `*Dirección/Comuna:* ${address}\n\n`;
  msg += `*Detalle del Pedido:*\n`;

  cart.forEach(item => {
    msg += `▪ ${item.name} (Talla: ${item.size}) x${item.qty} → ${formatCLP(item.price * item.qty)}\n`;
  });

  msg += `\n *TOTAL A PAGAR:* ${formatCLP(total)}\n\n`;
  msg += `Quedo atento/a para coordinar los datos de transferencia y despacho. ¡Muchas gracias!`;

  return msg;
}

// Opción 1: Enviar por WhatsApp
whatsappOrderBtn.addEventListener("click", () => {
  const msg = prepareOrderText();
  if (!msg) return;

  const link = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
  window.open(link, "_blank");
});

// Opción 2: Enviar por Instagram
instagramOrderBtn.addEventListener("click", () => {
  const msg = prepareOrderText();
  if (!msg) return;

  // Copia el resumen al portapapeles para facilitar el pegado en el chat de Instagram
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(msg).then(() => {
      showToast("¡Detalle copiado! Pégalo en el chat de Instagram.");
    }).catch(() => {});
  }

  // Redirige al chat de Instagram con la cuenta oficial
  const igChatUrl = `https://ig.me/m/${INSTAGRAM_USER}`;
  window.open(igChatUrl, "_blank");
});

// Control Carrito
const toggleCart = (open) => {
  cartDrawer.classList.toggle("open", open);
  cartOverlay.classList.toggle("open", open);
};
openCartBtn.addEventListener("click", () => toggleCart(true));
closeCartBtn.addEventListener("click", () => toggleCart(false));
cartOverlay.addEventListener("click", () => toggleCart(false));

// Filtros
document.querySelectorAll(".filter-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentCategory = tab.dataset.category;
    renderProducts();
  });
});

// Buscador
searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderProducts();
});

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2500);
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  updateCartUI();
});

// Agrega esta variable al inicio de app.js junto a las otras
let activeImageMap = {}; // Guarda el índice de la foto actual de cada producto (0, 1, 2...)

// Modifica la función renderProducts() para pintar las fotos y controles:
function renderProducts() {
  let filtered = currentCategory === "all"
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === currentCategory);

  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 0; color: #6b7280;">
        No hay prendas disponibles en esta categoría.
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(item => {
    const selectedSize = selectedSizesMap[item.id] || item.sizes[0];
    const imgList = item.images && item.images.length > 0 ? item.images : [item.img];
    const currentImgIdx = activeImageMap[item.id] || 0;
    const currentImg = imgList[currentImgIdx];
    const hasMultiple = imgList.length > 1;

    return `
      <div class="product-card">
        <div class="card-img-wrap">
          <img src="${currentImg}" alt="${item.name}" class="card-img" loading="lazy">
          ${item.badge ? `<span class="card-badge">${item.badge}</span>` : ''}

          ${hasMultiple ? `
            <button class="gallery-nav-btn gallery-prev" onclick="changeProductImage(${item.id}, -1)" aria-label="Foto anterior">‹</button>
            <button class="gallery-nav-btn gallery-next" onclick="changeProductImage(${item.id}, 1)" aria-label="Siguiente foto">›</button>
            <div class="gallery-dots">
              ${imgList.map((_, i) => `
                <span class="gallery-dot ${i === currentImgIdx ? 'active' : ''}" onclick="setProductImage(${item.id}, ${i})"></span>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="card-body">
          <span class="card-cat-label">${item.categoryLabel}</span>
          <h3 class="card-title">${item.name}</h3>
          <div class="card-price">${formatCLP(item.price)}</div>

          <span class="size-header-label">TALLA:</span>
          <div class="size-selector">
            ${item.sizes.map(sz => `
              <button 
                class="size-btn ${sz === selectedSize ? 'selected' : ''}" 
                onclick="chooseCardSize(${item.id}, '${sz}')">
                ${sz}
              </button>
            `).join('')}
          </div>

          <button class="btn-card-add" onclick="addToCart(${item.id})">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
            Agregar al Carrito
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// Funciones para alternar imágenes
window.changeProductImage = (productId, step) => {
  const prod = PRODUCTS.find(p => p.id === productId);
  if (!prod) return;
  const list = prod.images || [prod.img];
  let curr = activeImageMap[productId] || 0;
  curr = (curr + step + list.length) % list.length;
  activeImageMap[productId] = curr;
  renderProducts();
};

window.setProductImage = (productId, index) => {
  activeImageMap[productId] = index;
  renderProducts();
};
