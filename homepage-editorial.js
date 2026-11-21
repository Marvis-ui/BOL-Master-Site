(function(){
"use strict";
if(!("IntersectionObserver" in window)||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
const targets=Array.from(document.querySelectorAll("[data-home-reveal]"));
if(!targets.length)return;
const observer=new IntersectionObserver(entries=>{
 for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add("home-is-visible");observer.unobserve(entry.target);}}
},{threshold:0.08,rootMargin:"0px 0px 30px 0px"});
targets.forEach(el=>observer.observe(el));
document.documentElement.classList.add("home-reveal-ready");
})();
