# Sistema de Reservas de Salas — Igreja

Site único com três níveis de acesso para reservar as salas da igreja (Templo, Sala Recepção,
Sala Intercessão, Sala Kids 1, 2 e 3): um assistente de conversa que interpreta pedidos em
linguagem natural, um calendário público, consulta/edição/cancelamento por código de reserva,
e uma área de gestão por sala para Líderes e Administração.

## Funcionalidades

- **Assistente de reservas** (página inicial, sem login): você escreve algo como
  "Reservar a Sala Kids 1 dia 15/06 das 9h às 12h" ou "Reservar o Templo todos os sábados,
  das 8h30 às 10h45, até 30/11/2025" e o assistente identifica sala, data/recorrência e
  horário, confirma o que entendeu, verifica conflitos, pede nome e ministério e finaliza a
  reserva, devolvendo um **código de reserva**.
- **Horários exatos**: "9h", "09:00", "8h30", "19h às 21h" etc. são interpretados literalmente,
  sem qualquer conversão de fuso horário — datas e horas são sempre guardadas como texto
  (`YYYY-MM-DD` / `HH:mm`).
- **Reservas recorrentes**: diária, semanal (dia da semana) ou mensal, com data final
  obrigatória. O sistema verifica conflito em cada ocorrência e permite reservar apenas as
  datas livres.
- **Calendário público** por mês e por sala.
- **"Minha reserva"** (público, sem login): qualquer pessoa consulta, edita ou cancela a
  própria reserva usando o código recebido na confirmação — ninguém consegue mexer na reserva
  de outra pessoa sem o código.
- **Aba "Salas"** (login): lista as reservas de cada sala com filtros por data, ministério,
  status e tipo (única/recorrente).
  - **Líder**: apenas consulta.
  - **Administração**: também edita e cancela qualquer reserva, inclusive recorrentes
    (uma ocorrência, ou "esta e as próximas").

## Stack técnica

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- **SQLite puro** via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) — um único
  arquivo de banco de dados, sem serviço externo, sem downloads extras no deploy
- [Auth.js / NextAuth v5](https://authjs.dev/) (login por e-mail e senha, com conta individual
  por Líder/Administração)

Não é necessário nenhum banco de dados externo (Postgres, MySQL etc.) nem serviços pagos além
da própria hospedagem do site.

## Rodando localmente

