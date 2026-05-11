/* ═══════════════════════════════════
   WAYNE SHOP — admin.js
   Panneau admin + Gestion catégories
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
      "Prefer":        options.prefer || "",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

/* ══════════════════
   AUTH
══════════════════ */
function checkLogin() {
  if (sessionStorage.getItem("ws_admin") === CONFIG.ADMIN_PASSWORD) showPanel();
}

function login() {
  const val = document.getElementById("passwordInput").value;
  if (val === CONFIG.ADMIN_PASSWORD) {
    sessionStorage.setItem("ws_admin", val);
    document.getElementById("loginError").textContent = "";
    showPanel();
  } else {
    document.getElementById("loginError").textContent = "❌ Mot de passe incorrect";
    document.getElementById("passwordInput").value = "";
  }
}

function logout() {
  sessionStorage.removeItem("ws_admin");
  document.getElementById("adminPanel").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
}

function showPanel() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminPanel").style.display  = "block";
  loadAdminData();
}

/* ══════════════════
   CHARGEMENT DONNÉES
══════════════════ */
let allArticles   = [];
let allCategories = [];

async function loadAdminData() {
  document.getElementById("adminLoading").style.display = "flex";
  document.getElementById("adminArticles").innerHTML = "";
  try {
    [allArticles, allCategories] = await Promise.all([
      sbFetch("articles?select=*&order=id.asc"),
      sbFetch("categories?select=*&order=id.asc"),
    ]);
    renderAdminArticles(allArticles);
    updateStats(allArticles);
    renderCategoryList();
  } catch(e) {
    showToast("❌ Erreur chargement : " + e.message, "error");
  } finally {
    document.getElementById("adminLoading").style.display = "none";
  }
}

function updateStats(articles) {
  document.getElementById("statTotal").textContent = articles.length;
  document.getElementById("statPromo").textContent = articles.filter(a => a.badge === "promo").length;
  document.getElementById("statNew").textContent   = articles.filter(a => a.badge === "new").length;
  const min = articles.length ? Math.min(...articles.map(a => a.prix)) : 0;
  document.getElementById("statMinPrice").textContent = min ? fmt(min) + " F" : "—";
}

/* ══════════════════
   RENDU ARTICLES
══════════════════ */
function renderAdminArticles(articles) {
  const container = document.getElementById("adminArticles");
  if (!articles || articles.length === 0) {
    container.innerHTML = `<div class="admin-empty"><span>📦</span><p>Aucun article. Commencez par en ajouter un !</p></div>`;
    return;
  }
  container.innerHTML = articles.map(a => {
    const imgSrc = PRODUCT_IMAGES[a.image_url] || a.image_url;
    return `
      <div class="admin-article-card">
        <div class="admin-article-img">
          <img src="${imgSrc}" alt="${a.nom}"/>
          ${a.badge ? `<span class="product-badge ${a.badge}">${a.badge === "promo" ? "🔥" : "✨"}</span>` : ""}
        </div>
        <div class="admin-article-info">
          <p class="admin-article-cat">${a.categorie}</p>
          <p class="admin-article-name">${a.nom}</p>
          <div class="admin-article-price">
            <span class="price-now">${fmt(a.prix)} FCFA</span>
            ${a.ancien_prix ? `<span class="price-old">${fmt(a.ancien_prix)} FCFA</span>` : ""}
          </div>
        </div>
        <div class="admin-article-actions">
          <button class="edit-btn"   onclick="openEditModal(${a.id})">✏️ Modifier</button>
          <button class="delete-btn" onclick="openDeleteModal(${a.id}, '${a.nom.replace(/'/g,"\\'")}')">🗑️ Supprimer</button>
        </div>
      </div>`;
  }).join("");
}

function fmt(n) { return Number(n).toLocaleString("fr-FR"); }

/* ══════════════════════════
   GESTION DES CATÉGORIES
══════════════════════════ */
function renderCategoryList() {
  const container = document.getElementById("categoryList");
  if (!allCategories || allCategories.length === 0) {
    container.innerHTML = `<p style="color:#888;font-size:.8rem;text-align:center;padding:20px">Aucune catégorie</p>`;
    return;
  }
  container.innerHTML = allCategories.map(cat => `
    <div class="cat-admin-item">
      <span class="cat-admin-icon">${cat.icone}</span>
      <span class="cat-admin-name">${cat.nom}</span>
      <button class="cat-delete-btn" onclick="deleteCategory(${cat.id}, '${cat.nom.replace(/'/g,"\\'")}')">✕</button>
    </div>
  `).join("");
}

