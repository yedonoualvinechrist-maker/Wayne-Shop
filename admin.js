/* ═══════════════════════════════════
   WAYNE SHOP — admin.js
   Panneau administrateur complet
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
let isAuthenticated = false;

function checkLogin() {
  const saved = sessionStorage.getItem("ws_admin");
  if (saved === CONFIG.ADMIN_PASSWORD) {
    showPanel();
  }
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
  document.getElementById("passwordInput").value = "";
}

function showPanel() {
  isAuthenticated = true;
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminPanel").style.display = "block";
  loadAdminArticles();
}

/* ══════════════════
   CHARGER ARTICLES
══════════════════ */
let allArticles = [];

async function loadAdminArticles() {
  document.getElementById("adminLoading").style.display = "flex";
  document.getElementById("adminArticles").innerHTML = "";
  try {
    allArticles = await sbFetch("articles?select=*&order=id.asc");
    renderAdminArticles(allArticles);
    updateStats(allArticles);
  } catch(e) {
    showToast("❌ Erreur chargement : " + e.message, "error");
  } finally {
    document.getElementById("adminLoading").style.display = "none";
  }
}

function updateStats(articles) {
  document.getElementById("statTotal").textContent   = articles.length;
  document.getElementById("statPromo").textContent   = articles.filter(a => a.badge === "promo").length;
  document.getElementById("statNew").textContent     = articles.filter(a => a.badge === "new").length;
  const min = articles.length ? Math.min(...articles.map(a => a.prix)) : 0;
  document.getElementById("statMinPrice").textContent = min ? fmt(min) + " F" : "—";
}

/* ══════════════════
   RENDU ARTICLES ADMIN
══════════════════ */
const catLabels = {
  "complets":         "👕 Complets",
  "chaussures-femme": "👠 Femme",
  "chaussures-homme": "👟 Homme",
  "montres":          "⌚ Montres",
};

function renderAdminArticles(articles) {
  const container = document.getElementById("adminArticles");
  if (!articles || articles.length === 0) {
    container.innerHTML = `<div class="admin-empty">
      <span>📦</span>
      <p>Aucun article. Commencez par en ajouter un !</p>
    </div>`;
    return;
  }

  container.innerHTML = articles.map(a => {
    const imgSrc = PRODUCT_IMAGES[a.image_url] || a.image_url;
    return `
      <div class="admin-article-card" data-id="${a.id}">
        <div class="admin-article-img">
          <img src="${imgSrc}" alt="${a.nom}"/>
          ${a.badge ? `<span class="product-badge ${a.badge}">${a.badge === "promo" ? "🔥" : "✨"}</span>` : ""}
        </div>
        <div class="admin-article-info">
          <p class="admin-article-cat">${catLabels[a.categorie] || a.categorie}</p>
          <p class="admin-article-name">${a.nom}</p>
          <div class="admin-article-price">
            <span class="price-now">${fmt(a.prix)} FCFA</span>
            ${a.ancien_prix ? `<span class="price-old">${fmt(a.ancien_prix)} FCFA</span>` : ""}
          </div>
        </div>
        <div class="admin-article-actions">
          <button class="edit-btn" onclick="openEditModal(${a.id})">✏️ Modifier</button>
          <button class="delete-btn" onclick="openDeleteModal(${a.id}, '${a.nom.replace(/'/g, "\\'")}')">🗑️ Supprimer</button>
        </div>
      </div>
    `;
  }).join("");
}

function fmt(n) { return Number(n).toLocaleString("fr-FR"); }

/* ══════════════════
   MODAL AJOUTER
══════════════════ */
let editingId = null;
let currentImageBase64 = null;

function openAddModal() {
  editingId = null;
  currentImageBase64 = null;
  document.getElementById("modalFormTitle").textContent = "➕ Ajouter un article";
  document.getElementById("formNom").value        = "";
  document.getElementById("formCategorie").value  = "";
  document.getElementById("formPrix").value       = "";
  document.getElementById("formAncienPrix").value = "";
  document.getElementById("formBadge").value      = "";
  document.getElementById("formImageUrl").value   = "";
  document.getElementById("photoPreview").innerHTML = `<span>📷</span><p>Clique pour choisir une photo</p><small>JPG, PNG, WEBP — max 5MB</small>`;
  document.getElementById("articleModal").classList.add("open");
}

function openEditModal(id) {
  const article = allArticles.find(a => a.id === id);
  if (!article) return;

  editingId = id;
  currentImageBase64 = null;

  document.getElementById("modalFormTitle").textContent = "✏️ Modifier l'article";
  document.getElementById("formNom").value        = article.nom;
  document.getElementById("formCategorie").value  = article.categorie;
  document.getElementById("formPrix").value       = article.prix;
  document.getElementById("formAncienPrix").value = article.ancien_prix || "";
  document.getElementById("formBadge").value      = article.badge || "";
  document.getElementById("formImageUrl").value   = article.image_url;

  // Afficher l'image actuelle
  const imgSrc = PRODUCT_IMAGES[article.image_url] || article.image_url;
  document.getElementById("photoPreview").innerHTML =
    `<img src="${imgSrc}" alt="Photo actuelle" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>
     <p style="position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:.7rem;color:#fff;background:rgba(0,0,0,.5);padding:4px">
       Clique pour changer la photo
     </p>`;

  document.getElementById("articleModal").classList.add("open");
}

function closeArticleModal() {
  document.getElementById("articleModal").classList.remove("open");
  editingId = null;
  currentImageBase64 = null;
}

/* ══════════════════
   UPLOAD PHOTO
══════════════════ */
function handlePhotoUpload(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast("❌ Photo trop lourde (max 5MB)", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    currentImageBase64 = e.target.result; // data URI complète
    document.getElementById("photoPreview").innerHTML =
      `<img src="${currentImageBase64}" alt="Aperçu" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>
       <p style="position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:.7rem;color:#fff;background:rgba(0,0,0,.5);padding:4px">
         ✅ Photo sélectionnée
       </p>`;
  };
  reader.readAsDataURL(file);
}

/* ══════════════════
   SAUVEGARDER ARTICLE
══════════════════ */
async function saveArticle() {
  const nom        = document.getElementById("formNom").value.trim();
  const categorie  = document.getElementById("formCategorie").value;
  const prix       = parseInt(document.getElementById("formPrix").value);
  const ancienPrix = parseInt(document.getElementById("formAncienPrix").value) || null;
  const badge      = document.getElementById("formBadge").value || null;
  const existingImageUrl = document.getElementById("formImageUrl").value;

  // Validation
  if (!nom)       { showToast("⚠️ Entrez le nom de l'article", "error"); return; }
  if (!categorie) { showToast("⚠️ Choisissez une catégorie", "error"); return; }
  if (!prix || prix <= 0) { showToast("⚠️ Entrez un prix valide", "error"); return; }

  // Image : nouvelle base64 ou ancienne URL
  const imageUrl = currentImageBase64 || existingImageUrl;
  if (!imageUrl) { showToast("⚠️ Ajoutez une photo", "error"); return; }

  const data = { nom, categorie, prix, ancien_prix: ancienPrix, badge, image_url: imageUrl };

  const btn = document.getElementById("saveArticleBtn");
  btn.textContent = "⏳ Enregistrement...";
  btn.disabled = true;

  try {
    if (editingId) {
      // Modification
      await sbFetch(`articles?id=eq.${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      showToast("✅ Article modifié avec succès !", "success");
    } else {
      // Ajout
      await sbFetch("articles", {
        method: "POST",
        body: JSON.stringify(data),
        prefer: "return=minimal",
      });
      showToast("✅ Article ajouté avec succès !", "success");
    }
    closeArticleModal();
    loadAdminArticles();
  } catch(e) {
    showToast("❌ Erreur : " + e.message, "error");
  } finally {
    btn.textContent = "💾 Enregistrer";
    btn.disabled = false;
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
    loadAdminArticles();
  } catch(e) {
    showToast("❌ Erreur suppression : " + e.message, "error");
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
   INIT EVENTS
══════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  checkLogin();

  // Login
  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("passwordInput").addEventListener("keypress", e => {
    if (e.key === "Enter") login();
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Ouvrir modal ajout
  document.getElementById("openAddModal").addEventListener("click", openAddModal);

  // Fermer modal article
  document.getElementById("cancelArticleModal").addEventListener("click", closeArticleModal);
  document.getElementById("articleModal").addEventListener("click", e => {
    if (e.target.id === "articleModal") closeArticleModal();
  });

  // Upload photo
  document.getElementById("photoUploadArea").addEventListener("click", () => {
    document.getElementById("formPhoto").click();
  });
  document.getElementById("formPhoto").addEventListener("change", e => {
    handlePhotoUpload(e.target.files[0]);
  });
  // Drag & drop
  const uploadArea = document.getElementById("photoUploadArea");
  uploadArea.addEventListener("dragover", e => { e.preventDefault(); uploadArea.classList.add("drag-over"); });
  uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("drag-over"));
  uploadArea.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    handlePhotoUpload(e.dataTransfer.files[0]);
  });

  // Sauvegarder article
  document.getElementById("saveArticleBtn").addEventListener("click", saveArticle);

  // Supprimer
  document.getElementById("confirmDelete").addEventListener("click", deleteArticle);
  document.getElementById("cancelDelete").addEventListener("click", () => {
    document.getElementById("deleteModal").classList.remove("open");
    deleteTargetId = null;
  });
});
