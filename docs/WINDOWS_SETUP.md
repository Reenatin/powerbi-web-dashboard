# Windows Setup

Para Windows 10/11, o projeto inclui um instalador assistido.

## Opção mais simples

Depois de clonar ou baixar o repositório:

1. Execute **`setup-windows.cmd`**.
2. Se o Node.js não estiver instalado, o script tenta instalar o **Node.js LTS** usando `winget`.
3. O script executa `npm install`.
4. Se ainda não existir, cria `.env` a partir de `.env.example`.
5. Executa `npm run doctor`.

Depois, execute:

```text
start-windows.cmd
```

ou, no terminal:

```powershell
npm run dev
```

A aplicação ficará disponível em:

```text
http://localhost:5173
```

## Permissão do Windows

A instalação do Node.js pode abrir uma solicitação do Windows/UAC porque o pacote oficial é instalado na máquina.

## Se o winget não existir

O instalador não baixa executáveis de fontes alternativas.

Instale o Node.js LTS pelo site oficial:

https://nodejs.org/en/download

Depois execute `setup-windows.cmd` novamente.

## Power BI ainda não configurado

O setup cria o `.env`, mas não preenche credenciais.

Isso é intencional. Nunca coloque Client Secret em arquivos versionados.

Enquanto as credenciais estiverem vazias, `npm run doctor` mostrará os itens do Power BI como ausentes. A aplicação ainda pode ser iniciada para mostrar o estado de configuração.
