# imob.app — Design

Data: 2026-06-08

## Objetivo

Aplicação web para imobiliária com duas áreas: site público (vitrine de imóveis focada em gerar contatos) e painel administrativo (gestão de imóveis e configurações da imobiliária). Stack: Go + SQLite, deploy em VPS já existente sob o domínio `cardona.com.br`.

## Stack tecnológica

- **Linguagem/runtime**: Go (stdlib `net/http`, roteamento por padrões do Go 1.22+, ex. `GET /imoveis/{id}`)
- **Templates**: `templ` (componentes tipados, compilados — `templ generate` como passo de build)
- **Interatividade**: htmx (sem framework JS pesado)
- **CSS**: Tailwind via CLI standalone (sem Node/npm)
- **Banco de dados**: SQLite via `modernc.org/sqlite` (driver puro Go, sem CGO — facilita cross-compile e deploy de binário único estático)
- **Acesso a dados**: `database/sql` cru + structs de repositório por entidade (Imovel, Foto, Configuracao, Admin) — sem ORM, sem codegen
- **Migrações**: runner customizado simples (tabela de versão + arquivos `.sql` embarcados via `go:embed`)
- **Imagens**: `disintegration/imaging` (puro Go) para gerar variantes redimensionadas no upload
- **Markdown**: `goldmark` para renderizar textos institucionais
- **E-mail**: SMTP via biblioteca padrão/`net/smtp`, credenciais via variáveis de ambiente

Tudo compõe um **binário estático único** (sem CGO), facilitando deploy via systemd no VPS.

## Arquitetura

Servidor Go renderiza HTML no servidor (server-side rendering com `templ`). Interações dinâmicas (filtros, paginação, upload de fotos) usam htmx para trocar fragmentos de página sem recarregar tudo, mantendo a experiência rápida sem complexidade de SPA. Cores de marca configuráveis aplicadas via variáveis CSS (`--color-primary`, `--color-secondary`) injetadas no `<head>` a partir das configurações salvas, com o tema do Tailwind referenciando essas variáveis.

Estrutura de diretórios (alto nível):
```
cmd/imob-app/        — main, subcomandos CLI (admin create, seed, backup, restore)
internal/handlers/   — handlers HTTP (público + admin)
internal/repo/       — acesso a dados (Imovel, Foto, Configuracao, Admin, Sessao)
internal/db/         — conexão, migrações embarcadas
internal/templates/  — componentes templ
internal/images/     — pipeline de redimensionamento
internal/mail/       — envio de e-mail via SMTP
web/static/          — CSS compilado (Tailwind), assets estáticos
migrations/          — arquivos .sql versionados
```

## Modelo de dados

### `imoveis`
- `id`, `slug`
- `titulo`, `descricao` (texto)
- `tipo` (enum fixo: casa | apartamento | terreno | comercial | rural)
- `finalidade` (enum fixo: venda | aluguel)
- `cidade`, `bairro`, `endereco`
- `preco`
- `area_m2`, `quartos`, `banheiros`, `vagas_garagem`
- `status` (enum: disponivel | vendido | alugado) — quando ≠ `disponivel`, imóvel some das listagens públicas (mas continua visível/gerenciável no painel)
- `destaque` (bool)
- `criado_em`, `atualizado_em`

Enums de `tipo`, `finalidade` e `status` são fixos no código (constantes Go + `CHECK` no SQLite) — não editáveis pelo admin, para manter os filtros consistentes.

### `fotos`
- `id`, `imovel_id`
- `caminho_original`, `caminho_thumb`, `caminho_grande`
- `principal` (bool — só uma por imóvel)
- `ordem` (ordem de upload; foto principal sempre exibida primeiro na galeria independente da ordem)

### `configuracao` (tabela de uma linha só, id fixo = 1)
- `nome_imobiliaria`
- `logo_path`
- `cor_primaria`, `cor_secundaria` (hex)
- `endereco`, `telefone`, `whatsapp`, `email`
- `instagram_url` (opcional)
- `texto_sobre` (Markdown — conteúdo livre da página institucional)
- `texto_home` (Markdown — texto de apresentação na página inicial)

### `admins`
- `id`, `email`, `senha_hash` (bcrypt)
- Criado apenas via comando CLI (`./imob-app admin create <email>`) — sem credenciais padrão, sem wizard de primeira execução

### Sessões
Sem tabela própria — cookie assinado (HMAC-SHA256) contendo id do admin + expiração, validado no servidor via chave secreta (variável de ambiente). Sem capacidade de revogação individual antes da expiração; mitigado com expiração curta (ex. 7 dias) e renovação por atividade.

## Site público

### Páginas/rotas
- `/` — Home: hero (logo, nome, `texto_home`, busca rápida por cidade/tipo/finalidade), grade de imóveis em destaque, faixa de CTA (WhatsApp), rodapé com contato/redes/endereço
- `/imoveis` — Listagem com filtros (cidade, bairro, tipo, finalidade, faixa de preço) e ordenação (mais recentes | menor preço | maior preço; destaques sempre priorizados na ordem padrão)
- `/imoveis/{id}-{slug}` — Detalhe do imóvel: galeria de fotos, informações completas, botão de WhatsApp contextual (mensagem pré-preenchida com o título do imóvel)
- `/sobre` — Página institucional (Markdown livre via `texto_sobre`)
- `/contato` — Informações de contato (endereço em texto + link "abrir no mapa", telefone, e-mail, WhatsApp, redes sociais) + formulário de contato

