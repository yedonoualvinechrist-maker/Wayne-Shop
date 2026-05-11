/* ═══════════════════════════════════
   WAYNE SHOP — app.js
   Catalogue depuis Supabase · Panier · Commande WhatsApp
═══════════════════════════════════ */

/* ══════════════════
   SUPABASE HELPER
══════════════════ */
async function sbFetch(endpoint, options = {}) {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "apikey":        CONFIG.SUPABASE_KEY,
      "Authorization": `Bearer ${CONFIG.SUPABASE_KEY}`,
      "Content-Type":  "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

/* ══════════════════
   CHARGEMENT ARTICLES
══════════════════ */
async function loadProducts(filter = "all") {
  document.getElementById("loadingState").style.display = "flex";
  document.getElementById("productsGrid").innerHTML = "";
  try {
    let endpoint = "articles?select=*&order=id.asc";
    if (filter !== "all") endpoint += `&categorie=eq.${filter}`;
    const articles = await sbFetch(endpoint);
    renderProducts(articles);
  } catch (e) {
    console.error(e);
    document.getElementById("productsGrid").innerHTML =
      `<p style="color:#999;text-align:center;padding:40px;grid-column:1/-1">
        ⚠️ Impossible de charger les articles. Vérifiez la connexion.
      </p>`;
  } finally {
    document.getElementById("loadingState").style.display = "none";
  }
}

/* ══════════════════
   RENDU PRODUITS
══════════════════ */
function renderProducts(articles) {
  const grid = document.getElementById("productsGrid");
  if (!articles || articles.length === 0) {
    grid.innerHTML = `<p style="color:#999;text-align:center;padding:60px;grid-column:1/-1">
      Aucun article dans cette catégorie pour le moment.
    </p>`;
    return;
  }

  const catLabels = {
    "complets":         "Complet",
    "chaussures-femme": "Chaussures Femme",
    "chaussures-homme": "Chaussures Homme",
    "montres":          "Montre",
  };

  grid.innerHTML = articles.map(p => {
    // L'image peut être une clé (ex: "rhude") ou une URL base64 complète
    const imgSrc = PRODUCT_IMAGES[p.image_url] || p.image_url;
    const badgeHtml = p.badge
      ? `<span class="product-badge ${p.badge}">${p.badge === "promo" ? "🔥 Promo" : "✨ Nouveau"}</span>`
      : "";

    return `
      <div class="product-card">
        <div class="product-img-wrap">
          <img src="${imgSrc}" alt="${p.nom}" loading="lazy"/>
          ${badgeHtml}
        </div>
        <div class="product-body">
          <p class="product-cat">${catLabels[p.categorie] || p.categorie}</p>
          <p class="product-name">${p.nom}</p>
          <div class="product-price">
            <span class="price-now">${fmt(p.prix)} FCFA</span>
            ${p.ancien_prix ? `<span class="price-old">${fmt(p.ancien_prix)} FCFA</span>` : ""}
          </div>
          <button class="add-cart-btn" onclick="addToCart(${p.id}, '${p.nom}', ${p.prix}, '${p.image_url}')">
            🛒 Ajouter au panier
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/* ══════════════════
   PANIER
══════════════════ */
let cart = [];

function addToCart(id, nom, prix, imageUrl) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, nom, prix, imageUrl, qty: 1 });
  }
  renderCart();
  showToast(`✅ "${nom}" ajouté !`, "success");
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
  return cart.reduce((sum, i) => sum + i.prix * i.qty, 0);
}

function fmt(n) {
  return Number(n).toLocaleString("fr-FR");
}

function renderCart() {
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
  itemsEl.innerHTML = cart.map(item => {
    const imgSrc = PRODUCT_IMAGES[item.imageUrl] || item.imageUrl;
    return `
      <div class="cart-item">
        <div class="cart-item-img"><img src="${imgSrc}" alt="${item.nom}"/></div>
        <div class="cart-item-info">
          <p class="cart-item-name">${item.nom}</p>
          <p class="cart-item-price">${fmt(item.prix * item.qty)} FCFA</p>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, +1)">+</button>
            <button class="remove-btn" onclick="removeFromCart(${item.id})">🗑 Retirer</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  document.getElementById("cartTotal").textContent = `${fmt(getTotal())} FCFA`;
}

/* ══════════════════
   COMMANDE WHATSAPP
══════════════════ */
function confirmOrder() {
  const name    = document.getElementById("buyerName").value.trim();
  const phone   = document.getElementById("buyerPhone").value.trim();
  const city    = document.getElementById("buyerCity").value.trim();
  const address = document.getElementById("buyerAddress").value.trim();

  if (!name)        { showToast("⚠️ Entrez votre nom", "error"); return; }
  if (!phone)       { showToast("⚠️ Entrez votre téléphone", "error"); return; }
  if (!city)        { showToast("⚠️ Entrez votre quartier/ville", "error"); return; }
  if (!cart.length) { showToast("⚠️ Votre panier est vide", "error"); return; }

  const ref   = "WS-" + Date.now().toString().slice(-5);
  const date  = new Date().toLocaleString("fr-FR");
  const lines = cart.map(i => `  • ${i.nom} ×${i.qty} → ${fmt(i.prix * i.qty)} FCFA`).join("\n");
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

  window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");

  document.getElementById("modalText").textContent =
    `Commande #${ref} | ${cart.length} article(s) | Total : ${total} FCFA`;
  document.getElementById("modalOverlay").classList.add("open");

  cart = [];
  renderCart();
  closeCart();
  ["buyerName","buyerPhone","buyerCity","buyerAddress"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

/* ══════════════════
   FILTRES DYNAMIQUES
══════════════════ */
async function loadFilters() {
  try {
    const cats = await sbFetch("categories?select=*&order=id.asc");
    renderFilters(cats);
  } catch(e) {
    console.warn("Catégories non chargées", e);
    renderFilters([]);
  }
}

function renderFilters(categories) {
  const bar = document.getElementById("catBar");
  let html = `<button class="cat-btn active" data-filter="all">🏠 Tout</button>`;
  categories.forEach(cat => {
    html += `<button class="cat-btn" data-filter="${cat.nom}">${cat.icone} ${cat.nom}</button>`;
  });
  bar.innerHTML = html;
  bar.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      bar.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadProducts(btn.dataset.filter);
    });
  });
}

/* ══════════════════
   HERO SLIDESHOW
══════════════════ */
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

/* ══════════════════
   PANIER TOGGLE
══════════════════ */
function openCart()  {
  document.getElementById("cartSidebar").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
}
function closeCart() {
  document.getElementById("cartSidebar").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
}

/* ══════════════════
   TOAST
══════════════════ */
let toastTimer;
function showToast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

/* ══════════════════
   EVENTS
══════════════════ */
function initEvents() {
  document.getElementById("cartToggleBtn").addEventListener("click", openCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);
  document.getElementById("confirmOrderBtn").addEventListener("click", confirmOrder);
  document.getElementById("modalCloseBtn").addEventListener("click", () => {
    document.getElementById("modalOverlay").classList.remove("open");
  });
  document.getElementById("modalOverlay").addEventListener("click", e => {
    if (e.target.id === "modalOverlay")
      document.getElementById("modalOverlay").classList.remove("open");
  });
}

/* ══════════════════
   INIT
══════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  injectHeroImages();
  initSlideshow();
  initEvents();
  renderCart();
  loadFilters();
  loadProducts("all");
});
