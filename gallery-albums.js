// Album names are transcribed from the church's Google Photos album screenshot.
// The supplied three shared URLs have not been matched to particular album titles.
// Do not guess the association; editors can add verified album URLs later.
window.BOL_GALLERY_ALBUMS = [
  {
    "title": "Annual Dinner 2023",
    "category": "Fellowship",
    "year": "2023",
    "description": "Church family dinner"
  },
  {
    "title": "Annual Thanksgiving - August 2023",
    "category": "Thanksgiving",
    "year": "2023",
    "description": "Thanksgiving celebration"
  },
  {
    "title": "2020 - Covid era",
    "category": "Online Fellowship",
    "year": "2020",
    "description": "Staying connected online"
  },
  {
    "title": "Summer 2018–2019",
    "category": "Community",
    "year": "2018–2019",
    "description": "Moments from earlier summer gatherings"
  },
  {
    "title": "2026 Summer Picnic",
    "category": "Annual Picnic",
    "year": "2026",
    "description": "Summer picnic"
  },
  {
    "title": "May 2026",
    "category": "Community",
    "year": "2026",
    "description": "Memories from May"
  },
  {
    "title": "Annual Picnic - August 2025",
    "category": "Annual Picnic",
    "year": "2025",
    "description": "Our annual picnic"
  },
  {
    "title": "September 2025",
    "category": "Worship & Fellowship",
    "year": "2025",
    "description": "Gathering in September"
  },
  {
    "title": "2024",
    "category": "Community",
    "year": "2024",
    "description": "Church memories from 2024"
  },
  {
    "title": "2022",
    "category": "Community",
    "year": "2022",
    "description": "Church memories from 2022"
  }
];
window.BOL_UNMATCHED_ALBUM_LINKS = [
  "https://photos.app.goo.gl/oSQSwfvKrzyBZJBo6",
  "https://photos.app.goo.gl/2f9TnEXDdTWxZ5PX9",
  "https://photos.app.goo.gl/48BDorZa4daVFPZ89"
];
(function () {
  "use strict";
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;
  const albums = window.BOL_GALLERY_ALBUMS;
  const filters = [...document.querySelectorAll("[data-album-filter]")];
  function safeAlbumUrl(value) {
    try { const u=new URL(value); return u.protocol==="https:" && u.hostname==="photos.app.goo.gl" && /^\\/[A-Za-z0-9_-]+\\/?$/.test(u.pathname) && !u.username && !u.password && !u.search ? u.href : ""; }
    catch {return "";}
  }
  function element(tag,text,cls) { const e=document.createElement(tag); if(text)e.textContent=text; if(cls)e.className=cls;return e; }
  function render(category) {
    grid.replaceChildren();
    albums.filter(a=>category==="All" || a.category===category).forEach(album=>{
      const url=safeAlbumUrl(album.url), card=element(url?"a":"article",null,"photo-card"+(url?"":" album-pending"));
      if(url){card.href=url;card.target="_blank";card.rel="noopener noreferrer";}
      const frame=element("div",null,"photo-frame album-date-cover");
      frame.append(element("span",album.year,"album-year-text"),element("span",album.category,"album-category-text"));
      const info=element("div",null,"photo-info");
      info.append(element("h3",album.title),element("p",album.description));
      if(url) info.append(element("span","View Google Photos album ↗","album-status"));
      card.append(frame,info);grid.append(card);
    });
  }
  filters.forEach(b=>b.addEventListener("click",()=>{
    filters.forEach(t=>{const active=t===b;t.classList.toggle("active",active);t.setAttribute("aria-pressed",String(active));});
    render(b.dataset.albumFilter);
  }));
  render("All");
  const host=document.getElementById("unmatched-photo-links");
  if(host){
    window.BOL_UNMATCHED_ALBUM_LINKS.forEach(url=>{
      if(!safeAlbumUrl(url))return;
      const a=element("a","Browse shared photos ↗","album-shared-link");
      a.href=url;a.target="_blank";a.rel="noopener noreferrer";
      a.setAttribute("aria-label","Open shared Google Photos collection");
      host.append(a);
    });
  }
}());
