// ============================================================
// JURNAL SCRAPBOOK - Powered by Convex
// ============================================================

const CONVEX_URL = "https://dependable-chameleon-510.convex.cloud";

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
    const uploadUrl = await convexMutation("journal:generateUploadUrl");
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
    if (selectedFiles.length === 0) { container.innerHTML = ""; return; }

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
            </div>`;
        }).join("");
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    const dt = new DataTransfer();
    selectedFiles.forEach((f) => dt.items.add(f));
    document.getElementById("journal-files").files = dt.files;
    renderFilePreview();
}

// ============ TEXT PAPER SELECTION ============

let selectedTextPaper = null;

function selectTextPaper(el) {
    // Toggle selection
    const allOptions = document.querySelectorAll(".paper-option");
    const wasSelected = el.classList.contains("selected");

    allOptions.forEach(opt => opt.classList.remove("selected"));

    if (wasSelected) {
        selectedTextPaper = null;
        document.getElementById("scrapbook-area").style.display = "none";
    } else {
        el.classList.add("selected");
        selectedTextPaper = el.getAttribute("data-paper");
        showScrapbookPreview();
    }
}

function showScrapbookPreview() {
    const area = document.getElementById("scrapbook-area");
    const bgImg = document.getElementById("preview-paper-bg");
    const previewText = document.getElementById("preview-text");

    area.style.display = "block";
    bgImg.src = `text%20papers/${encodeURIComponent(selectedTextPaper).replace(/%20/g, '%20')}`;

    // Sync text content to preview
    const content = document.getElementById("journal-content").value || "Textul tău va apărea aici...";
    previewText.textContent = content;

    // Clear old stickers from preview
    clearAllStickers();
}

// Live-sync text content to preview
function setupLivePreview() {
    const textarea = document.getElementById("journal-content");
    if (!textarea) return;

    textarea.addEventListener("input", () => {
        const previewText = document.getElementById("preview-text");
        if (previewText && selectedTextPaper) {
            previewText.textContent = textarea.value || "Textul tău va apărea aici...";
        }
    });
}

// ============ STICKER SYSTEM ============

let placedStickers = [];
let stickerIdCounter = 0;

function addStickerToPreview(stickerName) {
    if (!selectedTextPaper) {
        showNotification("Alege mai întâi un text paper!", "error");
        return;
    }

    const preview = document.getElementById("scrapbook-preview");
    const stickerId = `sticker-${stickerIdCounter++}`;

    // Random initial position (center area)
    const x = 50 + (Math.random() - 0.5) * 40;
    const y = 50 + (Math.random() - 0.5) * 40;

    const stickerEl = document.createElement("div");
    stickerEl.className = "placed-sticker";
    stickerEl.id = stickerId;
    stickerEl.setAttribute("data-sticker", stickerName);
    stickerEl.style.left = `${x}%`;
    stickerEl.style.top = `${y}%`;
    stickerEl.innerHTML = `
        <img src="stickers/${encodeURIComponent(stickerName)}" alt="sticker" draggable="false">
        <button type="button" class="remove-sticker" onclick="event.stopPropagation(); removeSticker('${stickerId}')" title="Șterge sticker">×</button>
        <div class="sticker-controls">
            <button type="button" class="resize-sticker-btn" onclick="event.stopPropagation(); resizeSticker('${stickerId}', -1)" title="Micșorează">−</button>
            <button type="button" class="resize-sticker-btn" onclick="event.stopPropagation(); resizeSticker('${stickerId}', 1)" title="Mărește">+</button>
        </div>
    `;

    preview.appendChild(stickerEl);

    // Make draggable
    makeDraggable(stickerEl, preview);

    placedStickers.push({ id: stickerId, name: stickerName, x, y, scale: 1 });
}

function removeSticker(stickerId) {
    const el = document.getElementById(stickerId);
    if (el) el.remove();
    placedStickers = placedStickers.filter(s => s.id !== stickerId);
}

function resizeSticker(stickerId, direction) {
    const el = document.getElementById(stickerId);
    const sticker = placedStickers.find(s => s.id === stickerId);
    if (!el || !sticker) return;

    const step = 0.15;
    const minScale = 0.4;
    const maxScale = 2.5;
    const newScale = Math.max(minScale, Math.min(maxScale, (sticker.scale || 1) + direction * step));

    sticker.scale = newScale;
    el.style.width = `${70 * newScale}px`;
    el.style.height = `${70 * newScale}px`;
}

function clearAllStickers() {
    const preview = document.getElementById("scrapbook-preview");
    if (!preview) return;
    preview.querySelectorAll(".placed-sticker").forEach(el => el.remove());
    placedStickers = [];
}

// ============ STICKER CATEGORY TABS ============

function switchStickerTab(category) {
    // Update tab buttons
    document.querySelectorAll(".sticker-tab").forEach(tab => tab.classList.remove("active"));
    document.querySelector(`.sticker-tab[onclick*="'${category}'"]`).classList.add("active");

    // Show matching category, hide others
    document.querySelectorAll(".sticker-category").forEach(cat => cat.classList.remove("active"));
    document.getElementById(`sticker-cat-${category}`).classList.add("active");
}

function makeDraggable(stickerEl, container) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    // Pinch-to-zoom state
    let isPinching = false;
    let initialPinchDist = null;
    let initialPinchScale = 1;

    function getTouchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    const onPointerDown = (e) => {
        if (e.target.classList.contains("remove-sticker") || e.target.classList.contains("resize-sticker-btn")) return;
        e.preventDefault();

        // Pinch start (2 fingers)
        if (e.touches && e.touches.length === 2) {
            isPinching = true;
            isDragging = false;
            initialPinchDist = getTouchDist(e.touches);
            const sticker = placedStickers.find(s => s.id === stickerEl.id);
            initialPinchScale = sticker ? (sticker.scale || 1) : 1;
            stickerEl.classList.add("dragging");
            return;
        }

        isDragging = true;
        stickerEl.classList.add("dragging");

        const rect = container.getBoundingClientRect();
        startX = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        startY = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
        initialLeft = parseFloat(stickerEl.style.left);
        initialTop = parseFloat(stickerEl.style.top);
    };

    const onPointerMove = (e) => {
        // Pinch zoom
        if (isPinching && e.touches && e.touches.length === 2) {
            e.preventDefault();
            const currentDist = getTouchDist(e.touches);
            const ratio = currentDist / initialPinchDist;
            const minScale = 0.4;
            const maxScale = 2.5;
            const newScale = Math.max(minScale, Math.min(maxScale, initialPinchScale * ratio));

            const sticker = placedStickers.find(s => s.id === stickerEl.id);
            if (sticker) sticker.scale = newScale;

            stickerEl.style.width = `${70 * newScale}px`;
            stickerEl.style.height = `${70 * newScale}px`;
            return;
        }

        if (!isDragging) return;
        e.preventDefault();

        const rect = container.getBoundingClientRect();
        const currentX = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        const currentY = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

        const deltaXPercent = ((currentX - startX) / rect.width) * 100;
        const deltaYPercent = ((currentY - startY) / rect.height) * 100;

        const newLeft = Math.max(0, Math.min(90, initialLeft + deltaXPercent));
        const newTop = Math.max(0, Math.min(90, initialTop + deltaYPercent));

        stickerEl.style.left = `${newLeft}%`;
        stickerEl.style.top = `${newTop}%`;
    };

    const onPointerUp = (e) => {
        if (isPinching) {
            // End pinch only when fewer than 2 fingers remain
            if (!e.touches || e.touches.length < 2) {
                isPinching = false;
                initialPinchDist = null;
                stickerEl.classList.remove("dragging");
            }
            return;
        }
        if (!isDragging) return;
        isDragging = false;
        stickerEl.classList.remove("dragging");

        // Update sticker position in placedStickers array
        const id = stickerEl.id;
        const sticker = placedStickers.find(s => s.id === id);
        if (sticker) {
            sticker.x = parseFloat(stickerEl.style.left);
            sticker.y = parseFloat(stickerEl.style.top);
        }
    };

    // Mouse events
    stickerEl.addEventListener("mousedown", onPointerDown);
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);

    // Touch events
    stickerEl.addEventListener("touchstart", onPointerDown, { passive: false });
    stickerEl.addEventListener("touchmove", onPointerMove, { passive: false });
    stickerEl.addEventListener("touchend", onPointerUp, { passive: false });
}

// ============ GET STICKER DATA FOR SUBMIT ============

function getStickersData() {
    return placedStickers.map(s => ({
        name: s.name,
        x: s.x,
        y: s.y,
        scale: s.scale || 1,
    }));
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

            // Build mutation args
            const mutationArgs = { author, content, media };
            if (selectedTextPaper) {
                mutationArgs.textPaper = selectedTextPaper;
            }
            const stickersData = getStickersData();
            if (stickersData.length > 0) {
                mutationArgs.stickers = stickersData;
            }

            submitBtn.textContent = "Se salvează...";
            await convexMutation("journal:addEntry", mutationArgs);

            // Reset everything
            form.reset();
            selectedFiles = [];
            renderFilePreview();
            selectedTextPaper = null;
            placedStickers = [];
            document.querySelectorAll(".paper-option").forEach(o => o.classList.remove("selected"));
            document.getElementById("scrapbook-area").style.display = "none";

            showNotification("Gândurile tale au fost adăugate! 💕", "success");
            lastEntriesJSON = null; // Force re-render on next load
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

let lastEntriesJSON = null;

async function loadJournalEntries() {
    try {
        const entries = await convexQuery("journal:getEntries");
        const entriesJSON = JSON.stringify(entries);

        // Only re-render if data actually changed (prevents flicker)
        if (entriesJSON === lastEntriesJSON) return;
        lastEntriesJSON = entriesJSON;

        renderJournalEntries(entries);
    } catch (err) {
        console.error("Error loading entries:", err);
        const container = document.getElementById("journal-entries");
        if (container && !lastEntriesJSON) {
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

            // Scrapbook note with text paper + stickers
            let scrapbookHtml = "";
            if (entry.textPaper) {
                const stickersHtml = (entry.stickers || [])
                    .map(s => {
                        const scale = s.scale || 1;
                        const size = Math.round(60 * scale);
                        return `<img src="stickers/${encodeURIComponent(s.name)}" class="entry-sticker" style="left:${s.x}%;top:${s.y}%;width:${size}px;height:${size}px" alt="sticker">`;
                    })
                    .join("");

                scrapbookHtml = `
                <div class="entry-scrapbook-note">
                    <img src="text%20papers/${encodeURIComponent(entry.textPaper)}" class="entry-paper-bg" alt="text paper">
                    <p class="entry-paper-text">${escapeHtml(entry.content)}</p>
                    ${stickersHtml}
                </div>`;
            }

            return `
            <div class="journal-entry ${entry.textPaper ? 'has-scrapbook' : ''}">
                <div class="entry-header">
                    <span class="entry-author">✍️ ${escapeHtml(entry.author)}</span>
                    <span class="entry-date">${date}</span>
                </div>
                ${scrapbookHtml
                    ? scrapbookHtml
                    : `<p class="entry-content">${escapeHtml(entry.content)}</p>`
                }
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
        setupFilePreview();
        return;
    }

    setupFilePreview();
    setupJournalForm();
    setupLivePreview();
    loadJournalEntries();

    setInterval(loadJournalEntries, 30000);
});
