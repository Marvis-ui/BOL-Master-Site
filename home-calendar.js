(function () {
 "use strict";
 const host = document.getElementById("home-upcoming-events");
 if (!host) return;
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
 const fmt = new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"});
 host.replaceChildren();
 entries.sort((a,b)=>a.date-b.date||a.title.localeCompare(b.title));
 const selected=entries.slice(0,4);
 if(!selected.length){host.textContent="Check the full calendar for our gatherings.";return;}
 selected.forEach(item=>{
   const article=document.createElement("article");article.className="upcoming-card";
   const date=document.createElement("span");date.className="upcoming-date";date.textContent=fmt.format(item.date);
   const h=document.createElement("h3");h.textContent=item.title;
   const info=document.createElement("p");info.textContent=item.time+" · "+item.place;
   article.append(date,h,info);host.appendChild(article);
 });
}());