(function () {
 "use strict";
 const host = document.getElementById("home-upcoming-events");
 if (!host) return;
 const onlineMeetingUrl = "contact.html#online-gatherings";
 const now = new Date(); now.setHours(0,0,0,0);
 const entries = [];
 const add = (date,title,time,place) => { if(date >= now) entries.push({date,title,time,place}); };
 const nth = (y,m,weekday,which) => {
   const last = new Date(y,m+1,0).getDate();
   if (which === -1) return last - (new Date(y,m,last).getDay()-weekday+7)%7;
   return 1+(weekday-new Date(y,m,1).getDay()+7)%7+(which-1)*7;
 };
 for(let offset=0;offset<100;offset++){
   const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset);
   const y=date.getFullYear(),m=date.getMonth(),d=date.getDate(),day=date.getDay();
   if(day===0) add(date,"Sunday Worship & Hour of Power","Time: see church notice","Onsite");
   if(day===4) add(date,"Weekly Bible Study","8:00 PM","Online");
   if(d>=1 && d<=3) add(date,"Monthly Worship","8:00 PM","Online");
   if(day===5 && d===nth(y,m,5,1)) add(date,"Night Vigil","10:30 PM","Online");
   if(day===6 && d===nth(y,m,6,-1)) add(date,"Revival Prayer","6:30 PM","Online");
   if(day===0 && d===nth(y,m,0,1)) add(date,"Thanksgiving & Communion","10:00 AM","Onsite");
   if(y===2026 && date>=new Date(2026,1,9) && date<=new Date(2026,3,3) && day>0 && day<6) add(date,"40 Days Prayer","Daily focus","Location: see church notice");
 }
 for(const e of window.BOL_CALENDAR_EDITS||[]){
   const [y,m,d]=e.date.split("-").map(Number);
   const dates=e.mode==="birthday"?[now.getFullYear(),now.getFullYear()+1].map(year=>new Date(year,m-1,d)):[new Date(y,m-1,d)];
   for(const date of dates){
     if(date<now||date>new Date(now.getFullYear(),now.getMonth(),now.getDate()+100))continue;
     if(["replace","cancel"].includes(e.mode)){
       const title=e.original.split(" · ")[0];
       for(let i=entries.length-1;i>=0;i--)if(+entries[i].date===+date&&(entries[i].title===title||(title.startsWith("Sunday Service")&&entries[i].title.startsWith("Sunday Worship"))||(title.startsWith("Monthly Thanksgiving")&&entries[i].title.startsWith("Thanksgiving"))))entries.splice(i,1);
     }
     if(e.mode!=="cancel")add(date,e.mode==="birthday"?"🎂 "+e.title+" · Birthday":e.title,e.time||"All day",e.place||"");
   }
 }
 const fmt = new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"});
 host.replaceChildren();
 entries.sort((a,b)=>a.date-b.date||a.title.localeCompare(b.title));
 const selected=entries.slice(0,12);
 if(!selected.length){host.textContent="Check the full calendar for our gatherings.";return;}
 selected.forEach(item=>{
   const article=document.createElement("a");article.className="upcoming-card upcoming-event-link"; article.dataset.kind = /Sunday|Thanksgiving/.test(item.title) ? "sunday" : /Bible Study/.test(item.title) ? "study" : /Revival/.test(item.title) ? "revival" : /Monthly Worship/.test(item.title) ? "worship" : /Vigil/.test(item.title) ? "vigil" : "prayer";
   const online=item.place==="Online";
   const onsite=item.place==="Onsite";
   article.href=online ? onlineMeetingUrl : onsite ? "contact.html#church-location" : "calendar.html";
   
   const action=online ? "Request meeting access" : onsite ? "View church location" : "View activity details";
   article.setAttribute("aria-label",item.title+", "+fmt.format(item.date)+", "+item.time+". "+action);
   const date=document.createElement("span");date.className="upcoming-date";const day=document.createElement("strong");day.textContent=String(item.date.getDate());const month=document.createElement("small");month.textContent=new Intl.DateTimeFormat("en-GB",{month:"short"}).format(item.date).toUpperCase();date.append(day,month);
   const h=document.createElement("h3");h.textContent=item.title;
   const info=document.createElement("p");info.textContent=item.time+" · "+item.place;
   const cue=document.createElement("span");cue.className="upcoming-action";cue.textContent=action+" →";
   const copy=document.createElement("div");copy.className="upcoming-copy";copy.append(h,info,cue);article.append(date,copy);host.appendChild(article);
 });
 const prev=document.querySelector(".event-slide-prev"),next=document.querySelector(".event-slide-next");
 const refresh=()=>{if(prev)prev.disabled=host.scrollLeft<2;if(next)next.disabled=host.scrollLeft+host.clientWidth>=host.scrollWidth-2;};
 const move=direction=>host.scrollBy({left:direction*((host.querySelector(".upcoming-card")?.getBoundingClientRect().width||280)+12),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
 prev?.addEventListener("click",()=>move(-1));next?.addEventListener("click",()=>move(1));host.addEventListener("scroll",refresh,{passive:true});window.addEventListener("resize",refresh);refresh();
}());