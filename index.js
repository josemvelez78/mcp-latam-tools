import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import http from "http";

const createServer = () => {
  const server = new McpServer({
    name: "mcp-latam-tools",
    version: "1.0.0",
    description: "Latin American data validation tools for AI agents. Covers Brazil, Mexico, Chile, Argentina and Colombia."
  });

  // ── FERRAMENTA 1: Validar CPF Brasileiro ──
  server.tool(
    "validate_cpf",
    "Validates a Brazilian CPF (Cadastro de Pessoas Físicas) using the official Receita Federal checksum algorithm. Use this tool when processing Brazilian user registrations, invoices, tax forms, e-commerce orders, or any document requiring a valid Brazilian individual taxpayer number. Input must be 11 digits (with or without formatting like 123.456.789-09). Returns whether the CPF is valid and the cleaned CPF. Does not verify if the CPF exists in Receita Federal database.",
    { cpf: z.string().describe("The Brazilian CPF to validate. Accepts formatted (123.456.789-09) or unformatted (12345678909). Example: '529.982.247-25'") },
    async ({ cpf }) => {
      const clean = cpf.replace(/[.\-\s]/g, "");
      if (!/^\d{11}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "CPF must have exactly 11 digits" }) }] };
      }
      if (/^(\d)\1{10}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "CPF cannot have all identical digits" }) }] };
      }
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
      let remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(clean[9])) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "Invalid first check digit" }) }] };
      }
      sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      const valid = remainder === parseInt(clean[10]);
      const formatted = `${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9)}`;
      return { content: [{ type: "text", text: JSON.stringify({ valid, cpf: clean, formatted }) }] };
    }
  );

  // ── FERRAMENTA 2: Validar CNPJ Brasileiro ──
  server.tool(
    "validate_cnpj",
    "Validates a Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica) using the official Receita Federal checksum algorithm. Use this tool when processing Brazilian company registrations, B2B invoices, supplier onboarding, or any document requiring a valid Brazilian company taxpayer number. Accepts formatted (12.345.678/0001-90) or unformatted input. Returns whether the CNPJ is valid and the formatted CNPJ.",
    { cnpj: z.string().describe("The Brazilian CNPJ to validate. Accepts formatted (12.345.678/0001-90) or unformatted (12345678000190). Example: '11.222.333/0001-81'") },
    async ({ cnpj }) => {
      const clean = cnpj.replace(/[.\-\/\s]/g, "");
      if (!/^\d{14}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "CNPJ must have exactly 14 digits" }) }] };
      }
      if (/^(\d)\1{13}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "CNPJ cannot have all identical digits" }) }] };
      }
      const calcDigit = (cnpj, length) => {
        let sum = 0;
        let pos = length - 7;
        for (let i = length; i >= 1; i--) {
          sum += parseInt(cnpj[length - i]) * pos--;
          if (pos < 2) pos = 9;
        }
        return sum % 11 < 2 ? 0 : 11 - (sum % 11);
      };
      const first = calcDigit(clean, 12);
      const second = calcDigit(clean, 13);
      const valid = first === parseInt(clean[12]) && second === parseInt(clean[13]);
      const formatted = `${clean.slice(0,2)}.${clean.slice(2,5)}.${clean.slice(5,8)}/${clean.slice(8,12)}-${clean.slice(12)}`;
      return { content: [{ type: "text", text: JSON.stringify({ valid, cnpj: clean, formatted }) }] };
    }
  );

  // ── FERRAMENTA 3: Validar Chave PIX ──
  server.tool(
    "validate_pix_key",
    "Validates a Brazilian PIX key format. PIX is Brazil's instant payment system. Use this tool when processing Brazilian payments, validating payment forms, or any fintech application handling Brazilian transfers. Supports all 4 PIX key types: CPF/CNPJ (tax numbers), email, phone number (+55 format), and EVP (random key UUID format). Returns the key type detected and whether the format is valid.",
    { key: z.string().describe("The PIX key to validate. Can be a CPF (123.456.789-09), CNPJ (12.345.678/0001-90), email (user@example.com), phone (+5511999999999), or EVP random key (UUID format). Example: '+5511987654321'") },
    async ({ key }) => {
      const clean = key.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "email", key: clean }) }] };
      }
      if (/^\+55\d{10,11}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "phone", key: clean }) }] };
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "evp", key: clean }) }] };
      }
      const digits = clean.replace(/[.\-\/\s]/g, "");
      if (/^\d{11}$/.test(digits)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "cpf", key: digits }) }] };
      }
      if (/^\d{14}$/.test(digits)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "cnpj", key: digits }) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "Key format not recognized. Expected CPF, CNPJ, email, phone (+55...) or EVP UUID" }) }] };
    }
  );

  // ── FERRAMENTA 4: Feriados Brasileiros ──
  server.tool(
    "get_brazil_holidays",
    "Returns Brazilian national public holidays for any given year. Use this tool when calculating delivery dates, scheduling appointments, computing working days, or any task requiring knowledge of non-working days in Brazil. Returns all national holidays with dates in YYYY-MM-DD format and names in Portuguese and English. Note: Brazil also has state and municipal holidays not included here.",
    { year: z.number().describe("The year to get holidays for. Example: 2026") },
    async ({ year }) => {
      const holidays = [
        { date: `${year}-01-01`, name: "Confraternização Universal", name_en: "New Year's Day" },
        { date: `${year}-04-21`, name: "Tiradentes", name_en: "Tiradentes Day" },
        { date: `${year}-05-01`, name: "Dia do Trabalhador", name_en: "Labour Day" },
        { date: `${year}-09-07`, name: "Independência do Brasil", name_en: "Brazilian Independence Day" },
        { date: `${year}-10-12`, name: "Nossa Senhora Aparecida", name_en: "Our Lady of Aparecida" },
        { date: `${year}-11-02`, name: "Finados", name_en: "All Souls Day" },
        { date: `${year}-11-15`, name: "Proclamação da República", name_en: "Republic Proclamation Day" },
        { date: `${year}-11-20`, name: "Dia da Consciência Negra", name_en: "Black Consciousness Day" },
        { date: `${year}-12-25`, name: "Natal", name_en: "Christmas Day" },
      ];
      return { content: [{ type: "text", text: JSON.stringify({ year, country: "Brazil", total_holidays: holidays.length, holidays }) }] };
    }
  );

  // ── FERRAMENTA 5: Validar RFC Mexicano ──
  server.tool(
    "validate_rfc_mx",
    "Validates a Mexican RFC (Registro Federal de Contribuyentes) format for both individuals (13 characters) and companies (12 characters). Use this tool when processing Mexican invoices (CFDI), tax forms, supplier registrations, or any document requiring a valid Mexican taxpayer identification. Returns the RFC type (person or company), whether the format is valid, and the cleaned RFC.",
    { rfc: z.string().describe("The Mexican RFC to validate. Individuals have 13 characters, companies have 12. Example: 'GODE561231GR8' for a person or 'AAA010101AAA' for a company") },
    async ({ rfc }) => {
      const clean = rfc.replace(/\s/g, "").toUpperCase();
      const personRegex = /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/;
      const companyRegex = /^[A-Z]{3}\d{6}[A-Z0-9]{3}$/;
      if (personRegex.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "person", rfc: clean }) }] };
      }
      if (companyRegex.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "company", rfc: clean }) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "Invalid RFC format. Person RFC: 4 letters + 6 digits + 3 alphanumeric. Company RFC: 3 letters + 6 digits + 3 alphanumeric" }) }] };
    }
  );

  // ── FERRAMENTA 6: Validar RUT Chileno ──
  server.tool(
    "validate_rut_cl",
    "Validates a Chilean RUT (Rol Único Tributario) using the official Chilean modulo-11 checksum algorithm. Use this tool when processing Chilean invoices, tax forms, user registrations, e-commerce orders, or any document requiring a valid Chilean tax identification number. Accepts formatted (12.345.678-9) or unformatted input. Returns whether the RUT is valid and the formatted RUT.",
    { rut: z.string().describe("The Chilean RUT to validate. Accepts formatted (12.345.678-9) or unformatted (123456789). The last character is the verification digit which can be a number or 'K'. Example: '12.345.678-9'") },
    async ({ rut }) => {
      const clean = rut.replace(/[.\-\s]/g, "").toUpperCase();
      if (!/^\d{7,8}[0-9K]$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "Invalid RUT format" }) }] };
      }
      const body = clean.slice(0, -1);
      const verifier = clean.slice(-1);
      let sum = 0;
      let multiplier = 2;
      for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
      }
      const remainder = 11 - (sum % 11);
      const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : remainder.toString();
      const valid = verifier === expected;
      const formatted = `${body.slice(0,-3)}.${body.slice(-3,-0)}.${body.slice(-3)}-${verifier}`;
      return { content: [{ type: "text", text: JSON.stringify({ valid, rut: clean, formatted: `${body}-${verifier}` }) }] };
    }
  );

  // ── FERRAMENTA 7: Feriados Mexicanos ──
  server.tool(
    "get_mexico_holidays",
    "Returns Mexican national public holidays for any given year. Use this tool when calculating delivery dates, scheduling appointments, or any task requiring knowledge of non-working days in Mexico. Returns all mandatory national holidays with dates in YYYY-MM-DD format and names in Spanish and English.",
    { year: z.number().describe("The year to get holidays for. Example: 2026") },
    async ({ year }) => {
      const holidays = [
        { date: `${year}-01-01`, name: "Año Nuevo", name_en: "New Year's Day" },
        { date: `${year}-02-03`, name: "Día de la Constitución", name_en: "Constitution Day" },
        { date: `${year}-03-17`, name: "Natalicio de Benito Juárez", name_en: "Benito Juárez Birthday" },
        { date: `${year}-05-01`, name: "Día del Trabajo", name_en: "Labour Day" },
        { date: `${year}-09-16`, name: "Día de la Independencia", name_en: "Independence Day" },
        { date: `${year}-11-17`, name: "Revolución Mexicana", name_en: "Mexican Revolution Day" },
        { date: `${year}-12-25`, name: "Navidad", name_en: "Christmas Day" },
      ];
      return { content: [{ type: "text", text: JSON.stringify({ year, country: "Mexico", total_holidays: holidays.length, holidays }) }] };
    }
  );

  // ── FERRAMENTA 8: Feriados Chilenos ──
  server.tool(
    "get_chile_holidays",
    "Returns Chilean national public holidays for any given year. Use this tool when calculating delivery dates, scheduling appointments, or any task requiring knowledge of non-working days in Chile. Returns all national holidays with dates in YYYY-MM-DD format and names in Spanish and English.",
    { year: z.number().describe("The year to get holidays for. Example: 2026") },
    async ({ year }) => {
      const holidays = [
        { date: `${year}-01-01`, name: "Año Nuevo", name_en: "New Year's Day" },
        { date: `${year}-05-01`, name: "Día del Trabajo", name_en: "Labour Day" },
        { date: `${year}-05-21`, name: "Día de las Glorias Navales", name_en: "Navy Day" },
        { date: `${year}-06-29`, name: "San Pedro y San Pablo", name_en: "Saints Peter and Paul" },
        { date: `${year}-07-16`, name: "Virgen del Carmen", name_en: "Our Lady of Mount Carmel" },
        { date: `${year}-08-15`, name: "Asunción de la Virgen", name_en: "Assumption of Mary" },
        { date: `${year}-09-18`, name: "Independencia de Chile", name_en: "Chilean Independence Day" },
        { date: `${year}-09-19`, name: "Día de las Glorias del Ejército", name_en: "Army Day" },
        { date: `${year}-10-12`, name: "Día del Encuentro de Dos Mundos", name_en: "Columbus Day" },
        { date: `${year}-10-31`, name: "Día de las Iglesias Evangélicas", name_en: "Evangelical Churches Day" },
        { date: `${year}-11-01`, name: "Día de Todos los Santos", name_en: "All Saints Day" },
        { date: `${year}-12-08`, name: "Inmaculada Concepción", name_en: "Immaculate Conception" },
        { date: `${year}-12-25`, name: "Navidad", name_en: "Christmas Day" },
      ];
      return { content: [{ type: "text", text: JSON.stringify({ year, country: "Chile", total_holidays: holidays.length, holidays }) }] };
    }
  );

  return server;
};

// ── Servidor HTTP ──
const httpServer = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      name: "mcp-latam-tools",
      version: "1.0.0",
      description: "Latin American data tools for AI agents",
      tools: ["validate_cpf", "validate_cnpj", "validate_pix_key", "get_brazil_holidays", "validate_rfc_mx", "validate_rut_cl", "get_mexico_holidays", "get_chile_holidays"],
      mcp_endpoint: "/mcp"
    }));
    return;
  }

  if (req.url === "/mcp") {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`MCP LatAm Tools server running on port ${PORT}`);
});
