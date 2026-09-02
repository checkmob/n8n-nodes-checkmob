# n8n-nodes-checkmob

[![npm version](https://img.shields.io/npm/v/n8n-nodes-checkmob)](https://www.npmjs.com/package/n8n-nodes-checkmob)

This is an n8n community node. It lets you use the **[Checkmob](https://checkmob.com)** field service management platform in your n8n workflows.

Checkmob is a Brazilian field service management platform used to manage clients, people, groups, service orders, visits (registros), questionnaires (checklists) and mileage/travel tracking for field teams, with a REST API (v2) covering the full lifecycle of a field service operation.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

```text
n8n-nodes-checkmob
```

## Operations

This node supports the following Checkmob resources and operations:

| Resource | Operations |
|---|---|
| **Category** | List |
| **Custom Field** | List (Clients/People) |
| **Client** | List · Get · Create · Create in Bulk · Replace · Update Partially · Delete · Link/Unlink People |
| **Travel** | Summary by User · List Days · List Routes |
| **Client Address** | List · Replace Main |
| **Person Address** | Get · Replace |
| **Step** | List |
| **Group** | List · Get · Create · Update · Delete |
| **Client Note** | List · Create · Update · Delete |
| **Objective** | List |
| **Service Order** | List · Get · Create · Replace · Delete · Delete Bulk · List/Change Status |
| **Person** | List · Get · Create · Update · Delete · Activate/Deactivate in Bulk · Link/Unlink Clients |
| **Checklist** | Get · List · Link/Remove Group · Link/Remove Segment |
| **Record** | Get · List · Create Scheduled · Update |
| **Checklist Answer** | Get by Record · Get by Service Order · List |
| **Segment** | List · Get · Create · Update · Delete · Get Links · Link/Remove Client, Group, User |
| **Market Sector** | List |
| **Service Status** | List |
| **Temperature** | List |
| **Service Type** | List |
| **User** | List · Get · Locations |

> Some fields available in the old API v1 (e.g. setting a client's category/temperature/stage/deal value at creation time) are read-only in API v2 — see the [Checkmob v2 docs](https://api-integration.checkmob.com/index.html) for the current capabilities of each resource.

This node can also be used as a **tool by AI Agents** in n8n, so an agent can call Checkmob resources directly from natural-language instructions.

## Credentials

To use this node, you need a Checkmob account with API access.

### Prerequisites

1. Have an active Checkmob account with a valid **login** (username or email) and **password**.

### Authentication Setup

1. In n8n, go to **Credentials** → **New** → **Checkmob API**
2. Fill in:
   - **Login** — your Checkmob username or e-mail
   - **Password** — your Checkmob password
3. **Save** the credential.

The node authenticates against `https://api-integration.checkmob.com`, obtains a Bearer token automatically, and transparently refreshes it when it expires — no manual token management is needed.

## Compatibility

- **n8n Nodes API Version**: 1
- Built with [`@n8n/node-cli`](https://www.npmjs.com/package/@n8n/node-cli) and TypeScript, following current n8n community node standards (declarative credential authentication via `preAuthentication`, `usableAsTool` for AI Agents).
- Requires an n8n version that supports community nodes (self-hosted, or a Checkmob API integration verified for n8n Cloud).

## Usage

### Language

Each node instance exposes a **Language** dropdown:

| Option | Value |
|---|---|
| Portuguese (default) | `pt-BR` |
| English | `en-US` |

This sets the `Accept-Language` header on every API request, controlling the language of error messages returned by Checkmob.

### Continue on Error

When **Continue on Error** is enabled, failed items return a JSON object instead of halting the workflow. The example below shows an actual error response from the Checkmob API — its field names and messages are returned as-is by Checkmob (in Portuguese by default, or in English when **Language** is set to `en-US`):

```json
{
  "error": "HTTP 400 [ERRO_VALIDACAO] — nome: campo obrigatório",
  "statusCode": 400,
  "details": [{ "campo": "nome", "codigo": "obrigatorio", "mensagem": "campo obrigatório" }]
}
```

### Best Practices

- Use n8n's error handling nodes (or **Continue on Error**, above) to manage API failures gracefully in production workflows.
- The node returns structured JSON data that can be mapped directly into other n8n nodes.

For beginners, check out the [n8n Try it out](https://docs.n8n.io/try-it-out/) documentation to learn the basics of workflow automation.

## Resources

### n8n Documentation

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [n8n workflow automation guide](https://docs.n8n.io/try-it-out/)
- [n8n credentials management](https://docs.n8n.io/integrations/credentials/)

### Checkmob Documentation

- [Checkmob API v2 reference](https://api-integration.checkmob.com/index.html)
- [Checkmob API v2 Swagger/OpenAPI spec](https://api-integration.checkmob.com/swagger/v2/swagger.json)
- [Checkmob](https://checkmob.com)

### Support & Community

- [n8n Community Forum](https://community.n8n.io/)
- [n8n GitHub Discussions](https://github.com/n8n-io/n8n/discussions)
- [Checkmob repository](https://github.com/checkmob/n8n-nodes-checkmob)

## License

[MIT](LICENSE.md)
