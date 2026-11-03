# Verifica+ — protótipo web

Site estático em HTML, CSS e JavaScript, com endpoints serverless mínimos para diagnóstico. Este repositório é exclusivo do Verifica+.

## Estado atual — transparência obrigatória

- Interface responsiva e formulário demonstrativo: implementados.
- Validação local de formato de e-mail/telefone: implementada no navegador.
- Endpoint de saúde: `GET /api/health`.
- Endpoint de consulta: `POST /api/consult`; responde HTTP 503 `LOOKUP_NOT_CONFIGURED` intencionalmente.
- Consulta real a Tinder, Badoo, Bumble ou Inner Circle: **não implementada**.
- Pagamento de R$ 14,90: **não implementado**.
- Login Google (OpenID Connect) com validação server-side do ID token: código integrado; depende de `GOOGLE_CLIENT_ID` na Vercel e configuração do OAuth no Google Cloud. Não cria sessão nem armazena contatos.\n- Banco de dados, autenticação persistente e armazenamento de contatos: **não configurados**.

O endpoint de consulta não aceita nem armazena identificadores. Não interprete a resposta 503 como ausência ou presença de cadastro. O serviço só poderá produzir resultados quando houver fonte oficial/expressamente autorizada, contrato e testes que sustentem a consulta.

## Testes após publicar

1. Abra a URL da Vercel e confira página, CSS, JavaScript e navegação.
2. Abra `/api/health`: deve responder HTTP 200 com `ok: true`, `liveLookupsEnabled: false` e `paymentsEnabled: false`.
3. Envie um POST de teste a `/api/consult`: deve responder HTTP 503 com `LOOKUP_NOT_CONFIGURED`. Isso confirma que o endpoint está protegido contra resultados fictícios, não que a consulta real exista.
4. Confirme a aba Deployments e os logs de build da Vercel antes de declarar a publicação validada.

## Publicação na Vercel

Importe o repositório `fiquericolucas/P-gina-de-consulta-` na Vercel. Para este protótipo estático com funções serverless, use a raiz do repositório como Root Directory e não configure Build Command ou Output Directory personalizados, salvo se o painel indicar necessidade. Após o deploy, teste os endpoints acima.

## Antes de vender consultas

É necessário selecionar provedores que autorizem expressamente esse tipo de verificação; construir backend com autenticação, limites de uso e proteção contra abuso; documentar base legal, finalidade, retenção, direitos e contato conforme a LGPD; implementar pagamento com validação server-side e webhooks; e testar erros, segurança e privacidade. A autenticação Google confirma apenas a identidade/conta Google do próprio usuário, sob os limites de autoridade do domínio. Ela não informa o estado de cadastro de terceiros em apps de relacionamento. Para ativar, crie um OAuth Client ID do tipo Web no Google Cloud, autorize o domínio de produção e cadastre `GOOGLE_CLIENT_ID` nas variáveis Production e Preview da Vercel. Não compartilhe Client Secret em conversas.

Não colete senhas nem use mecanismos de recuperação de conta ou enumeração de usuários para inferir cadastros.


## Autenticação Google preparada

- `GET /api/auth/google-config`: fornece apenas o Client ID público.
- `POST /api/auth/google`: valida o ID token no endpoint oficial do Google e confere emissor, público, validade e `email_verified`.
- Para Gmail e Google Workspace, a resposta marca o e-mail como autoridade Google; para endereços externos, exige verificação adicional por código de e-mail, ainda não implementada.
- Nenhum token ou e-mail é gravado no banco (não há banco configurado). A verificação não é uma consulta a aplicativos de relacionamento.
