# Power BI Web Dashboard

Starter kit open-source para transformar um **Power BI Semantic Model** em um dashboard web customizável com React, TypeScript, Node.js e ECharts.

O projeto não inclui dados MOCK. Você conecta o seu próprio modelo semântico e define cards, gráficos e filtros por configuração.

## Ideia

```text
Browser
  ↓
React + TypeScript
  ↓
Node.js + Express
  ↓
Microsoft Entra ID
  ↓
Power BI REST API / executeQueries
  ↓
Power BI Semantic Model
```

O navegador nunca recebe `CLIENT_SECRET`, access token ou DAX arbitrário.

## Instalação rápida no Windows

No Windows 10/11, depois de clonar ou baixar o repositório, execute:

```text
setup-windows.cmd
```

O instalador:

- verifica se Node.js 20+ e npm estão disponíveis;
- instala o **Node.js LTS** via `winget` se necessário;
- executa `npm install`;
- cria `.env` a partir de `.env.example` se ainda não existir;
- executa `npm run doctor`.

Depois, inicie usando:

```text
start-windows.cmd
```

e abra:

```text
http://localhost:5173
```

> A instalação do Node.js pode solicitar autorização do Windows/UAC. Se `winget` não estiver disponível, consulte [docs/WINDOWS_SETUP.md](docs/WINDOWS_SETUP.md).

## Requisitos

Para instalação manual:

- Node.js 20+
- npm 10+
- Um workspace e semantic model do Power BI acessíveis pela identidade configurada
- App registration / Service Principal no Microsoft Entra ID para o modo inicial de autenticação

> A arquitetura foi preparada para evoluir para outros modos de autenticação. A versão inicial usa Client Credentials / Service Principal.

## Instalação manual

```bash
git clone https://github.com/Reenatin/powerbi-web-dashboard.git
cd powerbi-web-dashboard
npm install
```

Crie seu `.env`:

```powershell
Copy-Item .env.example .env
```

Preencha:

```env
TENANT_ID=
CLIENT_ID=
CLIENT_SECRET=
POWERBI_WORKSPACE_ID=
POWERBI_DATASET_ID=
POWERBI_DATASET_NAME=
API_PORT=3001
```

Depois execute:

```bash
npm run doctor
npm run dev
```

Abra `http://localhost:5173`.

## Sem dados por padrão

Se nenhum modelo estiver configurado, a aplicação continua inicializando e mostra o estado de configuração. Ela **não inventa valores** e não usa fallback MOCK.

## Configurando o dashboard

Edite `config/dashboard.json`.

### Card

```json
{
  "id": "total-sales",
  "title": "Total Sales",
  "measure": "[Total Sales]",
  "format": "currency"
}
```

### Gráfico

```json
{
  "id": "sales-by-category",
  "title": "Sales by Category",
  "type": "bar",
  "dimension": "'Product'[Category]",
  "measure": "[Total Sales]",
  "sort": "desc",
  "limit": 10
}
```

### Filtro

```json
{
  "id": "category",
  "label": "Category",
  "type": "multi-select",
  "field": "'Product'[Category]"
}
```

### Período

```json
{
  "id": "period",
  "label": "Period",
  "type": "date-range",
  "field": "'Calendar'[Date]"
}
```

Os identificadores de tabela/campo e medidas acima são apenas exemplos. Use os nomes existentes no seu modelo.

## Segurança

- `.env` é ignorado pelo Git.
- `CLIENT_SECRET` fica somente no backend.
- O frontend envia apenas IDs de filtros e valores selecionados.
- O backend resolve esses IDs contra `dashboard.json`.
- O browser não envia DAX arbitrário.
- Workspace e Dataset ID ficam no servidor.

## Testar conexão

Na interface existe o botão **Test connection**. Ele valida autenticação e uma consulta mínima via `executeQueries`.

Também rode:

```bash
npm run doctor
```

## Usar um sample oficial da Microsoft

Se você não possui um modelo próprio, importe um dos Power BI samples oficiais para o seu workspace e aponte este projeto para o semantic model criado.

Documentação Microsoft:

- https://learn.microsoft.com/power-bi/create-reports/sample-datasets
- https://learn.microsoft.com/power-bi/create-reports/sample-tutorial-connect-to-the-samples

O sample não é redistribuído neste repositório.

## Configurar com ajuda de IA

Este projeto possui um `AGENTS.md` preparado para ChatGPT/Codex e outros agentes que respeitem instruções de repositório.

Use algo como:

> Leia o AGENTS.md e me ajude a conectar meu Power BI e configurar meu primeiro dashboard.

## Estrutura

```text
powerbi-web-dashboard/
├── apps/
│   ├── api/
│   └── web/
├── config/
│   └── dashboard.json
├── docs/
├── scripts/
│   ├── doctor.mjs
│   └── setup-windows.ps1
├── setup-windows.cmd
├── start-windows.cmd
├── AGENTS.md
├── .env.example
└── package.json
```

## Roadmap

- [x] Estrutura React + Node + TypeScript
- [x] Configuração por JSON
- [x] Cards genéricos
- [x] Gráficos genéricos com ECharts
- [x] Filtros multi-select e intervalo de datas
- [x] Estado sem modelo configurado
- [x] Teste de conexão com Power BI
- [x] Bootstrap/instalador assistido para Windows
- [ ] Wizard interativo de configuração do Power BI
- [ ] Descoberta assistida de metadados
- [ ] Mais layouts de cards
- [ ] Mais tipos de gráfico
- [ ] Temas configuráveis avançados
- [ ] Auth user-delegated
- [ ] Testes automatizados

## Licença

MIT.
