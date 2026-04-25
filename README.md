# MCP LatAm Tools

[![smithery badge](https://smithery.ai/badge/josemvelez/mcp-latam-tools)](https://smithery.ai/servers/josemvelez/mcp-latam-tools)

Essential Latin American data validation and utility tools for AI agents working with Brazilian, Mexican and Chilean business data.

## Overview

MCP LatAm Tools provides a compliance layer for AI agents operating in Latin American markets. It provides instant validation of tax identifiers, payment keys, and public holidays across Brazil, Mexico and Chile — with no external API dependencies.

**Live endpoint:** `https://mcp-latam-tools-production.up.railway.app/mcp`

## Tools

### 🇧🇷 Brazil
- **validate_cpf** — Validates Brazilian CPF using the official Receita Federal checksum algorithm
- **validate_cnpj** — Validates Brazilian CNPJ using the official Receita Federal checksum algorithm
- **validate_pix_key** — Validates Brazilian PIX keys (CPF, CNPJ, email, phone, EVP UUID)
- **get_brazil_holidays** — Returns Brazilian national public holidays for any year

### 🇲🇽 Mexico
- **validate_rfc_mx** — Validates Mexican RFC for individuals (13 chars) and companies (12 chars)
- **get_mexico_holidays** — Returns Mexican national public holidays for any year

### 🇨🇱 Chile
- **validate_rut_cl** — Validates Chilean RUT using the official modulo-11 checksum algorithm
- **get_chile_holidays** — Returns Chilean national public holidays for any year

## Usage

Connect via Smithery:

```
smithery mcp add josemvelez/mcp-latam-tools
```

Or add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "mcp-latam-tools": {
      "url": "https://mcp-latam-tools-production.up.railway.app/mcp"
    }
  }
}
```

## Use Cases

- E-commerce order validation for Brazilian and Mexican markets
- Fintech onboarding with CPF/CNPJ/RFC/RUT verification
- Payment processing with PIX key validation
- HR systems calculating public holidays across LatAm
- Invoice compliance for cross-border LatAm transactions

## License

MIT
