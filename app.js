/* ═══════════════════════════════
   WAYNE SHOP — app.js
   Catalogue · Panier · Commande WhatsApp
═══════════════════════════════ */

/* ══════════════════════════
   ⚙️  CONFIG VENDEUR
   → Mets ton numéro WhatsApp ici
══════════════════════════ */
const CONFIG = {
  // Numéro WhatsApp du vendeur (format international sans +)
  // Exemple Bénin : "22961234567"
  WHATSAPP_NUMBER: "2290153890737",
};

/* ══════════════════════════
   📦  CATALOGUE
══════════════════════════ */
const PRODUCTS = [
  // Complets
  { id:1,  cat:"complets",         img:"rhude",          name:"Ensemble RHUDE Los Angeles",    price:7500,  oldPrice:9000,  badge:"promo"   },
  { id:2,  cat:"complets",         img:"adventure",      name:"Ensemble Adventure Noir/Blanc",  price:6000,  oldPrice:null,  badge:"new"     },
  { id:3,  cat:"complets",         img:"boxhead",        name:"Ensemble BoxHead Beige Graphic", price:7000,  oldPrice:8500,  badge:"promo"   },
  { id:4,  cat:"complets",         img:"erfbhi",         name:"Ensemble ERFBHI Noir/Camel",     price:6500,  oldPrice:null,  badge:"new"     },
  { id:5,  cat:"complets",         img:"b069",           name:"Ensemble B NO.069 Blanc",        price:5500,  oldPrice:7000,  badge:"promo"   },
  { id:6,  cat:"complets",         img:"amiri",          name:"Ensemble AMIRI Débardeur",       price:6000,  oldPrice:null,  badge:"new"     },
  // Chaussures Femme
  { id:7,  cat:"chaussures-femme", img:"sandales_beige", name:"Sandales Ruché Beige",           price:3500,  oldPrice:5000,  badge:"promo"   },
  { id:8,  cat:"chaussures-femme", img:"sandales_talon", name:"Sandales Talon Élégant Noir",    price:4000,  oldPrice:null,  badge:"new"     },
  { id:9,  cat:"chaussures-femme", img:"loafers",        name:"Loafers Mary Jane Noir",         price:4500,  oldPrice:6000,  badge:"promo"   },
  // Chaussures Homme
  { id:10, cat:"chaussures-homme", img:"birkenstock",    name:"Sandales Cuir Double Bride",     price:4000,  oldPrice:5500,  badge:"promo"   },
  { id:11, cat:"chaussures-homme", img:"adidas",         name:"Slides Sport Adidas",            price:3000,  oldPrice:null,  badge:"new"     },
  { id:12, cat:"chaussures-homme", img:"sneakers",       name:"Sneakers Urban Noir",            price:5000,  oldPrice:6500,  badge:"promo"   },
  // Montres
  { id:13, cat:"montres",          img:"montre_noire",   name:"Montre Arabic Aura Noir",        price:8000,  oldPrice:10000, badge:"promo"   },
  { id:14, cat:"montres",          img:"montre_chrono",  name:"Chronographe Arabic Luxe",       price:10000, oldPrice:null,  badge:"new"     },
];

/* ══════════════════════════
   🛒  PANIER
══════════════════════════ */
let cart = [];

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  renderCart();
  showToast(`✅ "${product.name}" ajouté !`, "success");
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  renderCart();
}

function getTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function fmt(n) {
  return n.toLocaleString("fr-FR");
}

