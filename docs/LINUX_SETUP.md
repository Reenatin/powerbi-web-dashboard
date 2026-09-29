# Linux Setup

O projeto possui bootstrap portátil para Linux.

## Instalação

Depois de clonar o repositório:

```bash
./setup-linux.sh
```

O script:

1. reutiliza Node.js 20+ e npm 10+ se já estiverem disponíveis;
2. caso contrário, identifica a arquitetura da máquina;
3. baixa uma release **LTS oficial** diretamente de `nodejs.org`;
4. valida o SHA-256 usando o `SHASUMS256.txt` oficial;
5. extrai o runtime em `.tools/node`;
6. executa `npm install`;
7. cria o `.env` se necessário;
8. executa `npm run doctor`.

Depois:

```bash
./start-linux.sh
```

Abra:

```text
http://localhost:5173
```

## Arquiteturas

O bootstrap suporta:

- Linux x64;
- Linux ARM64;
- Linux x64 com musl/Alpine quando a release LTS oficial correspondente estiver disponível.

## Dependências do bootstrap

O script usa utilitários normalmente presentes em distribuições Linux:

- `bash`;
- `tar`;
- um downloader: `curl`, `wget` ou `python3`;
- um verificador SHA-256: `sha256sum`, `shasum` ou `openssl`.

O Node.js em si não precisa ser instalado globalmente e não exige `sudo`.

## Power BI

O `.env` é criado vazio. Preencha as credenciais localmente e nunca versione esse arquivo.
