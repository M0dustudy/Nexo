# NEXO — Ativação do gerador privado de imagens

A interface de administração e a função de geração foram adicionadas ao código, mas a geração NÃO funciona até provisionar o backend e cadastrar o único administrador autorizado.

## Etapas obrigatórias

1. Criar um projeto Supabase exclusivo do NEXO. **Não reutilizar VITRA**.
2. Executar `supabase/migrations/20261022_nexo_images.sql` no SQL Editor.
3. Criar a conta pessoal do administrador no Supabase Authentication (email e senha forte). Desabilitar novos cadastros públicos, se não forem necessários.
4. Consultar o UUID da conta em Authentication > Users e cadastrar esse UUID em `public.nexo_admins`, como indicado no comentário da migração. Não cadastrar outros UUIDs.
5. Configurar os segredos da Edge Function: `OPENAI_API_KEY` e `NEXO_ORIGIN=https://m0dustudy.github.io`. O Supabase fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ao runtime. **Nunca adicionar essas chaves ao index.html nem ao GitHub público**.
6. Publicar a função `nexo-images` no Supabase com verificação JWT ativa.
7. Em `index.html`, configurar `window.NEXO_BACKEND={url:"https://SEU-PROJETO.supabase.co",anonKey:"CHAVE-PUBLICA-ANON"}`. A chave anon/publicável é projetada para uso no navegador; a service_role e a chave OpenAI não são.
8. Verificar com conta não autorizada que a função devolve 403 e que não há inserção/exclusão de arquivos. Verificar com administrador que a imagem é gerada e permanece após recarregar e abrir em outro dispositivo.
9. Confirmar cobrança, limites de gasto e rate limiting no serviço de imagens antes de uso amplo.

## Comportamento

- Visitantes: leitura de imagens publicadas, sem controles de edição.
- Administrador: login pessoal e alternância entre modo de administração e modo de estudo.
- As imagens didáticas publicadas são públicas; não inserir materiais privados no prompt.
- Materiais originais e documentos pessoais exigem armazenamento **privado separado**, não o bucket público de imagens.
- A alternância visual não concede permissões. A função verifica o JWT e o UUID autorizado no servidor.
- A sessão do administrador fica apenas em memória; após recarregar a página, é necessário entrar novamente.

## Limitações atuais

- O serviço não foi provisionado e nenhuma credencial foi cadastrada; a geração ainda não está operacional.
- O login é restrito a email/senha do Supabase e a sessão expira conforme configuração do serviço.
- O fluxo de exclusão é permanente. Recomenda-se versionamento e confirmação antes de uso intensivo.
- O navegador e a versão mobile precisam de testes de integração após o provisionamento.
