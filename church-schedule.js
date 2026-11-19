(function () {
  "use strict";
  const host = document.getElementById("calendar-agenda-list");
  const yearPicker = document.getElementById("calendar-year");
  const monthPicker = document.getElementById("calendar-month");
  if (!host || !yearPicker || !monthPicker) return;
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date();
  function nthWeekday(y,m,weekday,nth) {
    if (nth === -1) { const last=new Date(y,m+1,0);return last.getDate()-(last.getDay()-weekday+7)%7; }
    return 1+(weekday-new Date(y,m,1).getDay()+7)%7+(nth-1)*7;
  }
  function eventsForMonth(y,m) {
    const map = new Map();
    function add(day,label) {
      if(day<1 || day>new Date(y,m+1,0).getDate()) return;
      if(!map.has(day)) map.set(day,[]);
      if(!map.get(day).includes(label)) map.get(day).push(label);
    }
    const length=new Date(y,m+1,0).getDate();
    for(let d=1;d<=length;d++){
      const day=new Date(y,m,d).getDay();
      if(day===0 && typeof bolWeeklyService!=="undefined" && bolWeeklyService.enabled) add(d,bolWeeklyService.title);
      if(day===4) add(d,"Weekly Bible Study · 8:00 PM · Online");
      if(d<=3) add(d,"Monthly Worship · 8:00 PM · Online");
      if(y===2026 && day>=1 && day<=5 && new Date(y,m,d)>=new Date(2026,1,9) && new Date(y,m,d)<=new Date(2026,3,3))
        add(d,"40 Days Prayer · Daily focus");
    }
    add(nthWeekday(y,m,5,1),"Night Vigil · 10:30 PM · Online");
    add(nthWeekday(y,m,6,-1),"Revival Prayer · 6:30 PM · Online");
    if(typeof bolRuleEvents!=="undefined") bolRuleEvents.forEach(e=>{if(e.month==="all"||e.month===m)add(nthWeekday(y,m,e.weekday,e.nth),e.title);});
    if(typeof bolFixedEvents!=="undefined") Object.entries(bolFixedEvents).forEach(([date,title])=>{const [mm,dd]=date.split("-").map(Number);if(mm===m)add(dd,title);});
    if(typeof bolBirthdays!=="undefined") bolBirthdays.forEach(b=>{if(b.month===m)add(b.day,b.name+" · "+b.type);});
    if(typeof bolFlexibleMonthlyEvents!=="undefined" && Array.isArray(bolFlexibleMonthlyEvents[m]))
      bolFlexibleMonthlyEvents[m].forEach(t=>add(length,t));
    if(m===11) for(let d=26;d<=30;d++) add(d,"End-of-Year Prayers · 8:30 PM · Online");
    if(y===2026 && m===3){add(3,"Good Friday");add(5,"Easter Sunday");}
    return [...map.entries()].sort((a,b)=>a[0]-b[0]);
  }
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  const category=t=>/Sunday Service|Thanksgiving.*Sunday/i.test(t)?"sunday":/Bible Study/i.test(t)?"study":/Monthly Worship/i.test(t)?"worship":/Night Vigil/i.test(t)?"vigil":/Revival Prayer/i.test(t)?"revival":/40 Days Prayer|End-of-Year Prayers/i.test(t)?"prayer":/Birthday/i.test(t)?"birthday":"special";
  names.forEach((name,i)=>{const opt=make("option","",name);opt.value=String(i);monthPicker.append(opt);});
  for(let y=Math.min(2026,now.getFullYear());y<=now.getFullYear()+10;y++){const opt=make("option","",y);opt.value=String(y);yearPicker.append(opt);}
  yearPicker.value=String(now.getFullYear());monthPicker.value=String(now.getMonth());
  const toolbar=yearPicker.parentElement;
  const previous=make("button","planner-control","← Previous");previous.type="button";
  const next=make("button","planner-control","Next →");next.type="button";
  toolbar.prepend(previous);toolbar.append(next);
  const tabs=make("div","planner-tabs");toolbar.after(tabs);
  names.forEach((name,i)=>{const b=make("button","planner-control",name.slice(0,3));b.type="button";b.onclick=()=>{monthPicker.value=String(i);render();};tabs.append(b);});
  const detail=make("div","planner-detail");detail.setAttribute("aria-live","polite");host.after(detail);
  function move(delta){const d=new Date(Number(yearPicker.value),Number(monthPicker.value)+delta,1);if([...yearPicker.options].some(o=>o.value===String(d.getFullYear()))){yearPicker.value=String(d.getFullYear());monthPicker.value=String(d.getMonth());render();}}
  previous.onclick=()=>move(-1);next.onclick=()=>move(1);
  function render(){
    const y=Number(yearPicker.value),m=Number(monthPicker.value),length=new Date(y,m+1,0).getDate(),offset=(new Date(y,m,1).getDay()+6)%7;
    const entries=new Map(eventsForMonth(y,m));
    tabs.querySelectorAll("button").forEach((b,i)=>b.setAttribute("aria-pressed",String(i===m)));
    host.replaceChildren();detail.textContent="Select an activity to see its details.";
    const cover=make("div","planner-cover"),book=make("div","planner-book"),left=make("div","planner-page"),right=make("div","planner-page");
    const title=make("h2","planner-month-title",names[m]+" "+y);cover.append(title);
    const spine=make("div","planner-spine");spine.setAttribute("aria-hidden","true");for(let i=0;i<6;i++)spine.append(make("i"));
    const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun","Notes"];
    const rows=Math.ceil((offset+length)/7);
    // A shared grid keeps the two pages aligned even when a day contains multiple events.
    for(let col=0;col<8;col++){const h=make("div","planner-weekday"+(col===6?" sunday":""),days[col]);h.style.gridColumn=String(col+1);h.style.gridRow="1";book.append(h);}
    for(let w=0;w<rows;w++)for(let col=0;col<8;col++){
      const d=w*7+col-offset+1;
      const cell=make("div","planner-day"+(col===6?" sunday":"")+(col===7?" planner-notes":""));
      cell.style.gridColumn=String(col+1);cell.style.gridRow=String(w+2);
      if(col===7){if(w===0){const pending=(typeof bolFlexibleMonthlyEvents!=="undefined"?bolFlexibleMonthlyEvents[m]:[])||[];pending.forEach(t=>cell.append(make("p","planner-event special",t)));}}
      else if(d>=1&&d<=length){
        const date=make("strong","planner-date",d);cell.append(date);
        if(y===now.getFullYear()&&m===now.getMonth()&&d===now.getDate())cell.classList.add("planner-today");
        (entries.get(d)||[]).filter(t=>!/Date TBA/i.test(t)).forEach(t=>{const b=make("button","planner-event "+category(t),t);b.type="button";b.onclick=()=>{detail.replaceChildren(make("strong","",d+" "+names[m]+" "+y),make("p","",t));};cell.append(b);});
      }else cell.classList.add("planner-blank");
      book.append(cell);
    }
    spine.style.gridColumn="4 / 5";spine.style.gridRow="1 / "+(rows+2);
    book.append(spine);cover.append(book);host.append(cover);
    const legend=make("div","planner-legend");[["sunday","Sunday worship"],["study","Bible Study"],["worship","Monthly worship"],["vigil","Night vigil"],["revival","Revival prayer"],["prayer","Prayer"],["birthday","Birthdays"],["special","Special events"]].forEach(([c,t])=>legend.append(make("span","planner-event "+c,t)));host.append(legend);
  }
  yearPicker.addEventListener("change",render);monthPicker.addEventListener("change",render);render();
}());
