/* Add only approved, publicly shareable Google Drive documents here.
 Example: 2024: [{ title: "Annual programme", url: "https://drive.google.com/file/d/...", type: "Programme" }]
 Never put private documents or authentication keys in this file. */
window.BOL_ARCHIVE_DOCUMENTS = window.BOL_ARCHIVE_DOCUMENTS || {};
window.BOL_HOPE_RECORDS = window.BOL_HOPE_RECORDS || [];
(function(){
 "use strict";
 const years=document.getElementById("archive-years");
 const detail=document.getElementById("archive-detail");
 const safeLink=(url)=>{try{const p=new URL(url);return p.protocol==="https:" && (/^(drive|docs)\.google\.com$/.test(p.hostname))?p.href:null}catch(e){return null}};
 if(years&&detail){
  for(let year=new Date().getFullYear();year>=2012;year--){
   const records=window.BOL_ARCHIVE_DOCUMENTS[year]||[];
   const btn=document.createElement("button");btn.type="button";btn.className="archive-year";
   const name=document.createElement("strong");name.textContent=String(year);
   const hint=document.createElement("span");hint.textContent=records.length?records.length+" document(s)":"Explore this year";
   btn.append(name,hint);
   btn.addEventListener("click",()=>{
    detail.replaceChildren();
    const h=document.createElement("h2");h.textContent=year+" Archive";detail.append(h);
    if(!records.length){const p=document.createElement("p");p.textContent="No public archive documents have been added for this year yet.";detail.append(p);return}
    const list=document.createElement("ul");list.className="document-list";
    records.forEach(r=>{const url=safeLink(r.url);if(!url)return;const li=document.createElement("li"),a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=r.title+" ↗";li.append(a);list.append(li)});
    detail.append(list);
   });
   years.append(btn);
  }
 }
 const hope=document.getElementById("hope-archive-list");
 if(hope){
  const list=document.createElement("ul");list.className="document-list";
  window.BOL_HOPE_RECORDS.forEach(r=>{const url=safeLink(r.url);if(!url)return;const li=document.createElement("li"),a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=r.title+" ↗";li.append(a);list.append(li)});
  if(list.children.length){hope.append(list);const msg=document.getElementById("hope-archive-status");if(msg)msg.textContent="Explore approved historical records below."}
 }
}());