# Power BI Web Dashboard — AI Assistant Instructions

## Objetivo

Este repositório é um starter kit para criar dashboards web personalizados usando um Power BI Semantic Model como fonte analítica.

O usuário deve conseguir conectar o próprio modelo e configurar cards, gráficos e filtros sem transformar o núcleo da aplicação em código específico para um único projeto.

Stack principal:

- React + TypeScript
- Node.js + TypeScript + Express
- Apache ECharts
- Microsoft Entra ID
- Power BI REST API (`executeQueries`)

## Regras de trabalho

1. Leia este arquivo e o `README.md` antes de alterar o projeto.
2. Nunca presuma nomes de tabelas, colunas ou medidas do modelo do usuário.
3. Nunca invente Tenant ID, Client ID, Workspace ID, Dataset ID ou credenciais.
4. Nunca peça para o usuário commitar ou compartilhar `CLIENT_SECRET`.
5. Prefira configuração em `config/dashboard.json` a hard-code no React.
6. Preserve a separação frontend → backend → Power BI.
7. Não implemente fallback com dados MOCK para esconder falha de conexão.
8. O frontend não pode enviar DAX arbitrário para o backend.
9. Regras analíticas existentes devem permanecer no Semantic Model sempre que possível.

## Primeiro contato

Quando o usuário pedir ajuda para configurar o projeto:

1. identifique o sistema operacional;
2. use o bootstrap correspondente:
   - Windows: `setup-windows.cmd`;
   - Linux: `./setup-linux.sh`;
   - macOS: `./setup-macos.command`;
3. em instalação manual, verifique Node.js 20+ e npm 10+;
4. rode `npm install` se necessário;
5. rode `npm run doctor`;
6. ajude a preencher `.env` sem expor segredos;
7. teste a conexão;
8. identifique medidas e campos reais do modelo;
9. configure `config/dashboard.json`;
10. rode `npm run typecheck` e `npm run build`.

Nunca peça credenciais sensíveis em chat se elas puderem ser preenchidas diretamente no `.env`.

## Configuração do Power BI

Variáveis esperadas:

```env
TENANT_ID=
CLIENT_ID=
CLIENT_SECRET=
POWERBI_WORKSPACE_ID=
POWERBI_DATASET_ID=
POWERBI_DATASET_NAME=
API_PORT=3001
```

`.env` nunca deve ser versionado.

## Fluxo correto

```text
Browser
  ↓
React
  ↓
Node.js API
  ↓
Microsoft Entra ID
  ↓
Power BI REST API
  ↓
Semantic Model
```

## dashboard.json

O arquivo `config/dashboard.json` é a principal superfície de customização.

### Cards

Descubra com o usuário:

- título;
- medida existente;
- formato (`integer`, `decimal`, `percentage`, `currency`, `duration`).

### Gráficos

Descubra:

- título;
- tipo;
- dimensão;
- medida;
- ordenação;
- limite.

### Filtros

Descubra:

- label;
- campo real do modelo;
- tipo (`multi-select` ou `date-range`).

## Segurança

Nunca:

- commite `.env`;
- exponha token ou Client Secret no frontend;
- coloque segredo em logs;
- aceite DAX arbitrário enviado pelo browser;
- use valores de configuração privados em exemplos públicos sem necessidade.

## Validação

Depois de qualquer alteração relevante:

```bash
npm run typecheck
npm run build
```

Se algo não puder ser validado por falta de credenciais Power BI, informe claramente.

## Princípio central

O núcleo deve permanecer genérico.

Customizações de um usuário devem ficar preferencialmente em:

```text
config/
custom/
examples/
```

antes de exigir mudanças no engine.


## Bootstrap multi-OS

Os instaladores Windows, Linux e macOS devem manter comportamento equivalente:

- reutilizar Node.js 20+ / npm 10+ quando disponíveis;
- preferir runtime portátil em `.tools/node` quando for necessário baixar Node;
- baixar somente de `nodejs.org`;
- validar SHA-256 antes de extrair;
- não preencher credenciais automaticamente;
- preservar `.env` existente;
- executar `npm install` e `npm run doctor`.

Ao alterar um bootstrap, avalie se a mesma mudança deve ser aplicada aos outros sistemas operacionais.


## Descoberta de Semantic Models

Se o usuário souber o Workspace ID, mas não souber o Dataset ID, não peça para adivinhar ou extrair de URL.

Oriente o comando adequado:

- Windows: `list-models-windows.cmd`
- Linux: `./list-models-linux.sh`
- macOS: `./list-models-macos.command`
- com npm global: `npm run list-models`

Esse comando usa apenas Tenant/Client/Secret + Workspace ID para listar os Semantic Models acessíveis e mostrar seus Dataset IDs.
