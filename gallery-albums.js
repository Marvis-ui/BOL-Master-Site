/* Add the restricted Google Drive folder URL to driveUrl when each album is ready.
   Keep access Restricted in Google Drive; this website does not grant access.
   Use decorative/public covers only, not private album photographs. */
window.BOL_GALLERY_ALBUMS = [
    { title: "BOL Church Anniversary", category: "Special Events", cover: "", symbol: "✦", description: "Celebrating God's faithfulness together on the first Sunday of August.", driveUrl: "" },
    { title: "Annual Summer Picnic", category: "Annual Picnic", cover: "", symbol: "☀", description: "Food, games, and outdoor fellowship with the entire church family.", driveUrl: "" },
    { title: "BOL Chess Championship", category: "Chess Championship", cover: "", symbol: "♞", description: "Memories from our annual August chess championship.", driveUrl: "" },
    { title: "Shared Church Album 1", category: "Shared Albums", cover: "", symbol: "✧", description: "Photographs shared by our church family.", driveUrl: "https://photos.app.goo.gl/oSQSwfvKrzyBZJBo6" },
    { title: "Shared Church Album 2", category: "Shared Albums", cover: "", symbol: "✧", description: "Photographs shared by our church family.", driveUrl: "https://photos.app.goo.gl/2f9TnEXDdTWxZ5PX9" },
    { title: "Shared Church Album 3", category: "Shared Albums", cover: "", symbol: "✧", description: "Photographs shared by our church family.", driveUrl: "https://photos.app.goo.gl/48BDorZa4daVFPZ89" }
];

(function () {
    "use strict";
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;
    const filters = Array.from(document.querySelectorAll("[data-album-filter]"));
    const albums = window.BOL_GALLERY_ALBUMS;
    function folderUrl(value) {
        try {
            const url = new URL(value);
            if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return "";
            if (url.hostname === "photos.app.goo.gl" && /^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) return url.href;
            if (url.hostname === "drive.google.com" && /^\/(?:drive\/(?:u\/\d+\/)?)?folders\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) return url.href;
            return "";
        } catch (_) { return ""; }
    }
    function render(category) {
        grid.replaceChildren();
        albums.filter(album => category === "All" || album.category === category).forEach(album => {
            const url = folderUrl(album.driveUrl);
            const card = document.createElement(url ? "a" : "article");
            card.className = "photo-card" + (url ? "" : " album-pending");
            if (url) {
                card.href = url; card.target = "_blank"; card.rel = "noopener noreferrer";
                card.setAttribute("aria-label", "Open " + album.title + " (opens in a new tab)");
            }
            const frame = document.createElement("div"); frame.className = "photo-frame";
            if (album.cover) {
                const image = document.createElement("img"); image.src = album.cover; image.alt = ""; image.loading = "lazy";
                frame.append(image);
            } else {
                frame.classList.add("album-preview");
                frame.setAttribute("aria-hidden", "true");
                const symbol = document.createElement("span"); symbol.className = "album-preview-symbol"; symbol.textContent = album.symbol || "✦";
                const caption = document.createElement("span"); caption.className = "album-preview-caption"; caption.textContent = album.category;
                frame.append(symbol, caption);
            }
            const info = document.createElement("div"); info.className = "photo-info";
            const label = document.createElement("span"); label.className = "photo-cat"; label.textContent = album.category;
            const title = document.createElement("h3"); title.textContent = album.title;
            const description = document.createElement("p"); description.textContent = album.description;
            const status = document.createElement("span"); status.className = "album-status";
            status.textContent = url ? "Open photo album ↗" : "Album coming soon";
            info.append(label, title, description, status);
            card.append(frame, info); grid.append(card);
        });
    }
    filters.forEach(button => button.addEventListener("click", () => {
        filters.forEach(filter => {
            const active = filter === button;
            filter.classList.toggle("active", active);
            filter.setAttribute("aria-pressed", String(active));
        });
        render(button.dataset.albumFilter);
    }));
    render("All");
}());
