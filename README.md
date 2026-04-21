# MCP LatAm Tools

[![smithery badge](https://smithery.ai/badge/josemvelez/mcp-latam-tools)](https://smithery.ai/servers/josemvelez/mcp-latam-tools)

MCP Server with validation and utility tools for Latin American markets. Covers Brazil, Mexico, and Chile.

## Tools

### 🇧🇷 Brazil
- **validate_cpf** — Validates a Brazilian CPF using the official Receita Federal checksum algorithm
- **validate_cnpj** — Validates a Brazilian CNPJ using the official Receita Federal checksum algorithm
- **validate_pix_key** — Validates Brazilian PIX key formats (CPF, CNPJ, email, phone, EVP)
- **get_brazil_holidays** — Returns Brazilian national public holidays for any given year

### 🇲🇽 Mexico
- **validate_rfc_mx** — Validates a Mexican RFC format for individuals (13 chars) and companies (12 chars)
- **get_mexico_holidays** — Returns Mexican national public holidays for any given year

### 🇨🇱 Chile
- **validate_rut_cl** — Validates a Chilean RUT using the official modulo-11 checksum algorithm
- **get_chile_holidays** — Returns Chilean national public holidays for any given year

## Usage

Connect via Smithery:
