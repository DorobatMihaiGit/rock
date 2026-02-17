// ============================================================
// JURNAL - Powered by Convex
// ============================================================
// SETUP: După ce rulezi `npx convex init` și `npx convex dev`,
// copiază URL-ul deployment-ului tău mai jos.
// Exemplu: "https://happy-animal-123.convex.cloud"
// ============================================================

const CONVEX_URL = ""; // <-- PUNE URL-UL TĂU CONVEX AICI

// ============ CONVEX API HELPERS ============

async function convexQuery(functionPath, args = {}) {
    const res = await fetch(`${CONVEX_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: functionPath, args }),
    });
    const data = await res.json();
    if (data.status === "error") {
        throw new Error(data.errorMessage || "Query failed");
    }
    return data.value;
}

async function convexMutation(functionPath, args = {}) {
    const res = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: functionPath, args }),
    });
    const data = await res.json();
    if (data.status === "error") {
        throw new Error(data.errorMessage || "Mutation failed");
    }
    return data.value;
}

// ============ FILE UPLOAD ============

async function uploadFileToConvex(file) {
    // 1. Get presigned upload URL
    const uploadUrl = await convexMutation("journal:generateUploadUrl");

    // 2. Upload file to Convex storage
    const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
    });

    if (!res.ok) throw new Error("Upload failed");

    const { storageId } = await res.json();
    const type = file.type.startsWith("video/") ? "video" : "image";

    return { storageId, type };
}

// ============ ESCAPE HTML ============

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ============ FILE PREVIEW ============

let selectedFiles = [];

function setupFilePreview() {
    const fileInput = document.getElementById("journal-files");
    const uploadArea = document.getElementById("file-upload-area");
    if (!fileInput || !uploadArea) return;

    fileInput.addEventListener("change", () => {
        selectedFiles = Array.from(fileInput.files);
        renderFilePreview();
    });

    // Drag & drop visual feedback
    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", () => {
        uploadArea.classList.remove("dragover");
    });
}

function renderFilePreview() {
    const container = document.getElementById("file-preview");
    if (!container) return;

    if (selectedFiles.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = selectedFiles
        .map((file, index) => {
            const url = URL.createObjectURL(file);
            const isVideo = file.type.startsWith("video/");

            return `
            <div class="file-preview-item" data-index="${index}">
                ${isVideo
                    ? `<video src="${url}" muted></video><span class="video-badge">🎬</span>`
                    : `<img src="${url}" alt="preview">`
                }
                <button class="remove-file" onclick="removeFile(${index})" title="Șterge">×</button>
            </div>
        `;
        })
        .join("");
}

function removeFile(index) {
    selectedFiles.splice(index, 1);

    // Rebuild the file input (can't modify FileList directly)
    const dt = new DataTransfer();
    selectedFiles.forEach((f) => dt.items.add(f));
    document.getElementById("journal-files").files = dt.files;

    renderFilePreview();
}

// ============ FORM SUBMIT ============

function setupJournalForm() {
    const form = document.getElementById("journal-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const author = document.getElementById("journal-author").value.trim();
        const content = document.getElementById("journal-content").value.trim();

        if (!author || !content) {
            showNotification("Te rog completează numele și gândurile tale!", "error");
            return;
        }

        const submitBtn = form.querySelector(".journal-submit-btn");
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Se trimite...";

        try {
            // Upload files
            const media = [];
            if (selectedFiles.length > 0) {
                submitBtn.textContent = `Se încarcă fișierele (0/${selectedFiles.length})...`;
                for (let i = 0; i < selectedFiles.length; i++) {
                    submitBtn.textContent = `Se încarcă fișierele (${i + 1}/${selectedFiles.length})...`;
                    const uploaded = await uploadFileToConvex(selectedFiles[i]);
                    media.push(uploaded);
                }
            }

            // Add entry
            submitBtn.textContent = "Se salvează...";
            await convexMutation("journal:addEntry", { author, content, media });

            // Reset
            form.reset();
            selectedFiles = [];
            renderFilePreview();

            showNotification("Gândurile tale au fost adăugate! 💕", "success");

            // Reload entries
            await loadJournalEntries();
        } catch (err) {
            console.error("Error adding entry:", err);
            showNotification("A apărut o eroare. Încearcă din nou!", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// ============ NOTIFICATION ============

function showNotification(message, type = "success") {
    // Remove existing notification
    const existing = document.querySelector(".journal-notification");
    if (existing) existing.remove();

    const notif = document.createElement("div");
    notif.className = `journal-notification ${type}`;
    notif.textContent = message;
    notif.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 2rem;
        border-radius: 50px;
        font-weight: 600;
        font-size: 0.95rem;
        z-index: 9999;
        animation: slideDown 0.4s ease;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        ${type === "success"
            ? "background: linear-gradient(135deg, #ff9a8b, #ff6a88); color: white;"
            : "background: #fff0f0; color: #d32f2f; border: 1px solid #ffcdd2;"
        }
    `;

    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = "0";
        notif.style.transition = "opacity 0.3s ease";
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ============ LOAD & RENDER ENTRIES ============

async function loadJournalEntries() {
    try {
        const entries = await convexQuery("journal:getEntries");
        renderJournalEntries(entries);
    } catch (err) {
        console.error("Error loading entries:", err);
        const container = document.getElementById("journal-entries");
        if (container) {
            container.innerHTML =
                '<p class="journal-empty">Nu s-au putut încărca intrările. Verifică conexiunea. 🔄</p>';
        }
    }
}

function renderJournalEntries(entries) {
    const container = document.getElementById("journal-entries");
    if (!container) return;

    if (!entries || entries.length === 0) {
        container.innerHTML =
            '<p class="journal-empty">Fii primul care scrie în jurnalul nostru! ✨</p>';
        return;
    }

    container.innerHTML = entries
        .map((entry) => {
            const date = new Date(entry.createdAt).toLocaleDateString("ro-RO", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });

            const validMedia = (entry.mediaUrls || []).filter((m) => m.url);
            const mediaClass = validMedia.length === 1 ? "entry-media single-media" : "entry-media";

            const mediaHtml =
                validMedia.length > 0
                    ? `<div class="${mediaClass}">
                    ${validMedia
                        .map((m) => {
                            if (m.type === "video") {
                                return `<video src="${m.url}" controls class="entry-video" preload="metadata"></video>`;
                            }
                            return `<img src="${m.url}" class="entry-image" loading="lazy" alt="Amintire" onclick="openJournalLightbox('${m.url}')">`;
                        })
                        .join("")}
                </div>`
                    : "";

            return `
            <div class="journal-entry">
                <div class="entry-header">
                    <span class="entry-author">✍️ ${escapeHtml(entry.author)}</span>
                    <span class="entry-date">${date}</span>
                </div>
                <p class="entry-content">${escapeHtml(entry.content)}</p>
                ${mediaHtml}
            </div>
        `;
        })
        .join("");
}

// ============ LIGHTBOX ============

function openJournalLightbox(url) {
    const lightbox = document.getElementById("journal-lightbox");
    const img = document.getElementById("lightbox-image");
    if (!lightbox || !img) return;
    img.src = url;
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeJournalLightbox() {
    const lightbox = document.getElementById("journal-lightbox");
    if (!lightbox) return;
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
}

// Close lightbox with Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeJournalLightbox();
});

// ============ INIT ============

document.addEventListener("DOMContentLoaded", () => {
    if (!CONVEX_URL) {
        const container = document.getElementById("journal-entries");
        if (container) {
            container.innerHTML = `
                <div class="journal-setup-msg" style="text-align:center; padding:2rem; background:var(--bg-light); border-radius:20px; color:var(--text-muted);">
                    <p style="font-size:2rem; margin-bottom:1rem;">🔧</p>
                    <p style="font-size:1.1rem; font-weight:600; margin-bottom:0.5rem;">Jurnalul trebuie configurat</p>
                    <p>Rulează <code>npx convex init</code> și apoi <code>npx convex dev</code></p>
                    <p style="margin-top:0.5rem;">Apoi adaugă URL-ul Convex în <code>journal.js</code></p>
                </div>
            `;
        }
        // Still setup form UI features
        setupFilePreview();
        return;
    }

    setupFilePreview();
    setupJournalForm();
    loadJournalEntries();

    // Auto-refresh entries every 30 seconds
    setInterval(loadJournalEntries, 30000);
});
