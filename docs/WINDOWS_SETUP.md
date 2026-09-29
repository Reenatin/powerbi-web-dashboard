# Windows Setup

Para Windows 10/11, o projeto inclui um bootstrap assistido.

## Opção mais simples

Depois de clonar ou baixar o repositório:

1. Execute **`setup-windows.cmd`**.
2. Se já existir Node.js 20+ no computador, ele será reutilizado.
3. Se não existir, o script baixa um **Node.js LTS portátil diretamente de `nodejs.org`**.
4. O SHA-256 do arquivo baixado é comparado com o `SHASUMS256.txt` oficial da mesma release.
5. O runtime é extraído em `.tools/node`, sem precisar ser adicionado permanentemente ao PATH do Windows.
6. O script executa `npm install`.
7. Se ainda não existir, cria `.env` a partir de `.env.example`.
8. Executa `npm run doctor`.

Depois, execute:

```text
start-windows.cmd
```

ou, se você já possui Node/npm instalados globalmente:

```powershell
npm run dev
```

A aplicação ficará disponível em:

```text
http://localhost:5173
```

## Precisa de administrador?

Normalmente, **não**.

Quando não encontra um Node.js compatível, o projeto usa uma versão portátil dentro de `.tools/node`. Nada é instalado globalmente no Windows.

## Segurança do download

O bootstrap automático usa somente:

- `https://nodejs.org/dist/index.json`
- arquivos de release em `https://nodejs.org/dist/<versão>/`
- `SHASUMS256.txt` da própria release

Antes de extrair o pacote, o script valida o SHA-256.

## Power BI ainda não configurado

O setup cria o `.env`, mas não preenche credenciais.

Isso é intencional. Nunca coloque Client Secret em arquivos versionados.

Enquanto as credenciais estiverem vazias, `npm run doctor` mostrará os itens do Power BI como ausentes. A aplicação ainda pode ser iniciada para mostrar o estado de configuração.
