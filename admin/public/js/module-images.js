/* Image management functions for module editors */

let pendingReplaceTarget = null;

async function scanPageImages() {
    var grid = document.getElementById("pageImagesGrid");
    if (!grid) return;
    grid.innerHTML = '<p style="grid-column:1/-1;color:var(--admin-text-light);padding:20px;text-align:center;">Scanning...</p>';
    try {
        var actualFile = MODULE === "home" ? "index.html" : (currentPage === "index" ? MODULE + "/index.html" : MODULE + "/" + currentPage + ".html");
        var data = await apiGet("/api/page-images?file=" + encodeURIComponent(actualFile));
        if (!data || data.images.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;color:var(--admin-text-light);padding:20px;text-align:center;">No images found on this page.</p>';
            return;
        }
        var html = "";
        for (var i = 0; i < data.images.length; i++) {
            var img = data.images[i];
            var previewSrc = img.src;
            if (previewSrc.startsWith("image/")) previewSrc = "../" + previewSrc;
            html += '<div class="image-card">';
            html += '<img class="image-card__preview" src="' + previewSrc + '" alt="' + (img.alt || '') + '" loading="lazy" onerror="this.style.opacity=\'0.2\'">';
            html += '<div class="image-card__info">';
            html += '<div class="image-card__name">#' + (i+1) + ': ' + (img.alt || 'Image') + '</div>';
            html += '<div class="image-card__meta">' + (img.isExternal ? 'External' : 'Local') + '</div>';
            html += '</div>';
            html += '<div class="image-card__actions">';
            html += '<button class="btn btn-primary btn-sm image-replace-btn" data-file="' + actualFile + '" data-selector="' + img.selector.replace(/&/g,'&amp;').replace(/"/g,'&quot;') + '" style="font-size:11px;padding:5px 10px;"><i class="fas fa-exchange-alt"></i> Replace</button>';
            html += '</div></div>';
        }
        grid.innerHTML = html;
    } catch (e) {
        grid.innerHTML = '<p style="grid-column:1/-1;color:var(--admin-danger);padding:20px;text-align:center;">Failed to scan images.</p>';
    }
}

// Delegated click for Replace buttons
document.addEventListener("click", function(e) {
    var btn = e.target.closest(".image-replace-btn");
    if (!btn) return;
    var file = btn.getAttribute("data-file");
    var sel = btn.getAttribute("data-selector");
    if (file && sel) {
        pendingReplaceTarget = { file: file, selector: sel };
        var overlay = document.getElementById("pickerModalOverlay");
        if (overlay) overlay.classList.add("active");
        loadPickerImages();
    }
});

function closePickerModal() {
    var overlay = document.getElementById("pickerModalOverlay");
    if (overlay) overlay.classList.remove("active");
    pendingReplaceTarget = null;
}

async function loadPickerImages() {
    var grid = document.getElementById("pickerImageGrid");
    if (!grid) return;
    grid.innerHTML = '<p style="grid-column:1/-1;color:var(--admin-text-light);padding:20px;text-align:center;">Loading...</p>';
    try {
        var images = await apiGet("/api/images");
        if (!images || images.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;color:var(--admin-text-light);padding:20px;text-align:center;">No images in library.</p>';
            return;
        }
        var html = "";
        for (var j = 0; j < images.length; j++) {
            var img = images[j];
            html += '<div class="image-card picker-image-card" style="cursor:pointer;" data-image-id="' + img.id + '">';
            html += '<img class="image-card__preview" src="../' + img.path + '" alt="' + img.originalName + '" loading="lazy" onerror="this.style.opacity=\'0.2\'">';
            html += '<div class="image-card__info"><div class="image-card__name">' + img.originalName + '</div>';
            html += '<div class="image-card__meta">' + formatSize(img.size) + '</div></div>';
            html += '</div>';
        }
        grid.innerHTML = html;
    } catch (e) {
        grid.innerHTML = '<p style="grid-column:1/-1;color:var(--admin-danger);padding:20px;text-align:center;">Failed to load library.</p>';
    }
}

// Delegated click for picker images
document.addEventListener("click", function(e) {
    var card = e.target.closest(".picker-image-card");
    if (!card) return;
    var imageId = card.getAttribute("data-image-id");
    if (imageId && pendingReplaceTarget) {
        doReplaceImage(imageId);
    }
});

async function doReplaceImage(imageId) {
    if (!pendingReplaceTarget) return;
    try {
        var result = await apiPost("/api/mount-image", {
            imageId: imageId,
            filePath: pendingReplaceTarget.file,
            selector: pendingReplaceTarget.selector,
            attribute: "src"
        });
        if (result && result.success) {
            showToast("Image replaced!", "success");
            closePickerModal();
            scanPageImages();
        } else {
            showToast(result ? (result.error || "Replace failed") : "Replace failed", "error");
        }
    } catch (e) {
        showToast("Replace failed", "error");
    }
}