async function addCategory() {
  const nomInput   = document.getElementById("newCatNom");
  const iconeInput = document.getElementById("newCatIcone");
  const nom   = nomInput.value.trim();
  const icone = iconeInput.value.trim() || "🏷️";

  if (!nom) { showToast("⚠️ Entrez un nom de catégorie", "error"); return; }
  if (allCategories.find(c => c.nom.toLowerCase() === nom.toLowerCase())) {
    showToast("⚠️ Cette catégorie existe déjà", "error"); return;
  }

  const btn = document.getElementById("addCatBtn");
  btn.textContent = "⏳..."; btn.disabled = true;
  try {
    await sbFetch("categories", { method: "POST", body: JSON.stringify({ nom, icone }), prefer: "return=minimal" });
    nomInput.value = ""; iconeInput.value = "";
    showToast(`✅ Catégorie "${nom}" ajoutée !`, "success");
    await loadAdminData();
    // Mettre à jour le select dans le formulaire article si ouvert
    populateCategorySelect();
  } catch(e) {
    showToast("❌ Erreur : " + e.message, "error");
  } finally {
    btn.textContent = "➕ Ajouter"; btn.disabled = false;
  }
}

async function deleteCategory(id, nom) {
  // Vérifier si des articles utilisent cette catégorie
  const used = allArticles.filter(a => a.categorie === nom).length;
  if (used > 0) {
    showToast(`⚠️ "${nom}" est utilisée par ${used} article(s). Modifiez-les d'abord.`, "error");
    return;
  }
  if (!confirm(`Supprimer la catégorie "${nom}" ?`)) return;
  try {
    await sbFetch(`categories?id=eq.${id}`, { method: "DELETE" });
    showToast(`✅ Catégorie "${nom}" supprimée !`, "success");
    await loadAdminData();
    populateCategorySelect();
  } catch(e) {
    showToast("❌ Erreur : " + e.message, "error");
  }
}

/* Remplir le select catégorie dans le formulaire article */
function populateCategorySelect() {
  const sel = document.getElementById("formCategorie");
  const current = sel.value;
  sel.innerHTML = `<option value="">-- Choisir une catégorie --</option>`;
  allCategories.forEach(cat => {
    sel.innerHTML += `<option value="${cat.nom}" ${current === cat.nom ? "selected" : ""}>${cat.icone} ${cat.nom}</option>`;
  });
  // Option pour créer une nouvelle catégorie rapidement
  sel.innerHTML += `<option value="__new__">➕ Créer une nouvelle catégorie...</option>`;
}

/* ══════════════════
   MODAL ARTICLE
══════════════════ */
let editingId = null;
let currentImageBase64 = null;

function openAddModal() {
  editingId = null; currentImageBase64 = null;
  document.getElementById("modalFormTitle").textContent = "➕ Ajouter un article";
  document.getElementById("formNom").value        = "";
  document.getElementById("formPrix").value       = "";
  document.getElementById("formAncienPrix").value = "";
  document.getElementById("formBadge").value      = "";
  document.getElementById("formImageUrl").value   = "";
  document.getElementById("photoPreview").innerHTML =
    `<span>📷</span><p>Clique pour choisir une photo</p><small>JPG, PNG, WEBP — max 5MB</small>`;
  populateCategorySelect();
  document.getElementById("articleModal").classList.add("open");
}

function openEditModal(id) {
  const a = allArticles.find(x => x.id === id);
  if (!a) return;
  editingId = id; currentImageBase64 = null;
  document.getElementById("modalFormTitle").textContent = "✏️ Modifier l'article";
  document.getElementById("formNom").value        = a.nom;
  document.getElementById("formPrix").value       = a.prix;
  document.getElementById("formAncienPrix").value = a.ancien_prix || "";
  document.getElementById("formBadge").value      = a.badge || "";
  document.getElementById("formImageUrl").value   = a.image_url;
  populateCategorySelect();
  document.getElementById("formCategorie").value  = a.categorie;
  const imgSrc = PRODUCT_IMAGES[a.image_url] || a.image_url;
  document.getElementById("photoPreview").innerHTML =
    `<img src="${imgSrc}" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>
     <p style="position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:.7rem;color:#fff;background:rgba(0,0,0,.5);padding:4px">Clique pour changer</p>`;
  document.getElementById("articleModal").classList.add("open");
}

function closeArticleModal() {
  document.getElementById("articleModal").classList.remove("open");
  editingId = null; currentImageBase64 = null;
}

/* ══════════════════
   UPLOAD PHOTO
══════════════════ */
function handlePhotoUpload(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast("❌ Photo trop lourde (max 5MB)", "error"); return; }
  const reader = new FileReader();
  reader.onload = e => {
    currentImageBase64 = e.target.result;
    document.getElementById("photoPreview").innerHTML =
      `<img src="${currentImageBase64}" alt="Aperçu" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>
       <p style="position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:.7rem;color:#fff;background:rgba(0,0,0,.5);padding:4px">✅ Photo sélectionnée</p>`;
  };
  reader.readAsDataURL(file);
}

