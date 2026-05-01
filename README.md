# MCP LatAm Tools

[![Smithery badge](https://smithery.ai/badge/josemvelez/mcp-latam-tools)](https://smithery.ai/servers/josemvelez/mcp-latam-tools)
[![Glama badge](https://glama.ai/mcp/servers/josemvelez78/mcp-latam-tools/badges/score.svg)](https://glama.ai/mcp/servers/josemvelez78/mcp-latam-tools)

Essential Latin American data validation tools for AI agents working with Brazilian, Mexican, Chilean and Argentine business data.

## Quickstart

**Option 1 — MCPize (hosted, no setup):**
```
https://latam-tools.mcpize.run
```
Free tier: 500 requests/month, no credit card required. [Get your API key →](https://mcpize.com)

**Option 2 — Smithery:**
```bash
smithery mcp add josemvelez/mcp-latam-tools
```

**Option 3 — Claude Desktop (direct endpoint):**
```json
{
  "mcpServers": {
    "mcp-latam-tools": {
      "url": "https://mcp-latam-tools-production.up.railway.app/mcp"
    }
  }
}
```

## What it does

11 tools for Latin American compliance workflows — validate tax IDs, verify payment keys, and get public holidays across Brazil, Mexico, Chile and Argentina. No auth required. Read-only and idempotent.

**Typical use cases:**
- Validate CPF/CNPJ during e-commerce checkout or fintech onboarding
- Verify PIX keys before processing payments
- Validate RFC, RUT or CUIT/CUIL for cross-border LatAm invoices
- Look up public holidays for scheduling and SLA calculations
- Automate KYC and supplier onboarding flows across LatAm markets

## Tools

### 🇧🇷 Brazil
| Tool | Description |
|------|-------------|
| `validate_cpf` | Validates Brazilian CPF using the official Receita Federal checksum algorithm |
| `validate_cnpj` | Validates Brazilian CNPJ using the official Receita Federal checksum algorithm |
| `validate_pix_key` | Validates Brazilian PIX keys — CPF, CNPJ, email, phone and EVP UUID formats |
| `get_brazil_holidays` | Returns all Brazilian national public holidays for any year |

### 🇲🇽 Mexico
| Tool | Description |
|------|-------------|
| `validate_rfc_mx` | Validates Mexican RFC for individuals (13 chars) and companies (12 chars) |
| `get_mexico_holidays` | Returns all Mexican national public holidays for any year |

### 🇨🇱 Chile
| Tool | Description |
|------|-------------|
| `validate_rut_cl` | Validates Chilean RUT using the official modulo-11 checksum algorithm |
| `get_chile_holidays` | Returns all Chilean national public holidays for any year |

### 🇦🇷 Argentina
| Tool | Description |
|------|-------------|
| `validate_cuit` | Validates Argentine CUIT (tax ID for companies and self-employed) |
| `validate_cuil` | Validates Argentine CUIL (labor ID for individuals) |
| `get_argentina_holidays` | Returns all Argentine national public holidays for any year |

## Supported Countries

Brazil, Mexico, Chile, Argentina.

## Pricing

| Plan | Requests | Price |
|------|----------|-------|
| Free | 500/month | $0 — no credit card |
| Pro | 10,000/month | $9/month or $86/year |
| Overage | Beyond plan | $0.001/request |

Available via [MCPize](https://mcpize.com).

## License

MIT
