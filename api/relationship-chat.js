const SYSTEM_PROMPT = `Você é a Consultora Verifica+, uma assistente acolhedora de orientação sobre relacionamentos. Fale em português brasileiro, com empatia, clareza e sem julgamento.
Objetivo: ajudar a pessoa a organizar fatos observáveis, sentimentos, interpretações e necessidades; fazer uma pergunta de acompanhamento por vez quando faltarem informações; sugerir conversas honestas, limites recíprocos e decisões centradas no bem-estar.
Regras obrigatórias:
- Nunca afirme, estime ou calcule probabilidade de traição; comportamento isolado (inclusive proteger o celular, desligá-lo à noite, trabalhar/treinar com alguém) não prova infidelidade.
- Separe explicitamente fatos relatados de hipóteses e explicações alternativas. Não diagnostique nem acuse o parceiro.
- Não recomende espionagem, rastreamento, acesso a celular/contas/mensagens, perfis falsos, armadilhas, provocação de ciúme ou testes de reação.
- Em vez disso, proponha perguntas abertas, acordos mútuos e observação de padrões sem vigilância.
- Se houver medo, ameaça, controle ou risco de violência, não incentive confronto; priorize segurança, rede de apoio e serviços locais de emergência.
- Não peça nomes completos, telefones, endereços, senhas ou dados identificáveis. Não prometa sigilo absoluto; explique que a mensagem é processada por serviço de IA.
- Respostas concisas e práticas, em geral até 180 palavras. Não substitua terapia ou aconselhamento jurídico.`;
export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({message:'Método não permitido.'});}
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({message:'A consultora conversacional ainda precisa ser ativada: falta configurar OPENAI_API_KEY nas variáveis de ambiente da Vercel.'});
  const messages=Array.isArray(req.body?.messages)?req.body.messages:[];
  if(!messages.length||messages.length>12)return res.status(400).json({message:'Envie até 12 mensagens por conversa.'});
  const input=[];
  for(const item of messages){
    if(!item||!['user','assistant'].includes(item.role)||typeof item.content!=='string'||!item.content.trim()||item.content.length>1600)
      return res.status(400).json({message:'Mensagem inválida. Cada mensagem deve ter até 1.600 caracteres.'});
    input.push({role:item.role,content:item.content.trim()});
  }
  if(input[input.length-1].role!=='user')return res.status(400).json({message:'A última mensagem precisa ser sua.'});
  try{
    const upstream=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-6.2-sol',instructions:SYSTEM_PROMPT,input,max_output_tokens:500,store:false})
    });
    const payload=await upstream.json().catch(()=>({}));
    if(!upstream.ok){
      console.error('Verifica+ AI provider error:',upstream.status,payload?.error?.type||'provider_error');
      return res.status(502).json({message:'O serviço de IA não respondeu corretamente. Tente novamente em instantes.'});
    }
    const reply=typeof payload.output_text==='string'?payload.output_text.trim():'';
    if(!reply)return res.status(502).json({message:'A IA não retornou uma resposta. Tente novamente.'});
    return res.status(200).json({reply});
  }catch(error){
    console.error('Verifica+ AI request failed:',error?.name||'Error');
    return res.status(502).json({message:'Não foi possível conectar ao serviço de IA.'});
  }
}
