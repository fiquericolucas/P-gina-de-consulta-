(() => {
'use strict';
const form=document.getElementById('consult-form'), input=document.getElementById('identifier'), label=document.getElementById('identifier-label'), consent=document.getElementById('consent'), message=document.getElementById('form-message'), methods=[...document.querySelectorAll('input[name="method"]')];
if(!form||!input||!label||!consent||!message)return;
const method=()=>document.querySelector('input[name="method"]:checked')?.value||'email';
const show=(text,type)=>{message.textContent=text;message.className='form-message visible '+type;};
const clear=()=>{message.textContent='';message.className='form-message';};
const update=()=>{const phone=method()==='phone';label.textContent=phone?'Seu telefone com DDD':'Seu e-mail';input.type=phone?'tel':'email';input.placeholder=phone?'(85) 99999-9999':'voce@exemplo.com';input.autocomplete=phone?'tel':'email';input.inputMode=phone?'tel':'email';input.maxLength=phone?20:254;input.value='';input.setCustomValidity('');clear();};
methods.forEach(el=>el.addEventListener('change',update));
input.addEventListener('input',()=>{input.setCustomValidity('');clear();});
form.addEventListener('submit',async event=>{
  event.preventDefault();clear();
  if(!consent.checked){show('Confirme que é titular do contato ou tem autorização válida para verificá-lo.','error');consent.focus();return;}
  if(!input.value.trim()){show('Informe um e-mail ou telefone válido.','error');input.focus();return;}
  if(method()==='phone'){
    const digits=input.value.replace(/\D/g,'');
    if(digits.length<10||digits.length>13){show('Confira o telefone e inclua o DDD. Exemplo: (85) 99999-9999.','error');input.focus();return;}
  }else if(!input.checkValidity()){show('Digite um endereço de e-mail válido.','error');input.focus();return;}
  const button=form.querySelector('button[type="submit"]');
  if(button){button.disabled=true;button.textContent='Aguarde…';}
  show('Aguarde um pouco, estamos processando sua solicitação…','success');
  try{
    const response=await fetch('/api/consult',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({method:method(),identifier:input.value.trim(),consent:consent.checked})});
    await response.json();
    // Não apresentar um resultado negativo como se plataformas externas tivessem sido consultadas.
    await new Promise(resolve=>setTimeout(resolve,1800));
    show('Consulta não conclusiva: não foi possível confirmar cadastros ativos nas fontes disponíveis. Isso não garante que não exista cadastro em outros aplicativos ou plataformas de relacionamento.','error');
  }catch{
    show('Não foi possível conectar ao serviço. Nenhum resultado foi confirmado.','error');
  }finally{
    if(button){button.disabled=false;button.innerHTML='Consultar disponibilidade <span aria-hidden="true">→</span>';}
  }
});

/* Avaliações locais de demonstração: não são enviadas ao servidor. */
const reviewForm=document.getElementById('review-form');
if(reviewForm){
  const reviewList=document.getElementById('review-list');
  const reviewAverage=document.getElementById('rating-average');
  const reviewCount=document.getElementById('rating-count');
  const reviewMessage=document.getElementById('review-message');
  const storageKey='verificap-demo-reviews-v1';
  const readReviews=()=>{try{const value=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(value)?value.filter(r=>r&&Number.isInteger(r.rating)&&r.rating>=1&&r.rating<=5&&typeof r.comment==='string'):[]}catch{return []}};
  const renderReviews=()=>{
    const reviews=readReviews();
    if(reviewAverage)reviewAverage.textContent=reviews.length?(reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length).toFixed(1).replace('.',','):'—';
    if(reviewCount)reviewCount.textContent=reviews.length===1?'1 avaliação neste navegador':reviews.length+' avaliações neste navegador';
    if(!reviewList)return;
    reviewList.replaceChildren();
    if(!reviews.length){const empty=document.createElement('div');empty.className='empty-reviews';empty.textContent='Ainda não há comentários neste navegador. Seja a primeira pessoa a avaliar a demonstração.';reviewList.append(empty);return;}
    reviews.slice().reverse().forEach(review=>{
      const article=document.createElement('article');article.className='review-item';
      const head=document.createElement('div');head.className='review-item-head';
      const name=document.createElement('span');name.className='review-item-name';name.textContent=review.name||'Visitante';
      const date=document.createElement('time');date.className='review-item-date';date.textContent=review.date||'';
      head.append(name,date);
      const stars=document.createElement('div');stars.className='review-item-stars';stars.setAttribute('aria-label',review.rating+' de 5 estrelas');stars.textContent='★'.repeat(review.rating)+'☆'.repeat(5-review.rating);
      const comment=document.createElement('p');comment.textContent=review.comment;
      article.append(head,stars,comment);reviewList.append(article);
    });
  };
  reviewForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(reviewMessage){reviewMessage.textContent='';reviewMessage.className='form-message';}
    const chosen=reviewForm.querySelector('input[name="review-rating"]:checked');
    const commentField=document.getElementById('review-comment');
    const nameField=document.getElementById('review-name');
    const comment=(commentField?.value||'').trim();
    if(!chosen||!comment){if(reviewMessage){reviewMessage.textContent='Escolha uma nota e escreva um comentário.';reviewMessage.className='form-message visible error';}return;}
    const reviews=readReviews();
    reviews.push({name:(nameField?.value||'').trim().slice(0,50),rating:Number(chosen.value),comment:comment.slice(0,500),date:new Date().toLocaleDateString('pt-BR')});
    try{
      localStorage.setItem(storageKey,JSON.stringify(reviews));
      renderReviews();reviewForm.reset();
      if(reviewMessage){reviewMessage.textContent='Avaliação registrada apenas neste navegador. Ela não foi enviada ao site nem publicada para outros visitantes.';reviewMessage.className='form-message visible success';}
    }catch{
      if(reviewMessage){reviewMessage.textContent='Não foi possível guardar a avaliação neste navegador. Verifique as configurações de armazenamento.';reviewMessage.className='form-message visible error';}
    }
  });
  renderReviews();
}