Pré-requisitos: [Node.js](https://nodejs.org/) 20 ou mais recente.

```bash
npm install
cp .env.example .env      # ajuste os valores se quiser
npm run dev
```

Abra http://localhost:3000. Na primeira execução, o sistema cria automaticamente:

- As 6 salas.
- Um usuário Administração: **e-mail `admin@igreja.org`, senha `admin123`** (ou os valores que
  você definir em `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` no `.env` antes de rodar pela
  primeira vez).

**Troque essa senha (ou crie outro admin e remova esse) assim que possível.**

### Criando usuários Líder/Administração

```bash
npm run criar-usuario -- "Nome Completo" email@igreja.org senha123 LIDER
npm run criar-usuario -- "Nome Completo" email@igreja.org senha123 ADMIN
```

Rodar novamente com o mesmo e-mail atualiza o nome/senha/papel dessa pessoa.

## Variáveis de ambiente (`.env`)

| Variável | Para que serve |
|---|---|
| `DATABASE_PATH` | Caminho do arquivo SQLite (padrão `./data/church.db`) |
| `AUTH_SECRET` | Chave usada para assinar sessões de login. Gere uma com `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL pública do site (ex.: `https://reservas.suaigreja.org`) |
| `CHURCH_TIMEZONE` | Apenas informativo (fuso da igreja) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Usados só na toda primeira execução, para criar o admin inicial |

## Como publicar o site (hospedagem)

Este projeto guarda todos os dados em **um único arquivo SQLite**. Isso é ótimo pela
simplicidade, mas exige um detalhe importante na hospedagem:

> ⚠️ **O servidor precisa manter um disco permanente entre reinicializações.**
> Serviços "serverless" puros (ex.: Vercel, Netlify) apagam o sistema de arquivos a cada
> execução e **não devem ser usados**, ou as reservas seriam perdidas. Use um serviço que
> rode a aplicação continuamente com disco persistente.

Duas opções simples e com plano gratuito/baixo custo, nessa ordem de recomendação:

### Opção 1 — Railway (mais simples)

1. Crie uma conta em [railway.app](https://railway.app) e conecte seu repositório Git (suba
   este projeto para o GitHub primeiro, por exemplo).
2. "New Project" → "Deploy from GitHub repo" → selecione o repositório.
3. Em **Variables**, adicione `AUTH_SECRET`, `NEXTAUTH_URL` (a URL que o Railway vai gerar,
   você ajusta depois de o domínio existir) e, se quiser, `SEED_ADMIN_EMAIL` /
   `SEED_ADMIN_PASSWORD`.
4. Em **Settings → Volumes**, adicione um volume persistente montado em `/app/data` (para o
   arquivo do banco não se perder a cada deploy). Ajuste `DATABASE_PATH=/app/data/church.db`.
5. O Railway detecta automaticamente o `npm run build` / `npm run start`. Faça o deploy.

### Opção 2 — Render

1. Crie uma conta em [render.com](https://render.com) e conecte o repositório.
2. Crie um **Web Service** (não "Static Site").
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
3. Em **Disks**, adicione um disco persistente montado em `/opt/render/project/src/data` e
   ajuste `DATABASE_PATH` para apontar para dentro dele.
4. Configure as variáveis de ambiente (`AUTH_SECRET`, `NEXTAUTH_URL` etc.).
5. Deploy. (Discos persistentes no Render exigem um plano pago do serviço; o plano free não
   mantém disco entre reinicializações.)

### Opção 3 — Um VPS simples (DigitalOcean, Oracle Cloud Free Tier, uma máquina própria etc.)

Se preferir controle total: instale Node.js 20+, copie o projeto, rode `npm install && npm
run build`, e mantenha o processo no ar com [`pm2`](https://pm2.keymetrics.io/) (`pm2 start
npm --name reservas -- start`) atrás de um proxy como Nginx com HTTPS (ex.: via
[Certbot](https://certbot.eff.org/)). Nesse caso o arquivo `data/church.db` já fica no disco
da própria máquina, sem necessidade de configuração extra.

### Backup

Como tudo fica em um único arquivo (`data/church.db`), faça backups periódicos copiando esse
arquivo (ex.: um cron job semanal copiando para outro lugar). Isso é válido em qualquer uma
das opções acima.

## Estrutura do projeto

```
src/
  app/                     páginas e rotas de API (Next.js App Router)
    page.tsx               início: assistente + calendário
    minha-reserva/         consulta/edição/cancelamento por código (público)
    login/                 login de Líder/Administração
    salas/                 listagem por sala com filtros (login)
    api/                   rotas REST usadas pelo front-end
  components/              componentes React (chat, calendário, listagem de salas...)
  lib/
    db.ts                  conexão SQLite + criação de tabelas + seed inicial
    time.ts                parsing de datas/horários em PT-BR, sem conversão de fuso
    parser.ts              identifica sala, data e recorrência numa mensagem livre
    chatEngine.ts           máquina de estados da conversa do assistente
    reservations.ts        regras de negócio (conflitos, recorrência, cancelamento...)
    auth.ts                configuração do login (NextAuth)
scripts/
  criar-usuario.ts         cria/atualiza um usuário Líder ou Administração
```

## Limitações conhecidas / próximos passos possíveis

- O calendário sincroniza apenas internamente (não há integração com Google Calendar/Outlook).
- A sugestão automática de horários livres considera o intervalo das 07h às 22h.
- Não há envio de e-mail/WhatsApp de confirmação — o código de reserva aparece na tela do
  assistente, então oriente as pessoas a guardá-lo (print ou anotação).
