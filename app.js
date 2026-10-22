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
})();