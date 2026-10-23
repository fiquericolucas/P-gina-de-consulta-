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
form.addEventListener('submit',event=>{event.preventDefault();clear();if(!consent.checked){show('Confirme que é titular do contato ou tem autorização válida para verificá-lo.','error');consent.focus();return;}if(!input.value.trim()){show('Informe um e-mail ou telefone para validar o formato.','error');input.focus();return;}if(method()==='phone'){const digits=input.value.replace(/\D/g,'');if(digits.length<10||digits.length>13){show('Confira o telefone e inclua o DDD. Exemplo: (85) 99999-9999.','error');input.focus();return;}}else if(!input.checkValidity()){show('Digite um endereço de e-mail válido.','error');input.focus();return;}show('Formato válido. Este teste não pesquisa cadastros, não envia seus dados e não realiza cobranças. Consultas reais ainda não estão habilitadas.','success');});

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
})();