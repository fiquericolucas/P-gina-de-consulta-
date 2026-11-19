(() => {
'use strict';
const chatForm=document.getElementById('relationship-chat-form');

const lookupForm=document.getElementById('lookup-form');
if(lookupForm){
 const method=document.getElementById('lookup-method');
 const identifier=document.getElementById('lookup-identifier');
 const result=document.getElementById('lookup-result');
 const submit=document.getElementById('lookup-submit');
 const updateInput=()=>{identifier.type=method.value==='email'?'email':'tel';identifier.inputMode=method.value==='email'?'email':'tel';identifier.placeholder=method.value==='email'?'seuemail@exemplo.com':'(00) 00000-0000';};
 method.addEventListener('change',updateInput);updateInput();
 lookupForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!document.getElementById('lookup-consent').checked)return;
  submit.disabled=true;submit.textContent='Pesquisando…';result.className='lookup-result';result.textContent='';const progress=document.getElementById('lookup-progress');progress.hidden=false;
  try{
   await new Promise(resolve=>setTimeout(resolve,1800));
   const response=await fetch('/api/consult',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({method:method.value,identifier:identifier.value.trim(),consent:true})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.message||'Não foi possível verificar os cadastros.');
   if(data.status==='no_match'){
    result.className='lookup-result success';
    result.textContent='Não conseguimos encontrar nada cadastrado com esses dados.';
   }else if(data.status==='match'){
    result.className='lookup-result success';
    result.textContent=data.message||'A fonte autorizada retornou uma correspondência pública. Confira a fonte original.';
   }else{
    result.className='lookup-result';
    result.textContent=data.message||'Não foi possível concluir a verificação.';
   }
  }catch(error){result.className='lookup-result error';result.textContent=error.message||'Não foi possível verificar os cadastros.';}
  finally{progress.hidden=true;submit.disabled=false;submit.textContent='Verificar disponibilidade da consulta →';}
 });
}

if(!chatForm)return;
const log=document.getElementById('relationship-chat-log');
const input=document.getElementById('relationship-chat-input');
const consent=document.getElementById('relationship-chat-consent');
const status=document.getElementById('relationship-chat-status');
const send=document.getElementById('relationship-chat-send');
const history=[];
const addMessage=(text,role)=>{
 const bubble=document.createElement('div');bubble.className='chat-bubble '+(role==='assistant'?'assistant':'user');bubble.textContent=text;log.append(bubble);log.scrollTop=log.scrollHeight;
};
const dimensions=document.getElementById('attention-dimensions');
const updateAssessment=(a)=>{
 if(!a||!a.ready)return;
 const score=Math.max(0,Math.min(100,Number(a.attention_index)||0));
 const level=String(a.level||'insufficient');
 const labels={low:'Baixo',medium:'Médio',high:'Alto',insufficient:'Contexto insuficiente'};
 const gauge=document.getElementById('attention-gauge');
 gauge.style.setProperty('--score',score);gauge.style.setProperty('--fill',level==='high'?'#d64f68':level==='medium'?'#d99a35':level==='low'?'#3a9b78':'#9d8fa0');
 document.getElementById('attention-score').textContent=String(score);
 document.getElementById('attention-level').textContent='Nível '+(labels[level]||'em avaliação');
 document.getElementById('attention-state').textContent=labels[level]||'Em avaliação';
 document.getElementById('attention-explanation').textContent=String(a.explanation||'A análise organiza apenas o que foi relatado.');
 document.getElementById('attention-basis').textContent=String(a.basis||'Índice contextual de pontos de atenção, não uma estimativa de infidelidade.');
 const entries=[
  ['Comunicação',a.dimensions?.communication],
  ['Coerência dos relatos',a.dimensions?.consistency],
  ['Recorrência',a.dimensions?.recurrence],
  ['Acordos e limites',a.dimensions?.agreements]
 ];
 dimensions.replaceChildren();
 entries.forEach(([name,value])=>{const row=document.createElement('div');const label=document.createElement('span');label.textContent=name;const badge=document.createElement('b');badge.textContent=['low','medium','high'].includes(value)?({low:'Baixo',medium:'Médio',high:'Alto'}[value]):'A avaliar';row.append(label,badge);dimensions.append(row);});
};
chatForm.addEventListener('submit',async event=>{
 event.preventDefault();
 const message=input.value.trim();
 if(!message||!consent.checked)return;
 if(message.length>1600){status.textContent='A mensagem deve ter até 1.600 caracteres.';return;}
 addMessage(message,'user');history.push({role:'user',content:message});input.value='';
 send.disabled=true;send.textContent='Analisando…';status.textContent='A consultora está considerando o contexto da conversa…';
 try{
  const response=await fetch('/api/relationship-chat',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({messages:history.slice(-12)})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.message||'Não foi possível responder agora.');
  const answer=String(data.reply||'Não consegui formular uma resposta. Tente novamente.').slice(0,7000);
  addMessage(answer,'assistant');history.push({role:'assistant',content:answer});
  updateAssessment(data.assessment);
  status.textContent='Resposta recebida. A conversa permanece nesta sessão do navegador.';
 }catch(error){history.pop();status.textContent=error.message||'Falha ao conectar à consultora.';addMessage(status.textContent,'assistant');}
 finally{send.disabled=false;send.textContent='Enviar mensagem →';input.focus();}
});
})();