/* Login Google: confirmação limitada à identidade autenticada; nenhuma busca em apps terceiros. */
const googleButton=document.getElementById('google-signin-button');
const googleStatus=document.getElementById('google-auth-status');
if(googleButton&&googleStatus){
  const setGoogleStatus=(text,type='')=>{googleStatus.textContent=text;googleStatus.className='form-note '+type;};
  const verifyGoogleCredential=async(response)=>{
    setGoogleStatus('Validando a autenticação com segurança…');
    try{
      const result=await fetch('/api/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:response.credential})});
      const data=await result.json();
      if(!result.ok||!data.ok){setGoogleStatus(data.message||'Não foi possível validar sua conta Google.','error');return;}
      setGoogleStatus('Conta Google autenticada: '+data.email+'. Isso não consulta cadastros em aplicativos de relacionamento.','success');
    }catch{setGoogleStatus('Falha de conexão ao validar com o servidor. Tente novamente.','error');}
  };
  fetch('/api/auth/google-config').then(r=>r.json()).then(config=>{
    if(!config.clientId){googleButton.closest('.google-verification')?.setAttribute('hidden','');document.querySelector('.form-divider')?.setAttribute('hidden','');return;}
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
    script.onload=()=>{
      if(!window.google?.accounts?.id){setGoogleStatus('Não foi possível carregar o serviço de autenticação Google.','error');return;}
      window.google.accounts.id.initialize({client_id:config.clientId,callback:verifyGoogleCredential});
      window.google.accounts.id.renderButton(googleButton,{theme:'outline',size:'large',shape:'pill',text:'continue_with',width:280});
      setGoogleStatus('Use sua própria conta Google. O site não solicita acesso aos seus contatos.');
    };
    script.onerror=()=>setGoogleStatus('Serviço de autenticação Google indisponível no momento.','error');
    document.head.appendChild(script);
  }).catch(()=>setGoogleStatus('Não foi possível carregar a configuração do Google.','error'));
}
/* Questionário: mede apenas a percepção de confiança relatada pela pessoa. */
const quizForm=document.getElementById('trust-quiz');
if(quizForm){
 const questions=[
 'Vocês conseguem conversar com sinceridade sobre assuntos importantes?',
 'Você sente que suas preocupações são ouvidas e levadas a sério?',
 'As atitudes e os combinados entre vocês costumam ser coerentes?',
 'Vocês conseguem falar sobre limites e expectativas sem medo de humilhação?',
 'Existe espaço para cada pessoa ter privacidade e também agir com transparência?',
 'Vocês reservam momentos de qualidade para estar juntos?',
 'Quando acontece um desentendimento, conseguem conversar e buscar uma solução?',
 'Você sente respeito mesmo quando vocês discordam?',
 'Demonstrações de carinho e interesse acontecem de forma recíproca?',
 'Quando um problema é apontado, os dois mostram disposição para melhorar?'
 ];
 const choices=[{label:'Na maioria das vezes',value:2},{label:'Às vezes',value:1},{label:'Raramente ou nunca',value:0}];
 const box=document.getElementById('quiz-question'),label=document.getElementById('quiz-progress-label'),bar=document.getElementById('quiz-progress-bar'),next=document.getElementById('quiz-next'),back=document.getElementById('quiz-back'),result=document.getElementById('trust-result'),given=Array(10).fill(null);
 let current=0;
 function render(){
  label.textContent='Pergunta '+(current+1)+' de 10';bar.style.width=((current+1)*10)+'%';box.replaceChildren();
  const n=document.createElement('div');n.className='quiz-number';n.textContent='PERGUNTA '+String(current+1).padStart(2,'0');
  const title=document.createElement('h3');title.className='quiz-question-title';title.textContent=questions[current];
  const opts=document.createElement('div');opts.className='quiz-options';
  choices.forEach(choice=>{const l=document.createElement('label');l.className='quiz-option';const r=document.createElement('input');r.type='radio';r.name='answer';r.checked=given[current]===choice.value;r.addEventListener('change',()=>{given[current]=choice.value;next.disabled=false;});const t=document.createElement('span');t.textContent=choice.label;l.append(r,t);opts.append(l);});
  box.append(n,title,opts);next.disabled=given[current]===null;next.textContent=current===9?'Ver meu resultado →':'Próxima pergunta →';back.disabled=current===0;
 }
 function finish(){
  const score=Math.round(given.reduce((a,b)=>a+b,0)/20*100);
  document.getElementById('trust-score').textContent=score+'%';document.getElementById('trust-meter').style.width=score+'%';
  let title,description,tips,boundary;
  if(score>=80){title='Percepção de confiança elevada';description='Suas respostas indicam que você percebe diálogo, respeito e cooperação com frequência. É um bom sinal da dinâmica que você relata, mas a confiança precisa ser cuidada continuamente.';tips=['Continuem conversando sobre expectativas e limites, mesmo quando tudo estiver bem.','Reconheçam atitudes positivas e reservem tempo de qualidade juntos.','Revisem os combinados quando a rotina ou as necessidades mudarem.'];boundary='Confiança não exige abrir mão da privacidade individual: transparência saudável é construída por acordo, não por vigilância.';}
  else if(score>=55){title='Há pontos que merecem atenção';description='Você relata aspectos positivos, mas também situações em que a comunicação ou a conexão poderiam melhorar. Vale conversar sobre exemplos concretos, sem acusações.';tips=['Escolha um momento tranquilo e explique como situações específicas fazem você se sentir.','Façam um combinado pequeno e realista para a próxima semana, como um momento de conversa sem distrações.','Depois, conversem sobre o que funcionou e o que cada um ainda precisa.'];boundary='Observe se existe esforço recíproco e consistente. Uma conversa difícil isolada não define a relação; padrões repetidos merecem atenção.';}
  else{title='Sua percepção de confiança está baixa';description='Suas respostas mostram que você não está se sentindo ouvido(a), respeitado(a) ou seguro(a) em vários aspectos. Isso merece cuidado, independentemente de existir ou não infidelidade.';tips=['Identifique comportamentos concretos que estão afetando você, sem presumir intenções.','Expresse o que precisa e proponha mudanças realistas e recíprocas.','Defina limites saudáveis e observe se há responsabilidade e atitudes consistentes dos dois lados.','Se as conversas não avançam, considere apoio de terapia individual ou de casal.'];boundary='Se, após conversas claras e combinados razoáveis, nada muda repetidamente, isso pode indicar um problema não resolvido na dinâmica, indisponibilidade para construir a relação ou limites incompatíveis. Não prova traição. Você pode decidir o que é aceitável para si.';}
  document.getElementById('trust-band').textContent=title;document.getElementById('trust-explanation').textContent=description;const ul=document.getElementById('trust-advice');ul.replaceChildren();tips.forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.append(li);});document.getElementById('trust-boundary').textContent=boundary;quizForm.hidden=true;result.hidden=false;result.scrollIntoView({behavior:'smooth',block:'start'});
 }
 next.addEventListener('click',()=>{if(given[current]===null)return;if(current<9){current++;render();}else finish();});
 back.addEventListener('click',()=>{if(current>0){current--;render();}});
 document.getElementById('quiz-restart').addEventListener('click',()=>{given.fill(null);current=0;result.hidden=true;quizForm.hidden=false;render();quizForm.scrollIntoView({behavior:'smooth',block:'start'});});
 render();
}

})();