/* ══════════════════════════
   🖼️  RENDU PANIER
══════════════════════════ */
function renderCart() {
  // Badge nav
  const qty = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById("cartBadge").textContent = qty;

  const itemsEl  = document.getElementById("cartItems");
  const footerEl = document.getElementById("cartFooter");

  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty"><span>🛒</span><p>Votre panier est vide</p></div>`;
    footerEl.style.display = "none";
    return;
  }

  footerEl.style.display = "block";

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        <img src="${PRODUCT_IMAGES[item.img]}" alt="${item.name}" />
      </div>
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">${fmt(item.price * item.qty)} FCFA</p>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, +1)">+</button>
          <button class="remove-btn" onclick="removeFromCart(${item.id})">🗑 Retirer</button>
        </div>
      </div>
    </div>
  `).join("");

  document.getElementById("cartTotal").textContent = `${fmt(getTotal())} FCFA`;
}

/* ══════════════════════════
   📲  TOGGLE PANIER
══════════════════════════ */
function openCart() {
  document.getElementById("cartSidebar").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
}

function closeCart() {
  document.getElementById("cartSidebar").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
}

/* ══════════════════════════
   ✅  COMMANDE WHATSAPP
══════════════════════════ */
function confirmOrder() {
  const name    = document.getElementById("buyerName").value.trim();
  const phone   = document.getElementById("buyerPhone").value.trim();
  const city    = document.getElementById("buyerCity").value.trim();
  const address = document.getElementById("buyerAddress").value.trim();

  if (!name)         { showToast("⚠️ Entrez votre nom", "error"); return; }
  if (!phone)        { showToast("⚠️ Entrez votre téléphone", "error"); return; }
  if (!city)         { showToast("⚠️ Entrez votre quartier/ville", "error"); return; }
  if (!cart.length)  { showToast("⚠️ Votre panier est vide", "error"); return; }

  const ref   = "WS-" + Date.now().toString().slice(-5);
  const date  = new Date().toLocaleString("fr-FR");
  const lines = cart.map(i => `  • ${i.name} ×${i.qty} → ${fmt(i.price * i.qty)} FCFA`).join("\n");
  const total = fmt(getTotal());

  const msg = [
    `🛍️ *NOUVELLE COMMANDE - WAYNE SHOP*`,
    `📌 Réf : ${ref}  |  📅 ${date}`,
    ``,
    `👤 *CLIENT*`,
    `• Nom     : ${name}`,
    `• Tél     : ${phone}`,
    `• Ville   : ${city}`,
    address ? `• Adresse : ${address}` : null,
    ``,
    `🧾 *ARTICLES*`,
    lines,
    ``,
    `💰 *TOTAL : ${total} FCFA*`,
    ``,
    `✅ Merci de confirmer la disponibilité !`,
  ].filter(l => l !== null).join("\n");

  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");

  // Afficher modal confirmation
  document.getElementById("modalText").textContent =
    `Commande #${ref} | ${cart.length} article(s) | Total : ${total} FCFA`;
  document.getElementById("modalOverlay").classList.add("open");

  // Reset
  cart = [];
  renderCart();
  closeCart();
  ["buyerName","buyerPhone","buyerCity","buyerAddress"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

/* ══════════════════════════
   🏷️  RENDU PRODUITS
══════════════════════════ */
function renderProducts(filter = "all") {
  const grid = document.getElementById("productsGrid");
  const list = filter === "all"
    ? PRODUCTS
    : PRODUCTS.filter(p => p.cat === filter);

  const catLabels = {
    "complets":         "Complet",
    "chaussures-femme": "Chaussures Femme",
    "chaussures-homme": "Chaussures Homme",
    "montres":          "Montre",
  };

  grid.innerHTML = list.map(p => `
    <div class="product-card">
      <div class="product-img-wrap">
        <img src="${PRODUCT_IMAGES[p.img]}" alt="${p.name}" loading="lazy" />
        ${p.badge ? `<span class="product-badge ${p.badge}">${p.badge === "promo" ? "🔥 Promo" : "✨ Nouveau"}</span>` : ""}
      </div>
      <div class="product-body">
        <p class="product-cat">${catLabels[p.cat] || p.cat}</p>
        <p class="product-name">${p.name}</p>
        <div class="product-price">
          <span class="price-now">${fmt(p.price)} FCFA</span>
          ${p.oldPrice ? `<span class="price-old">${fmt(p.oldPrice)} FCFA</span>` : ""}
        </div>
        <button class="add-cart-btn" onclick="addToCart(${p.id})">
          🛒 Ajouter au panier
        </button>
      </div>
    </div>
  `).join("");
}

/* ══════════════════════════
   🔘  FILTRES
══════════════════════════ */
function initFilters() {
  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProducts(btn.dataset.filter);
      document.getElementById("produits").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* ══════════════════════════
   🎞️  HERO SLIDESHOW
══════════════════════════ */
function injectHeroImages() {
  document.querySelectorAll("[data-hero]").forEach(img => {
    const key = img.dataset.hero;
    if (PRODUCT_IMAGES[key]) img.src = PRODUCT_IMAGES[key];
  });
}

function initSlideshow() {
  const slides = document.querySelectorAll(".hero-slide");
  if (!slides.length) return;
  let idx = 0;
  setInterval(() => {
    slides[idx].classList.remove("active");
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add("active");
  }, 3000);
}

/* ══════════════════════════
   🍞  TOAST
══════════════════════════ */
let toastTimer;
function showToast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

/* ══════════════════════════
   🎛️  EVENTS
══════════════════════════ */
function initEvents() {
  // Panier toggle
  document.getElementById("cartToggleBtn").addEventListener("click", openCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);

  // Commande
  document.getElementById("confirmOrderBtn").addEventListener("click", confirmOrder);

  // Modal fermer
  document.getElementById("modalCloseBtn").addEventListener("click", () => {
    document.getElementById("modalOverlay").classList.remove("open");
  });
  document.getElementById("modalOverlay").addEventListener("click", e => {
    if (e.target.id === "modalOverlay")
      document.getElementById("modalOverlay").classList.remove("open");
  });
}

/* ══════════════════════════
   🚀  INIT
══════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  injectHeroImages();
  renderProducts("all");
  initFilters();
  initSlideshow();
  initEvents();
  renderCart();
});
