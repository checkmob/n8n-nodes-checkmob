# n8n-nodes-checkmob

[![npm version](https://img.shields.io/npm/v/n8n-nodes-checkmob)](https://www.npmjs.com/package/n8n-nodes-checkmob)

Community node for **[Checkmob](https://checkmob.com)** — field service management platform.

Handles JWT authentication automatically: the node logs in using your credentials and reuses the token until it expires.

> **v1.0.0 — migrated to Checkmob API v2.** This version connects to the Checkmob **API v2** (`/v2/...`), which is not backwards compatible with the old `/api/v1/...` endpoints used by previous releases.

---

## Installation

In your n8n instance go to **Settings → Community Nodes → Install** and enter:

```
n8n-nodes-checkmob
```

---

## Credentials

1. In n8n go to **Credentials → New → Checkmob API**
2. Fill in:
   - **Login** — seu Usuário ou E-mail
   - **Senha** — sua Senha

The node connects to `https://api-integration.checkmob.com` and obtains the Bearer Token automatically.

---

## Resources & Operations

| Resource | Operations |
|---|---|
| **Categoria** | Listar |
| **Campo Personalizado** | Listar (Clientes/Pessoas) |
| **Cliente** | Listar · Buscar · Criar · Criar em Lote · Substituir · Editar Parcialmente · Excluir · Vincular/Desvincular Pessoas |
| **Deslocamento** | Resumo por Usuário · Listar Dias · Listar Percursos |
| **Endereço do Cliente** | Listar · Substituir Principal |
| **Endereço de Pessoa** | Buscar · Substituir |
| **Etapa** | Listar |
| **Grupo** | Listar · Buscar · Criar · Editar · Excluir |
| **Nota do Cliente** | Listar · Criar · Editar · Excluir |
| **Objetivo** | Listar |
| **Ordem de Serviço** | Listar · Buscar · Criar · Substituir · Excluir · Excluir em Lote · Listar/Alterar Status |
| **Pessoa** | Listar · Buscar · Criar · Editar · Excluir · Ativar/Inativar em Lote · Vincular/Desvincular Clientes |
| **Questionário** | Listar · Buscar · Vincular/Remover Grupo · Vincular/Remover Segmento |
| **Registro** | Listar · Buscar · Criar Agendado · Editar |
| **Respostas de Questionário** | Buscar por Registro · Buscar por OS · Listar |
| **Segmento** | Listar · Buscar · Criar · Editar · Excluir · Obter Vínculos · Vincular/Remover Cliente, Grupo, Usuário |
| **Setor de Mercado** | Listar |
| **Status de Serviço** | Listar |
| **Temperatura** | Listar |
| **Tipo de Serviço** | Listar |
| **Usuário** | Listar · Buscar · Buscar Localização |

Note: some fields available in the old API v1 (e.g. setting a client's categoria/temperatura/etapa/valor de negócio at creation time) are read-only in API v2 — see the [Checkmob v2 docs](https://api-integration.checkmob.com/index.html) for the current capabilities of each resource.

---

## Configuration

### Idioma

Each node instance exposes a **Idioma** (Language) dropdown:

| Option | Value |
|---|---|
| Português (default) | `pt-BR` |
| English | `en-US` |

This sets the `Accept-Language` header on every API request, controlling the language of error messages returned by Checkmob.

### Continue on Error

When **Continue on Error** is enabled, failed items return a JSON object instead of halting the workflow:

```json
{
  "error": "HTTP 400 [ERRO_VALIDACAO] — nome: campo obrigatório",
  "statusCode": 400,
  "details": [{ "campo": "nome", "codigo": "obrigatorio", "mensagem": "campo obrigatório" }]
}
```

---

## API Reference

[https://api-integration.checkmob.com/swagger/v2/swagger.json](https://api-integration.checkmob.com/swagger/v2/swagger.json)

---

## License

MIT
