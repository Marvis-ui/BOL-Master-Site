(function(){
"use strict";
const API="https://xmirodkkhuvkplwcwhyl.supabase.co/functions/v1/bol-challenge-participants";
const TOKEN_KEY="bol-challenge-participant-token-v1",PENDING_CODE_KEY="bol-challenge-pending-recovery-code";
const by=id=>document.getElementById(id);
const signup=by("challenge-signup"),recover=by("challenge-recover"),newCode=by("challenge-new-code"),welcome=by("challenge-welcome"),loading=by("challenge-account-loading"),error=by("challenge-account-error");
const practice=by("challenge-day-zero"),door=by("challenge-practice-door"),doors=by("challenge-doors"),form=by("day-zero-form"),confirmBox=by("day-zero-confirm"),summary=by("day-zero-confirm-summary"),feedback=by("day-zero-feedback");
if(!signup||!practice||!form)return;
let accessToken="",participant=null,submitted=new Set(),pendingCode="",pendingName="",busy=false;
const panels=[signup,recover,newCode,welcome];
function panel(target){panels.forEach(el=>el.hidden=el!==target);loading.hidden=true}
function notice(message){error.hidden=!message;error.textContent=message||""}
function getSaved(key){try{return localStorage.getItem(key)||""}catch{return ""}}
function save(key,value){try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key)}catch{}}
function getPending(){try{return sessionStorage.getItem(PENDING_CODE_KEY)||""}catch{return ""}}
function savePending(value){try{if(value)sessionStorage.setItem(PENDING_CODE_KEY,value);else sessionStorage.removeItem(PENDING_CODE_KEY)}catch{}}
async function request(action,data={}){
 const control=new AbortController();const timeout=setTimeout(()=>control.abort(),12000);
 try{const response=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...data}),signal:control.signal,cache:"no-store"});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok){const e=new Error(payload.error||"service_unavailable");e.status=response.status;throw e}
 return payload}finally{clearTimeout(timeout)}
}
function friendly(e){if(e?.message==="name_already_registered")return "This name already has a participant pass. If it is yours, select Recover my account. Otherwise, use a distinct name such as your first name and surname initial.";
 if(e?.message==="invalid_recovery")return "That name and recovery code do not match. Check the code you wrote down and try again.";
 if(e?.message==="session_invalid")return "This device's session has expired. Recover your account using your private code.";
 if(e?.message==="already_submitted")return "You've already submitted Day 0. Your answer is locked.";
 if(e?.message==="invalid_name")return "Enter a name of 2–60 characters using letters and ordinary punctuation.";
 if(e?.name==="AbortError")return "The service did not respond. Please check your internet connection and retry.";
 return "The secure participant service is unavailable right now. Your answer has not been marked as submitted. Please retry."}