/* ══════════════════
   SAUVEGARDER ARTICLE
══════════════════ */
async function saveArticle() {
  const nom        = document.getElementById("formNom").value.trim();
  let   categorie  = document.getElementById("formCategorie").value;
  const prix       = parseInt(document.getElementById("formPrix").value);
  const ancienPrix = parseInt(document.getElementById("formAncienPrix").value) || null;
  const badge      = document.getElementById("formBadge").value || null;
  const existingImg = document.getElementById("formImageUrl").value;

  // Si l'utilisateur veut créer une nouvelle catégorie
  if (categorie === "__new__") {
    const newCat = prompt("Entrez le nom de la nouvelle catégorie :");
    if (!newCat || !newCat.trim()) { showToast("⚠️ Nom de catégorie invalide", "error"); return; }
    const icone = prompt("Entrez un emoji pour la catégorie (ex: 👗) :") || "🏷️";
    try {
      await sbFetch("categories", { method: "POST", body: JSON.stringify({ nom: newCat.trim(), icone }), prefer: "return=minimal" });
      categorie = newCat.trim();
      await loadAdminData();
    } catch(e) { showToast("❌ Erreur création catégorie", "error"); return; }
  }

  if (!nom)      { showToast("⚠️ Entrez le nom de l'article", "error"); return; }
  if (!categorie){ showToast("⚠️ Choisissez une catégorie", "error"); return; }
  if (!prix || prix <= 0) { showToast("⚠️ Entrez un prix valide", "error"); return; }

  const imageUrl = currentImageBase64 || existingImg;
  if (!imageUrl) { showToast("⚠️ Ajoutez une photo", "error"); return; }

  const data = { nom, categorie, prix, ancien_prix: ancienPrix, badge, image_url: imageUrl };
  const btn  = document.getElementById("saveArticleBtn");
  btn.textContent = "⏳ Enregistrement..."; btn.disabled = true;

  try {
    if (editingId) {
      await sbFetch(`articles?id=eq.${editingId}`, { method: "PATCH", body: JSON.stringify(data) });
      showToast("✅ Article modifié !", "success");
    } else {
      await sbFetch("articles", { method: "POST", body: JSON.stringify(data), prefer: "return=minimal" });
      showToast("✅ Article ajouté !", "success");
    }
    closeArticleModal();
    loadAdminData();
  } catch(e) {
    showToast("❌ Erreur : " + e.message, "error");
  } finally {
    btn.textContent = "💾 Enregistrer"; btn.disabled = false;
  }
}

/* ══════════════════
   SUPPRIMER ARTICLE
══════════════════ */
let deleteTargetId = null;

function openDeleteModal(id, nom) {
  deleteTargetId = id;
  document.getElementById("deleteArticleName").textContent = `"${nom}"`;
  document.getElementById("deleteModal").classList.add("open");
}

async function deleteArticle() {
  if (!deleteTargetId) return;
  try {
    await sbFetch(`articles?id=eq.${deleteTargetId}`, { method: "DELETE" });
    showToast("✅ Article supprimé !", "success");
    document.getElementById("deleteModal").classList.remove("open");
    deleteTargetId = null;
    loadAdminData();
  } catch(e) {
    showToast("❌ Erreur : " + e.message, "error");
  }
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
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

/* ══════════════════
   INIT
══════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  checkLogin();

  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("passwordInput").addEventListener("keypress", e => { if (e.key === "Enter") login(); });
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("openAddModal").addEventListener("click", openAddModal);
  document.getElementById("cancelArticleModal").addEventListener("click", closeArticleModal);
  document.getElementById("articleModal").addEventListener("click", e => { if (e.target.id === "articleModal") closeArticleModal(); });

  // Upload photo
  document.getElementById("photoUploadArea").addEventListener("click", () => document.getElementById("formPhoto").click());
  document.getElementById("formPhoto").addEventListener("change", e => handlePhotoUpload(e.target.files[0]));
  const ua = document.getElementById("photoUploadArea");
  ua.addEventListener("dragover",  e => { e.preventDefault(); ua.classList.add("drag-over"); });
  ua.addEventListener("dragleave", () => ua.classList.remove("drag-over"));
  ua.addEventListener("drop", e => { e.preventDefault(); ua.classList.remove("drag-over"); handlePhotoUpload(e.dataTransfer.files[0]); });

  document.getElementById("saveArticleBtn").addEventListener("click", saveArticle);
  document.getElementById("confirmDelete").addEventListener("click", deleteArticle);
  document.getElementById("cancelDelete").addEventListener("click", () => {
    document.getElementById("deleteModal").classList.remove("open");
    deleteTargetId = null;
  });

  // Catégories
  document.getElementById("addCatBtn").addEventListener("click", addCategory);
  document.getElementById("newCatNom").addEventListener("keypress", e => { if (e.key === "Enter") addCategory(); });
});
