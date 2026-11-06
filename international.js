(() => {
'use strict';
const questions=[
'Can you talk honestly about important matters?',
'Do you feel your concerns are heard and taken seriously?',
'Are your actions and agreements usually consistent?',
'Can you discuss boundaries and expectations without fear of humiliation?',
'Is there room for both privacy and mutual transparency?',
'Do you make quality time for each other?',
'When disagreements happen, can you talk and work toward a solution?',
'Do you feel respected even when you disagree?',
'Are affection and interest shown mutually?',
'When an issue is raised, are both people willing to make an effort?'
];
const choices=[{label:'Most of the time',value:2},{label:'Sometimes',value:1},{label:'Rarely or never',value:0}];
const form=document.getElementById('trust-quiz'),box=document.getElementById('quiz-question'),label=document.getElementById('quiz-progress-label'),bar=document.getElementById('quiz-progress-bar'),next=document.getElementById('quiz-next'),back=document.getElementById('quiz-back'),result=document.getElementById('trust-result');
if(!form||!box||!label||!bar||!next||!back||!result)return;
const answers=Array(10).fill(null);let current=0;
function render(){
label.textContent='Question '+(current+1)+' of 10';bar.style.width=((current+1)*10)+'%';box.replaceChildren();
const n=document.createElement('div');n.className='quiz-number';n.textContent='QUESTION '+String(current+1).padStart(2,'0');
const title=document.createElement('h3');title.className='quiz-question-title';title.textContent=questions[current];
const opts=document.createElement('div');opts.className='quiz-options';
choices.forEach(choice=>{const l=document.createElement('label');l.className='quiz-option';const r=document.createElement('input');r.type='radio';r.name='answer';r.checked=answers[current]===choice.value;r.addEventListener('change',()=>{answers[current]=choice.value;next.disabled=false;});const t=document.createElement('span');t.textContent=choice.label;l.append(r,t);opts.append(l);});
box.append(n,title,opts);next.disabled=answers[current]===null;next.textContent=current===9?'See my result →':'Next question →';back.disabled=current===0;
}
function finish(){
const score=Math.round(answers.reduce((a,b)=>a+b,0)/20*100);
document.getElementById('trust-score').textContent=score+'%';document.getElementById('trust-meter').style.width=score+'%';
let heading,description,tips,boundary;
if(score>=80){heading='High perceived trust';description='Your answers suggest that you often experience communication, respect, and cooperation. Keep nurturing those habits over time.';tips=['Keep discussing expectations and boundaries, even when things feel good.','Notice positive efforts and make time for each other.','Revisit agreements as circumstances and needs change.'];boundary='Trust does not require giving up personal privacy. Healthy transparency is built by mutual agreement, not surveillance.';}
else if(score>=55){heading='Some areas deserve attention';description='You describe some positive aspects, alongside moments when communication or connection could improve. Focus on specific examples rather than assumptions.';tips=['Choose a calm moment to explain how specific situations make you feel.','Agree on one small, realistic step to try this week.','Check in afterward about what worked and what each person still needs.'];boundary='Look for consistent, mutual effort. One difficult conversation does not define a relationship, but repeated patterns deserve attention.';}
else{heading='Low perceived trust';description='Your answers suggest that you may not feel heard, respected, or secure in several areas. That deserves care, regardless of whether infidelity is involved.';tips=['Identify concrete behaviors that affect you without assuming intent.','Express what you need and suggest realistic, mutual changes.','Set healthy boundaries and look for consistent responsibility from both people.','Consider individual or couples counseling if conversations are not progressing.'];boundary='If clear conversations and reasonable agreements repeatedly lead to no change, there may be an unresolved relationship issue or incompatible boundaries. That does not prove cheating.';}
document.getElementById('trust-band').textContent=heading;document.getElementById('trust-explanation').textContent=description;
const ul=document.getElementById('trust-advice');ul.replaceChildren();tips.forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.append(li);});
document.getElementById('trust-boundary').textContent=boundary;form.hidden=true;result.hidden=false;result.scrollIntoView({behavior:'smooth',block:'start'});
}
next.addEventListener('click',()=>{if(answers[current]===null)return;if(current<9){current++;render();}else finish();});
back.addEventListener('click',()=>{if(current>0){current--;render();}});
document.getElementById('quiz-restart').addEventListener('click',()=>{answers.fill(null);current=0;result.hidden=true;form.hidden=false;render();form.scrollIntoView({behavior:'smooth',block:'start'});});
render();
})();