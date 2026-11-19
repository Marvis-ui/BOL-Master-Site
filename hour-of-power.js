(function(){
"use strict";
const records=Array.isArray(window.BOL_HOUR_OF_POWER)?window.BOL_HOUR_OF_POWER:[];
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Vienna",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const sorted=records.filter(r=>r.published===true && r.date<=today).sort((a,b)=>b.date.localeCompare(a.date));
const devotionals=sorted.filter(r=>r.kind==="devotional"),quotes=sorted.filter(r=>r.kind==="quote");
let index=0;
const byId=id=>document.getElementById(id);
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const format=d=>new Date(d+"T12:00:00Z").toLocaleDateString("en-GB",{weekday:"long",day:"2-digit",month:"long",year:"numeric",timeZone:"Europe/Vienna"});
function render(){
 const host=byId("hop-devotional"),archive=byId("hop-archive");
 host.replaceChildren();archive.replaceChildren();
 byId("hop-prev").disabled=index>=devotionals.length-1;
 byId("hop-next").disabled=index<=0;
 const r=devotionals[index];
 if(!r){host.append(make("p","No devotionals have been published yet."));}
 else {
 host.append(make("p",format(r.date),"eyebrow"),make("h2",r.title));
 if(r.scripture)host.append(make("p",r.scripture,"hop-scripture"));
 if(r.quote)host.append(make("blockquote",r.quote,"hop-main-quote"));
 if(r.story)host.append(make("h3","Introduction"),make("p",r.story,"hop-story"));
 if(r.lessons&&r.lessons.length){host.append(make("h3","Key lessons"));const list=make("ol",null,"hop-lessons");r.lessons.forEach(t=>list.append(make("li",t)));host.append(list);}
 if(r.referenceUrl){try{const u=new URL(r.referenceUrl);if(u.protocol==="https:"){const link=make("a",r.referenceTitle||"Explore the reference","button-secondary");link.href=u.href;link.target="_blank";link.rel="noopener noreferrer";host.append(link);}}catch{}}
 }
 devotionals.forEach((entry,i)=>{const b=make("button",null,"hop-archive-item");b.type="button";b.setAttribute("aria-pressed",String(i===index));b.append(make("span",format(entry.date)),make("strong",entry.title));b.onclick=()=>{index=i;render();host.scrollIntoView({block:"nearest"});};archive.append(b);});
 if(!devotionals.length)archive.append(make("p","Previous devotionals will appear here."));
 const q=quotes[0],quoteHost=byId("hop-weekly-quote");quoteHost.hidden=!q;quoteHost.replaceChildren();
 if(q)quoteHost.append(make("p","Latest Hour of Power quote","eyebrow"),make("blockquote",q.quote),make("p",[q.speaker,q.theme,format(q.date)].filter(Boolean).join(" · ")));
}
byId("hop-prev").onclick=()=>{if(index<devotionals.length-1){index++;render();}};
byId("hop-next").onclick=()=>{if(index>0){index--;render();}};
render();
}());
