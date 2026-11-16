/* Approved album links only. Add rows as:
 {date:"2026-08-02", name:"BOL Church Anniversary", albumUrl:"https://photos.app.goo.gl/..."}
 Do not place invented or private Google Photos links here. */
window.BOL_SPECIAL_EVENTS = window.BOL_SPECIAL_EVENTS || [
 {date:"",name:"BOL Church Anniversary",albumUrl:""},
 {date:"",name:"Annual Summer Picnic",albumUrl:""},
 {date:"",name:"BOL Chess Championship",albumUrl:""},
 {date:"",name:"December Fellowship Brunch",albumUrl:""}
];
(function(){"use strict";
 const host=document.getElementById("church-event-rows");if(!host)return;
 window.BOL_SPECIAL_EVENTS.forEach(event=>{
  const row=document.createElement("tr");
  const date=document.createElement("td");date.textContent=event.date||"Date to confirm";
  const title=document.createElement("td");title.textContent=event.name;
  const album=document.createElement("td");
  let url=null;try{const p=new URL(event.albumUrl);if(p.protocol==="https:"&&["photos.app.goo.gl","photos.google.com"].includes(p.hostname))url=p.href}catch(e){}
  if(url){const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="View Google Photos album ↗";album.append(a)}
  else{album.textContent="Album coming soon";}
  row.append(date,title,album);host.append(row);
 });
}());