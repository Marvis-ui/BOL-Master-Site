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
  monthPicker.innerHTML='<option value="all">Full year</option>';
  names.forEach((name,i)=>{const opt=document.createElement("option");opt.value=String(i);opt.textContent=name;monthPicker.append(opt);});
  const currentYear = now.getFullYear();
  yearPicker.replaceChildren();
  for (let year = Math.min(2026, currentYear); year <= currentYear + 10; year++) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearPicker.append(option);
  }
  yearPicker.value=String(currentYear);
  monthPicker.value=String(now.getFullYear()===Number(yearPicker.value)?now.getMonth():"all");
  function render(){
    host.replaceChildren();
    const y=Number(yearPicker.value);
    const months=monthPicker.value==="all"?names.map((_,i)=>i):[Number(monthPicker.value)];
    months.forEach(m=>{
      const card=document.createElement("article");card.className="calendar-agenda-month";
      const h=document.createElement("h3");h.textContent=names[m]+" "+y;card.append(h);
      eventsForMonth(y,m).forEach(([day,labels])=>{
        const row=document.createElement("div");row.className="calendar-agenda-row";
        const date=document.createElement("strong");date.textContent=names[m].slice(0,3)+" "+day;
        const body=document.createElement("div");
        labels.forEach(label=>{const p=document.createElement("p");p.textContent=label;body.append(p);});
        row.append(date,body);card.append(row);
      });host.append(card);
    });
  }
  yearPicker.addEventListener("change",render);
  monthPicker.addEventListener("change",render);
  render();
}());