function setSession(data){
 accessToken=data.token;participant=data.participant;save(TOKEN_KEY,accessToken);
}
async function refreshStatus(){
 if(!accessToken)return;
 const data=await request("me",{token:accessToken});
 participant=data.participant;submitted=new Set((data.submitted||[]).map(r=>Number(r.day)));
 by("challenge-welcome-name").textContent="Welcome back, "+participant.name+"!";
 const n=submitted.size;
 by("challenge-submitted-days").textContent=n?(submitted.has(0)?"Day 0 practice completed · ":"")+[...submitted].filter(d=>d>0).length+" of 24 official challenges submitted.":"No submissions yet. You're ready to explore Day 0!";
 if(submitted.has(0))door.setAttribute("data-completed","true");
}
function showWelcome(){panel(welcome);notice("");if(participant)by("challenge-welcome-name").textContent="Welcome back, "+participant.name+"!"}
async function start(){
 const saved=getSaved(TOKEN_KEY);const pending=getPending();
 if(!saved){panel(signup);return}
 accessToken=saved;
 try{await refreshStatus();if(pending){pendingCode=pending;showCode()}else showWelcome()}
 catch(e){if(e.status===401){save(TOKEN_KEY,"");accessToken="";participant=null;panel(recover);notice(friendly(e))}else{loading.hidden=false;loading.textContent=friendly(e);notice(friendly(e))}}
}
function showCode(){panel(newCode);by("challenge-code-display").textContent=pendingCode;by("challenge-saved-code").checked=false;by("challenge-code-continue").disabled=true}
by("challenge-show-recover").onclick=()=>{panel(recover);notice("")};
by("challenge-show-signup").onclick=()=>{panel(signup);notice("")};
by("challenge-saved-code").onchange=()=>by("challenge-code-continue").disabled=!by("challenge-saved-code").checked;
by("challenge-copy-code").onclick=async()=>{try{await navigator.clipboard.writeText(pendingCode);by("challenge-copy-code").textContent="Code copied ✓"}catch{by("challenge-copy-code").textContent="Select the code above and copy it manually"}};
by("challenge-code-continue").onclick=async()=>{if(!by("challenge-saved-code").checked)return;savePending("");pendingCode="";by("challenge-code-display").textContent="";showWelcome();try{await refreshStatus()}catch(e){notice(friendly(e))}};
by("challenge-signup-form").onsubmit=async e=>{
 e.preventDefault();if(busy)return;notice("");busy=true;const btn=e.currentTarget.querySelector("button");btn.disabled=true;
 try{const name=by("challenge-signup-name").value.trim();const result=await request("register",{name});
 setSession(result);pendingCode=result.recovery_code;savePending(pendingCode);showCode();
 }catch(err){notice(friendly(err))}finally{busy=false;btn.disabled=false}
};
by("challenge-recover-form").onsubmit=async e=>{
 e.preventDefault();if(busy)return;notice("");busy=true;const btn=e.currentTarget.querySelector("button");btn.disabled=true;
 try{const result=await request("recover",{name:by("challenge-recover-name").value.trim(),code:by("challenge-recover-code").value.trim()});setSession(result);by("challenge-recover-code").value="";await refreshStatus();showWelcome()}
 catch(err){notice(friendly(err))}finally{busy=false;btn.disabled=false}
};
by("challenge-switch-account").onclick=()=>{accessToken="";participant=null;submitted.clear();save(TOKEN_KEY,"");savePending("");panel(recover);notice("Use your own recovery code to switch participants. The previous participant's answers remain locked.")};
function focusInto(element){const v=element.querySelector("button:not([hidden]),input:not([hidden]),[tabindex]");(v||practice).focus()}
function closePractice(){practice.hidden=true;document.body.classList.remove("challenge-focus");door.setAttribute("aria-pressed","false");door.focus()}
function showThanks(){
 form.hidden=true;confirmBox.hidden=true;feedback.hidden=false;feedback.replaceChildren();
 const title=document.createElement("strong");title.textContent="Thank you for participating!";
 const text=document.createElement("p");text.textContent="Your answer is locked. You're doing well—return tomorrow for another Bible mystery!";
 const line=document.createElement("p");line.textContent="Day 0 is practice only. Your answer and its correctness will not be revealed here.";
 const leave=document.createElement("button");leave.type="button";leave.className="day-zero-submit";leave.textContent="Return to the calendar";leave.onclick=closePractice;
 feedback.append(title,text,line,leave);focusInto(feedback);
}
async function openPractice(){
 if(!participant||!accessToken){notice("Please create or recover your participant pass before opening Day 0.");by("challenge-account-title").scrollIntoView({behavior:"smooth"});return}
 doors.querySelectorAll(".challenge-door").forEach(b=>b.setAttribute("aria-pressed",String(b===door)));
 practice.hidden=false;document.body.classList.add("challenge-focus");
 practice.classList.remove("is-revealing");void practice.offsetWidth;practice.classList.add("is-revealing");
 by("day-zero-player").textContent="Playing as "+participant.name;
 try{await refreshStatus()}catch(e){notice(friendly(e));closePractice();return}
 if(submitted.has(0)){showThanks();return}
 form.hidden=false;confirmBox.hidden=true;feedback.hidden=true;focusInto(form);
}
door.onclick=openPractice;
form.onsubmit=e=>{
 e.preventDefault();const selected=form.querySelector('input[name="practice-answer"]:checked');
 if(!selected){form.reportValidity();return}
 if(submitted.has(0)){showThanks();return}
 const question=practice.querySelector("#day-zero-title + p");
 const chosen=selected.closest("label")?.querySelector("span");
 by("day-zero-review-question").textContent=question?.textContent?.trim()||"Please review the question above.";
 const answerBox=by("day-zero-review-option");
 answerBox.replaceChildren();
 const letter=document.createElement("strong");letter.textContent=selected.value+".";
 const words=document.createElement("span");words.textContent=chosen?.textContent?.replace(/^[A-D]\.\s*/,"").trim()||"Selected option "+selected.value;
 answerBox.append(letter,words);
 summary.textContent=participant.name+", please read the question and your chosen answer carefully before confirming.";
 by("day-zero-confirm-error").hidden=true;
 form.hidden=true;confirmBox.hidden=false;feedback.hidden=true;confirmBox.scrollIntoView({block:"start"});focusInto(confirmBox);
};
by("day-zero-review").onclick=()=>{confirmBox.hidden=true;form.hidden=false;focusInto(form)};
by("day-zero-final").onclick=async()=>{
 if(busy)return;const selected=form.querySelector('input[name="practice-answer"]:checked');if(!selected){confirmBox.hidden=true;form.hidden=false;return}
 const button=by("day-zero-final");busy=true;button.disabled=true;button.textContent="Locking your answer…";notice("");
 try{await request("submit",{token:accessToken,day:0,option:selected.value});submitted.add(0);form.reset();showThanks()}
 catch(e){if(e.status===409){submitted.add(0);form.reset();showThanks()}else{const p=by("day-zero-confirm-error");p.hidden=false;p.textContent=friendly(e)+" Your choice is not confirmed yet. Please retry.";}}
 finally{busy=false;button.disabled=false;button.textContent="Yes, lock my final answer"}
};
practice.addEventListener("keydown",event=>{
 if(event.key==="Escape"){event.preventDefault();event.stopPropagation()}
 if(event.key==="Tab"){const focusable=[...practice.querySelectorAll("button,input,select,textarea,[tabindex]")].filter(el=>!el.disabled&&!el.closest("[hidden]")&&el.getClientRects().length);if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
});
const daily=by("board-daily"),overall=by("board-overall"),picker=by("board-day-picker"),label=by("board-day-picker-label"),message=by("challenge-board-message");
if(daily&&overall&&picker&&label&&message){
 for(let i=1;i<=24;i++){const option=document.createElement("option");option.value=String(i);option.textContent="Day "+i;picker.append(option)}
 function board(view){daily.setAttribute("aria-pressed",String(view==="daily"));overall.setAttribute("aria-pressed",String(view==="overall"));label.hidden=view==="overall";
 message.textContent=view==="daily"?"No official scores for Day "+picker.value+" yet. Protected grading has not been activated.":"Overall rankings will appear after official scoring is enabled; no scores are currently published."}
 daily.onclick=()=>board("daily");overall.onclick=()=>board("overall");picker.onchange=()=>board("daily");board("daily");
}
start();
})();