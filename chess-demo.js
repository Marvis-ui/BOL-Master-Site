(function () {
 'use strict';
 const engine = window.BOL_DEMO_ENGINE;
 let db, date, step = 0, timer = null;
 const steps = [
  ['2026-11-17T12:00:00Z', '2026 complete', 'Marvelous remains the 2026 champion. No 2027 winner exists.'],
  ['2026-12-31T23:00:00Z', 'January 1, 2027', 'Midnight in Vienna: a fresh 2027 roster opens automatically.'],
  ['2027-07-31T21:59:00Z', 'July 31: registration open', 'Demo Ada and Demo Ben sign up. Both start with zero points.'],
  ['2027-07-31T22:00:00Z', 'August 1: automatic pairing', 'Midnight in Vienna: registration closes and a league match appears.'],
  ['2027-08-14T12:00:00Z', 'League draw: no champion', 'The league game is a draw. Both get 1 point. The engine automatically schedules a playoff.'],
  ['2027-08-14T13:00:00Z', 'Playoff draw: play again', 'The first playoff is also a draw. Another playoff is required; nobody is crowned.'],
  ['2027-08-14T14:00:00Z', 'Demo Ada wins the playoff', 'Ada wins the deciding playoff. The league table stays at 1–1 because playoff scores are separate. Organizer confirmation is now available.'],
  ['2027-08-14T14:05:00Z', 'Champion confirmed', 'The organizer finishes the tournament. Demo Ada appears as the 2027 champion; Marvelous remains in 2026 history.'],
  ['2027-12-31T23:00:00Z', 'January 1, 2028', 'The 2028 roster is empty and open. The 2027 champion stays in history.']
 ];
 function apply(body) {
  const s=engine.view(db,date);
  return engine.apply(db,Object.assign({year:s.year,revision:s.revision},body),true,date);
 }
 function result(value) {
  const s=engine.view(db,date), m=s.matches.find(x=>x.result===null);
  const ada=s.players.find(p=>p.name==='Demo Ada');
  apply({action:'result',matchId:m.id,result:value==='ada'?(m.white===ada.id?'white':'black'):'draw'});
 }
 function build(index) {
  db=engine.initial();
  for(let i=0;i<=index;i++){
   date=new Date(steps[i][0]);
   engine.view(db,date);
   if(i===2) for(const name of ['Demo Ada','Demo Ben']) apply({action:'register',name,status:'Title Challenger'});
   if(i===4||i===5) result('draw');
   if(i===6) result('ada');
   if(i===7) apply({action:'finish'});
  }
 }
 // This page intercepts every tournament request. No tournament requests leave the browser.
 const originalFetch=window.fetch.bind(window);
 window.fetch=async function(input,options) {
  const path=new URL(typeof input==='string'?input:input.url,location.href).pathname;
  if(path!=='/api/chess-roster')return originalFetch(input,options);
  try {
   let body=options&&options.body?JSON.parse(options.body):null;
   if(body && !['login','logout'].includes(body.action)) apply(body);
   const state=Object.assign(engine.view(db,date),{authenticated:true});
   return new Response(JSON.stringify(state),{status:200,headers:{'Content-Type':'application/json'}});
  } catch(error) {
   return new Response(JSON.stringify({error:error.message}),{status:error.status||400,headers:{'Content-Type':'application/json'}});
  }
 };
 function pause(){if(timer)clearInterval(timer);timer=null;document.getElementById('demo-play').textContent='Play walkthrough';}
 function show(index) {
  step=index;build(step);
  document.getElementById('demo-step').textContent=(step+1)+' / '+steps.length+' · '+steps[step][1];
  document.getElementById('demo-explanation').textContent=steps[step][2];
  document.getElementById('demo-prev').disabled=step===0;
  document.getElementById('demo-next').disabled=step===steps.length-1;
  document.dispatchEvent(new Event('visibilitychange'));
 }
 document.getElementById('demo-prev').addEventListener('click',()=>{pause();show(Math.max(0,step-1));});
 document.getElementById('demo-next').addEventListener('click',()=>{pause();show(Math.min(steps.length-1,step+1));});
 document.getElementById('demo-reset').addEventListener('click',()=>{pause();show(0);});
 document.getElementById('demo-play').addEventListener('click',()=>{
  if(timer){pause();return;}
  if(step>=7)show(0);
  document.getElementById('demo-play').textContent='Pause walkthrough';
  timer=setInterval(()=>{show(step+1);if(step>=7)pause();},6500);
 });
 show(0);
})();
