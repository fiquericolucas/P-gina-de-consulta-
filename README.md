# Verifica+ — protótipo isolado

Site estático em HTML, CSS e JavaScript. Este repositório é dedicado somente ao Verifica+ e não usa código ou configuração de outros projetos.

## Estado real
- Interface responsiva e formulário de demonstração: implementados.
- Validação de formato de e-mail/telefone e consentimento: implementada no navegador.
- Consulta real a Tinder, Badoo, Bumble ou Inner Circle: NÃO implementada.
- Cobrança de R$ 14,90, Wiapy, UTMify, login, banco de dados e painel administrativo: NÃO implementados.
- O formulário não envia nem armazena dados e não retorna resultados de cadastro.

## Segurança e privacidade
A ferramenta não pode ser usada para investigar pessoas sem autorização, enumerar contas ou acessar contas privadas. Uma consulta real só deve ser criada com integração oficial/autorizada, base legal apropriada, minimização de dados e revisão de segurança. Não coloque chaves de API no navegador ou neste repositório.

## Publicação Vercel
Importe somente este repositório como um projeto Vercel novo. Para este site estático:
- Framework preset: Other
- Root Directory: /
- Build Command: deixar vazio
- Output Directory: deixar vazio (a raiz contém o arquivo index.html)
- Install Command: deixar vazio

Verifique se o projeto Vercel correto está conectado a fiquericolucas/P-gina-de-consulta- e à branch main. A configuração de deploy e o status da conta Vercel não podem ser confirmados a partir deste repositório.

## Teste local
Abra index.html no navegador. O formulário deve validar o formato e exibir uma mensagem informando que não existe consulta real.
