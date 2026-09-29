# macOS Setup

O projeto possui bootstrap portátil para macOS Intel e Apple Silicon.

## Instalação

Depois de clonar o repositório, você pode executar no Terminal:

```bash
./setup-macos.command
```

ou abrir `setup-macos.command` pelo Finder.

O script:

1. reutiliza Node.js 20+ e npm 10+ se já estiverem disponíveis;
2. detecta Intel (`x64`) ou Apple Silicon (`arm64`);
3. baixa uma release **LTS oficial** diretamente de `nodejs.org`;
4. valida o SHA-256 usando o `SHASUMS256.txt` oficial;
5. extrai o runtime em `.tools/node`;
6. executa `npm install`;
7. cria o `.env` se necessário;
8. executa `npm run doctor`.

Depois:

```bash
./start-macos.command
```

Abra:

```text
http://localhost:5173
```

## Precisa instalar Homebrew?

Não.

O bootstrap não depende de Homebrew e não instala Node.js globalmente.

## Gatekeeper

Arquivos `.command` clonados via Git normalmente preservam a permissão de execução. Se o macOS bloquear a abertura pelo Finder, execute pelo Terminal:

```bash
chmod +x setup-macos.command start-macos.command scripts/*.sh
./setup-macos.command
```

## Power BI

O `.env` é criado vazio. Preencha as credenciais localmente e nunca versione esse arquivo.
