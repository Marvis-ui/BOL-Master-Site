(function(){
"use strict";
const practice=document.getElementById("challenge-day-zero");
const practiceDoor=document.getElementById("challenge-practice-door");
const doors=document.getElementById("challenge-doors");
const form=document.getElementById("day-zero-form");
const feedback=document.getElementById("day-zero-feedback");
if(!practice||!practiceDoor||!doors||!form||!feedback)return;
practiceDoor.addEventListener("click",()=>{
  doors.querySelectorAll(".challenge-door").forEach(b=>b.setAttribute("aria-pressed",String(b===practiceDoor)));
  practice.hidden=false;
  practice.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"nearest"});
});
doors.addEventListener("click",event=>{
  const target=event.target.closest(".challenge-door");
  if(!target||target===practiceDoor)return;
  practice.hidden=true;
  practiceDoor.setAttribute("aria-pressed","false");
});
form.addEventListener("submit",event=>{
  event.preventDefault();
  const name=document.getElementById("day-zero-name").value.trim();
  const checked=form.querySelector('input[name="practice-answer"]:checked');
  if(!name||!checked){form.reportValidity();return}
  form.hidden=true;feedback.hidden=false;feedback.replaceChildren();
  const title=document.createElement("strong");
  title.textContent=(checked.value==="B"?"Well investigated, ":"Good practice, ")+name+"!";
  const detail=document.createElement("p");
  detail.textContent=(checked.value==="B"?"You selected the correct statement. ":"The supported answer is B. ")+"Elisha cut a stick and threw it into the water; the iron floated and the worker retrieved it. See 2 Kings 6:4–7.";
  const note=document.createElement("p");note.textContent="This result is only a preview. Nothing was sent or saved, and it earns no competition points.";
  const again=document.createElement("button");again.type="button";again.className="day-zero-submit";again.textContent="Try Day 0 again";
  again.onclick=()=>{form.reset();form.hidden=false;feedback.hidden=true;feedback.replaceChildren()};
  feedback.append(title,detail,note,again);
});
const daily=document.getElementById("board-daily"),overall=document.getElementById("board-overall"),picker=document.getElementById("board-day-picker");
const label=document.getElementById("board-day-picker-label"),message=document.getElementById("challenge-board-message");
if(!daily||!overall||!picker||!label||!message)return;
for(let i=1;i<=24;i++){const option=document.createElement("option");option.value=String(i);option.textContent="Day "+i;picker.append(option)}
function view(which){
 daily.setAttribute("aria-pressed",String(which==="daily"));overall.setAttribute("aria-pressed",String(which==="overall"));
 label.hidden=which==="overall";
 message.textContent=which==="daily"?
  "No official scores for Day "+picker.value+" yet. Daily rankings will appear here once the secure competition is active.":
  "Overall rankings will appear here when the secure scoring service is active. No scores are currently available.";
}
daily.onclick=()=>view("daily");overall.onclick=()=>view("overall");picker.onchange=()=>view("daily");view("daily");
})();
