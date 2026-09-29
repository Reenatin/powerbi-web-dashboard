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

1. verifique Node/npm;
2. rode `npm install` se necessário;
3. rode `npm run doctor`;
4. ajude a preencher `.env` sem expor segredos;
5. teste a conexão;
6. identifique medidas e campos reais do modelo;
7. configure `config/dashboard.json`;
8. rode `npm run typecheck` e `npm run build`.

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