### Filtros e listagem
- Filtros aplicados via htmx (`hx-push-url` mantém estado na URL para compartilhamento/voltar), apenas a grade de resultados é re-renderizada
- Layout de filtros: barra lateral fixa no desktop, gaveta/drawer recolhível ("Filtros ▾") no mobile
- Paginação via botão "Carregar mais" (htmx anexa próximo lote à grade)
- Faixa de preço via campos numéricos livres (mín/máx), não faixas pré-definidas

### Galeria de fotos
Grade de miniaturas + lightbox nativo (`<dialog>` HTML + JS mínimo de navegação), sem biblioteca de carrossel externa.

### Contato
- **WhatsApp**: botão flutuante fixo (mensagem genérica) em todas as páginas + botão contextual na página de detalhe do imóvel (mensagem pré-preenchida com o título). Links no formato `https://wa.me/<numero>?text=<mensagem-codificada>`, número vindo da configuração
- **Formulário**: envia e-mail via SMTP (sem armazenamento em banco, sem caixa de mensagens no painel — mantém o escopo do admin restrito ao que foi pedido). Proteção contra spam: campo honeypot + limite de taxa por IP (em memória)

### SEO e compartilhamento
- `<title>`, meta description e tags Open Graph (incluindo `og:image`) gerados dinamicamente por página, com dados do imóvel na página de detalhe (melhora prévias ao compartilhar links via WhatsApp/redes)
- `sitemap.xml` gerado dinamicamente, `robots.txt` estático
- Páginas de erro (404/500) com identidade visual do site

## Painel administrativo

### Autenticação
- Login com e-mail/senha (bcrypt), sessão via cookie assinado
- Sem cadastro de novos admins pela interface — apenas via CLI

### Gestão de imóveis
- Lista em tabela simples (miniatura, título, cidade/bairro, tipo, finalidade, preço, status, destaque, ações), sem filtros/busca (volume pequeno esperado)
- Formulário de cadastro/edição com todos os campos do modelo de dados
- Upload múltiplo de fotos via `<input type="file" multiple>`; após upload, grade de miniaturas com ações por foto (⭐ "tornar principal", 🗑 "remover"), tudo via htmx sem reload de página
- Marcar/desmarcar imóvel como destaque
- Ao salvar, foto é processada em duas variantes redimensionadas (thumb ~400px, grande ~1600px) além do original

### Configurações da imobiliária
Formulário único cobrindo todos os campos de `configuracao`: nome, logo (upload simples, sem redimensionamento, validação de tipo de imagem + limite de 2MB), cores (aplicadas via variáveis CSS), endereço, telefone, WhatsApp, e-mail, Instagram, texto institucional (Markdown) e texto da home (Markdown). Mudanças refletem imediatamente no site público — configuração é lida diretamente do banco a cada requisição (tabela de uma linha só, custo desprezível), sem camada de cache.

Sem dashboard/estatísticas — login leva direto à listagem de imóveis.

## Operação / Infraestrutura

### Deploy
- Binário único estático, rodando como serviço systemd no VPS (mesmo padrão de `gastos.app`/`deploy.sh`)
- Reverse proxy via Caddy: domínio `cardona.com.br` (e `www`) passa a apontar para a nova aplicação na porta **8004** (substituindo o app atual nas portas 8002/8003); rota `/healthz` mantida para monitoramento; rota `/api/*` removida (app é renderizado no servidor, sem namespace de API separado)
- Arquivo SQLite e diretório `/uploads` ficam ao lado do binário

### Comandos CLI
- `./imob-app admin create <email>` — cria o admin inicial (prompt de senha, hash bcrypt)
- `./imob-app seed` — popula o banco com ~6-8 imóveis de exemplo + configuração de demonstração (para visualizar o site populado); pode ser revertido limpando as tabelas
- `./imob-app backup` — gera arquivo único (`backup-AAAA-MM-DD-HHMM.tar.gz`) contendo cópia segura do banco SQLite (via API de backup online — segura mesmo com app rodando) + `/uploads` compactado; salvo em `/backups`, com poda automática (mantém últimos N dias). Acionado via timer do systemd (ex. diariamente)
- `./imob-app restore <arquivo>` — restaura banco + uploads a partir de um arquivo de backup

### Migrações
Runner customizado simples: tabela `schema_migrations` registra versão aplicada, arquivos `.sql` numerados embarcados via `go:embed` são executados em ordem na inicialização.

## Fora de escopo (deliberadamente adiado)

- Caixa de mensagens/leads no painel (formulário envia só por e-mail)
- Múltiplos administradores / níveis de permissão
- Edição de tipos/finalidades pelo admin (lista fixa no código)
- Reordenação de fotos por arrastar-e-soltar (ordem = ordem de upload, principal sempre primeiro)
- Exibição de imóveis vendidos/alugados como "prova social"
- Mapa incorporado (usa link de saída para o Google Maps)
- CAPTCHA (honeypot + limite de taxa cobre o essencial)
- Backups externos/off-site (apenas local com poda, por enquanto)
- Dashboard/estatísticas no painel
