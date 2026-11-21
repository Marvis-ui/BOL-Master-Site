(function(){
"use strict";
const practice=document.getElementById("challenge-day-zero"),door=document.getElementById("challenge-practice-door"),doors=document.getElementById("challenge-doors"),form=document.getElementById("day-zero-form"),confirmBox=document.getElementById("day-zero-confirm"),summary=document.getElementById("day-zero-confirm-summary"),feedback=document.getElementById("day-zero-feedback");
if(!practice||!door||!doors||!form||!confirmBox||!feedback)return;
const LOCK_KEY="bol-bible-challenge-day0-submitted-v2";
let sessionLocked=false;
function isLocked(){try{return window.localStorage.getItem(LOCK_KEY)==="1"||sessionLocked}catch{return sessionLocked}}
function focusFirst(el){const item=el.querySelector("button:not([hidden]),input:not([hidden]),[tabindex]");(item||practice).focus()}
function showThanks(){
 form.hidden=true;confirmBox.hidden=true;feedback.hidden=false;feedback.replaceChildren();
 const title=document.createElement("strong");title.textContent="Thank you for participating!";
 const msg=document.createElement("p");msg.textContent="Your final choice has been received for this local practice. You are doing well—return tomorrow for another Bible mystery!";
 const note=document.createElement("p");note.textContent="Your answer will not be marked or revealed now. Day 0 is a browser-only preview, not a server-recorded competition entry.";
 const exit=document.createElement("button");exit.type="button";exit.className="day-zero-submit";exit.textContent="Return to the calendar";
 exit.addEventListener("click",()=>{practice.hidden=true;document.body.classList.remove("challenge-focus");door.setAttribute("aria-pressed","false");door.focus()});
 feedback.append(title,msg,note,exit);focusFirst(feedback);
}
function showPractice(){
 doors.querySelectorAll(".challenge-door").forEach(b=>b.setAttribute("aria-pressed",String(b===door)));
 practice.hidden=false;document.body.classList.add("challenge-focus");
 practice.classList.remove("is-revealing");void practice.offsetWidth;practice.classList.add("is-revealing");
 if(isLocked())showThanks();
 else{form.hidden=false;confirmBox.hidden=true;feedback.hidden=true;focusFirst(form)}
}
door.addEventListener("click",showPractice);
doors.addEventListener("click",event=>{const el=event.target.closest(".challenge-door");if(el&&el!==door)door.setAttribute("aria-pressed","false")});
form.addEventListener("submit",event=>{
 event.preventDefault();
 const name=document.getElementById("day-zero-name").value.trim();
 const year=document.getElementById("day-zero-year");
 const selected=form.querySelector('input[name="practice-answer"]:checked');
 if(!name||!year||!year.validity.valid||!selected){form.reportValidity();return}
 if(isLocked()){showThanks();return}
 summary.textContent=name+", you selected option "+selected.value+". Is this your final answer?";
 form.hidden=true;confirmBox.hidden=false;feedback.hidden=true;focusFirst(confirmBox);
});
document.getElementById("day-zero-review").addEventListener("click",()=>{confirmBox.hidden=true;form.hidden=false;focusFirst(form)});
document.getElementById("day-zero-final").addEventListener("click",()=>{
 if(isLocked()){showThanks();return}
 if(!document.getElementById("day-zero-name").value.trim()||!document.getElementById("day-zero-year").validity.valid||!form.querySelector('input[name="practice-answer"]:checked')){confirmBox.hidden=true;form.hidden=false;return}
 sessionLocked=true;try{window.localStorage.setItem(LOCK_KEY,"1")}catch{}
 form.reset();showThanks();
});
practice.addEventListener("keydown",event=>{
 if(event.key==="Escape"){event.preventDefault();event.stopPropagation()}
 if(event.key==="Tab"){const focusable=[...practice.querySelectorAll("button,input,select,textarea,[tabindex]")].filter(e=>!e.disabled&&!e.closest("[hidden]")&&e.getClientRects().length);if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
});
const daily=document.getElementById("board-daily"),overall=document.getElementById("board-overall"),picker=document.getElementById("board-day-picker"),label=document.getElementById("board-day-picker-label"),message=document.getElementById("challenge-board-message");
if(!daily||!overall||!picker||!label||!message)return;
for(let i=1;i<=24;i++){const option=document.createElement("option");option.value=String(i);option.textContent="Day "+i;picker.append(option)}
function view(which){daily.setAttribute("aria-pressed",String(which==="daily"));overall.setAttribute("aria-pressed",String(which==="overall"));label.hidden=which==="overall";message.textContent=which==="daily"?"No official scores for Day "+picker.value+" yet. Secure scoring will be activated before the competition opens.":"Overall rankings will appear when the protected scoring service is active. No scores are currently available."}
daily.addEventListener("click",()=>view("daily"));overall.addEventListener("click",()=>view("overall"));picker.addEventListener("change",()=>view("daily"));view("daily");
})();
