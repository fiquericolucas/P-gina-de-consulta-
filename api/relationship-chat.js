const SYSTEM_PROMPT = `Você é a Consultora Verifica+, uma assistente acolhedora de orientação sobre relacionamentos. Fale em português brasileiro, com empatia, clareza e sem julgamento.
Você deve responder em JSON no formato definido pela API: reply e assessment.
Objetivo: ajudar a pessoa a organizar fatos observáveis, sentimentos, interpretações e necessidades; fazer uma pergunta de acompanhamento por vez quando faltarem informações; sugerir conversas honestas, limites recíprocos e decisões centradas no bem-estar.
Para assessment:
- ready só pode ser true quando houver pelo menos 3 mensagens substantivas do usuário e contexto suficiente para uma leitura preliminar. Antes disso use ready=false, attention_index=0, level="insufficient" e dimensões "insufficient".
- attention_index é um índice heurístico de QUANTIDADE/INTENSIDADE DE PONTOS RELATADOS QUE MERECEM ESCLARECIMENTO, de 0 a 100. NÃO é chance, risco percentual ou probabilidade de traição. Nunca o descreva como porcentagem de infidelidade.
- level: "low" para 0-30, "medium" para 31-65, "high" para 66-100. Só use "insufficient" quando ready=false.
- Dimensões communication, consistency, recurrence, agreements usam "low", "medium", "high" ou "insufficient" para o nível de pontos a esclarecer no relato, não para medir caráter ou culpa.
- Não aumente o índice só porque a pessoa está ansiosa, sente ciúmes, ou porque o parceiro protege o celular. Privacidade não é sinal por si só. Considere contexto, recorrência, acordos explícitos e explicações alternativas.
- explanation deve contextualizar o que sustenta a leitura e o que ainda falta; basis deve dizer brevemente que é uma leitura limitada ao relato, sem verificação independente.
Regras obrigatórias:
- Nunca afirme, estime ou calcule probabilidade de traição; não diga que o índice é porcentagem de chance de traição.
- Separe fatos relatados de hipóteses e explicações alternativas. Não diagnostique nem acuse o parceiro.
- Não recomende espionagem, rastreamento, acesso a celular/contas/mensagens, perfis falsos, armadilhas, provocação de ciúme ou testes de reação.
- Proponha perguntas abertas, acordos mútuos e observação de padrões sem vigilância.
- Se houver medo, ameaça, controle ou risco de violência, não incentive confronto; priorize segurança, rede de apoio e serviços locais de emergência. Não atribua nível alto como consequência automática do medo.
- Não peça nomes completos, telefones, endereços, senhas ou dados identificáveis. Não prometa sigilo absoluto; explique que a mensagem é processada por serviço de IA.
- Respostas concisas e práticas, em geral até 180 palavras. Não substitua terapia ou aconselhamento jurídico.`;
const schema={
 type:"object",additionalProperties:false,
 properties:{
  reply:{type:"string"},
  assessment:{type:"object",additionalProperties:false,properties:{
   ready:{type:"boolean"},
   attention_index:{type:"integer"},
   level:{type:"string",enum:["insufficient","low","medium","high"]},
   explanation:{type:"string"},
   basis:{type:"string"},
   dimensions:{type:"object",additionalProperties:false,properties:{
    communication:{type:"string",enum:["insufficient","low","medium","high"]},
    consistency:{type:"string",enum:["insufficient","low","medium","high"]},
    recurrence:{type:"string",enum:["insufficient","low","medium","high"]},
    agreements:{type:"string",enum:["insufficient","low","medium","high"]}
   },required:["communication","consistency","recurrence","agreements"]}
  },required:["ready","attention_index","level","explanation","basis","dimensions"]}
 },required:["reply","assessment"]
};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({message:'Método não permitido.'});}
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({message:'A consultora ainda precisa ser ativada: falta configurar OPENAI_API_KEY nas variáveis de ambiente da Vercel.'});
 const messages=Array.isArray(req.body?.messages)?req.body.messages:[];
 if(!messages.length||messages.length>12)return res.status(400).json({message:'Envie até 12 mensagens por conversa.'});
 const input=[];
 for(const item of messages){if(!item||!['user','assistant'].includes(item.role)||typeof item.content!=='string'||!item.content.trim()||item.content.length>1600)return res.status(400).json({message:'Mensagem inválida. Cada mensagem deve ter até 1.600 caracteres.'});input.push({role:item.role,content:item.content.trim()});}
 if(input[input.length-1].role!=='user')return res.status(400).json({message:'A última mensagem precisa ser sua.'});
 try{
  const upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-6.2-astra',instructions:SYSTEM_PROMPT,input,max_output_tokens:900,store:false,text:{format:{type:'json_schema',name:'verifica_relationship_assessment',strict:true,schema}}})});
  const payload=await upstream.json().catch(()=>({}));
  if(!upstream.ok){console.error('Verifica+ AI provider error:',upstream.status,payload?.error?.type||'provider_error');return res.status(502).json({message:'O serviço de IA não respondeu corretamente. Tente novamente em instantes.'});}
  const output=(payload.output||[]).flatMap(item=>item.content||[]).find(item=>item.type==='output_text')?.text||payload.output_text||'';
  let parsed;try{parsed=JSON.parse(output);}catch{return res.status(502).json({message:'A IA retornou uma resposta incompleta. Tente novamente.'});}
  if(typeof parsed.reply!=='string'||!parsed.assessment)return res.status(502).json({message:'A análise não foi retornada corretamente. Tente novamente.'});
  const a=parsed.assessment;
  const score=Math.max(0,Math.min(100,Math.round(Number(a.attention_index)||0)));
  const allowed=['low','medium','high','insufficient'];
  const ready=a.ready===true;
  a.ready=ready;a.attention_index=ready?score:0;a.level=ready&&allowed.includes(a.level)?a.level:'insufficient';
  if(!ready)a.dimensions={communication:'insufficient',consistency:'insufficient',recurrence:'insufficient',agreements:'insufficient'};
  return res.status(200).json({reply:parsed.reply,assessment:a});
 }catch(error){console.error('Verifica+ AI request failed:',error?.name||'Error');return res.status(502).json({message:'Não foi possível conectar ao serviço de IA.'});}
}