import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import http from "http";

const createServer = () => {
  const server = new McpServer({
    name: "mcp-latam-tools",
    version: "1.2.0",
    description: "Essential Latin American data validation and utility tools for AI agents working with Brazilian, Mexican, Chilean and Argentine business data. Covers CPF, CNPJ, PIX key validation, RFC, RUT, CUIT/CUIL validation, and national public holidays for Brazil, Mexico, Chile and Argentina."
  });

  // ── FERRAMENTA 1: Validar CPF Brasileiro ──
  server.registerTool(
    "validate_cpf",
    {
      description: "Validates a Brazilian CPF (Cadastro de Pessoas Físicas) using the official Receita Federal checksum algorithm. Use this tool when processing Brazilian user registrations, invoices, tax forms, e-commerce orders, or any document requiring a valid Brazilian individual taxpayer number. Input must be an 11-digit string (with or without formatting). Returns whether the CPF is mathematically valid, along with the cleaned CPF. Does not verify if the CPF exists in the Receita Federal database — only validates the format and checksum.",
      inputSchema: { cpf: z.string().describe("The Brazilian CPF to validate. Formatting (dots and dash) is automatically removed. Example: '123.456.789-09' or '12345678909'") },
      annotations: { title: "Validate Brazilian CPF", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ cpf }) => {
      const clean = cpf.replace(/[\s.\-]/g, "");
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
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, cpf: clean }) }] };
      }
      sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      const valid = remainder === parseInt(clean[10]);
      return { content: [{ type: "text", text: JSON.stringify({ valid, cpf: clean }) }] };
    }
  );

  // ── FERRAMENTA 2: Validar CNPJ Brasileiro ──
  server.registerTool(
    "validate_cnpj",
    {
      description: "Validates a Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica) using the official Receita Federal checksum algorithm. Use this tool when processing Brazilian company registrations, B2B invoices, supplier onboarding, e-commerce orders, or any document requiring a valid Brazilian company taxpayer number. Input must be a 14-digit string (with or without formatting). Returns whether the CNPJ is mathematically valid, along with the cleaned CNPJ. Does not verify if the CNPJ is active in the Receita Federal database.",
      inputSchema: { cnpj: z.string().describe("The Brazilian CNPJ to validate. Formatting (dots, slash and dash) is automatically removed. Example: '11.222.333/0001-81' or '11222333000181'") },
      annotations: { title: "Validate Brazilian CNPJ", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ cnpj }) => {
      const clean = cnpj.replace(/[\s.\-\/]/g, "");
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
          sum += parseInt(cnpj.charAt(length - i)) * pos--;
          if (pos < 2) pos = 9;
        }
        const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        return result;
      };
      const valid = calcDigit(clean, 12) === parseInt(clean[12]) &&
                    calcDigit(clean, 13) === parseInt(clean[13]);
      return { content: [{ type: "text", text: JSON.stringify({ valid, cnpj: clean }) }] };
    }
  );

  // ── FERRAMENTA 3: Validar Chave PIX Brasileira ──
  server.registerTool(
    "validate_pix_key",
    {
      description: "Validates a Brazilian PIX key format. PIX is Brazil's instant payment system. Use this tool when processing Brazilian payments, validating payment forms, or any fintech application handling Brazilian transfers. Supports all PIX key types: CPF (11 digits), CNPJ (14 digits), email, Brazilian phone number (+55 format), and EVP (random key UUID format). Returns whether the key is valid and the detected key type.",
      inputSchema: { key: z.string().describe("The PIX key to validate. Can be a CPF, CNPJ, email, phone number (+5511999999999) or EVP UUID. Example: 'user@email.com' or '+5511999999999'") },
      annotations: { title: "Validate Brazilian PIX Key", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ key }) => {
      const clean = key.trim();
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "EVP", key: clean }) }] };
      }
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "email", key: clean }) }] };
      }
      if (/^\+55\d{10,11}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "phone", key: clean }) }] };
      }
      const digits = clean.replace(/[\s.\-]/g, "");
      if (/^\d{11}$/.test(digits)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "CPF", key: digits }) }] };
      }
      const cnpjDigits = clean.replace(/[\s.\-\/]/g, "");
      if (/^\d{14}$/.test(cnpjDigits)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "CNPJ", key: cnpjDigits }) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "Key format not recognized. Expected CPF, CNPJ, email, phone (+55...) or EVP UUID" }) }] };
    }
  );

  // ── FERRAMENTA 4: Feriados Brasileiros ──
  server.registerTool(
    "get_brazil_holidays",
    {
      description: "Returns Brazilian national public holidays for any given year. Use this tool when calculating delivery dates, scheduling appointments, computing working days, or any task requiring knowledge of non-working days in Brazil. Returns all national holidays with dates in YYYY-MM-DD format and names in both Portuguese and English. Note: Brazil also has state and municipal holidays which vary by location and are not included here.",
      inputSchema: { year: z.number().describe("The year to get holidays for. Example: 2026") },
      annotations: { title: "Get Brazil Holidays", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ year }) => {
      const holidays = [
        { date: `${year}-01-01`, name: "Confraternização Universal", name_en: "New Year's Day" },
        { date: `${year}-04-21`, name: "Tiradentes", name_en: "Tiradentes Day" },
        { date: `${year}-05-01`, name: "Dia do Trabalhador", name_en: "Labour Day" },
        { date: `${year}-09-07`, name: "Independência do Brasil", name_en: "Independence Day" },
        { date: `${year}-10-12`, name: "Nossa Senhora Aparecida", name_en: "Our Lady of Aparecida" },
        { date: `${year}-11-02`, name: "Finados", name_en: "All Souls Day" },
        { date: `${year}-11-15`, name: "Proclamação da República", name_en: "Republic Day" },
        { date: `${year}-11-20`, name: "Consciência Negra", name_en: "Black Consciousness Day" },
        { date: `${year}-12-25`, name: "Natal", name_en: "Christmas Day" },
      ];
      return { content: [{ type: "text", text: JSON.stringify({ year, country: "Brazil", total_holidays: holidays.length, holidays }) }] };
    }
  );

  // ── FERRAMENTA 5: Validar RFC Mexicano ──
  server.registerTool(
    "validate_rfc_mx",
    {
      description: "Validates a Mexican RFC (Registro Federal de Contribuyentes) format for both individuals (13 characters) and companies (12 characters). Use this tool when processing Mexican invoices (CFDI), tax forms, supplier registrations, or any document requiring a valid Mexican taxpayer identifier. Returns whether the RFC format is valid, the detected type (individual or company), and the cleaned RFC. Note: validates format only, does not verify against the SAT registry.",
      inputSchema: { rfc: z.string().describe("The Mexican RFC to validate. Spaces are automatically removed. Example: 'GODE561231GR8' for individual or 'GME9412171A3' for company") },
      annotations: { title: "Validate Mexican RFC", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ rfc }) => {
      const clean = rfc.replace(/\s/g, "").toUpperCase();
      if (/^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "individual", rfc: clean }) }] };
      }
      if (/^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: true, type: "company", rfc: clean }) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "RFC format not recognized. Expected 13 chars for individuals (4 letters + 6 digits + 3 alphanumeric) or 12 chars for companies (3 letters + 6 digits + 3 alphanumeric)" }) }] };
    }
  );

  // ── FERRAMENTA 6: Validar RUT Chileno ──
  server.registerTool(
    "validate_rut_cl",
    {
      description: "Validates a Chilean RUT (Rol Único Tributario) using the official Chilean modulo-11 checksum algorithm. Use this tool when processing Chilean invoices, tax forms, user registrations, e-commerce orders, or any document requiring a valid Chilean taxpayer identifier. Accepts RUT with or without formatting (dots and dash). Returns whether the RUT is valid and the cleaned RUT. Does not verify if the RUT is active in the SII registry.",
      inputSchema: { rut: z.string().describe("The Chilean RUT to validate. Formatting (dots and dash) is automatically removed. Example: '12.345.678-9' or '123456789'") },
      annotations: { title: "Validate Chilean RUT", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ rut }) => {
      const clean = rut.replace(/[\s.]/g, "").toUpperCase();
      if (!/^\d{7,8}-?[0-9K]$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "RUT format not recognized. Expected 7-8 digits followed by a dash and a digit or K" }) }] };
      }
      const parts = clean.split("-");
      const dv = parts[1] || clean.slice(-1);
      const number = parts.length > 1 ? parts[0] : clean.slice(0, -1);
      let sum = 0;
      let multiplier = 2;
      for (let i = number.length - 1; i >= 0; i--) {
        sum += parseInt(number[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
      }
      const remainder = 11 - (sum % 11);
      let expected;
      if (remainder === 11) expected = "0";
      else if (remainder === 10) expected = "K";
      else expected = remainder.toString();
      const valid = dv === expected;
      return { content: [{ type: "text", text: JSON.stringify({ valid, rut: number + "-" + dv }) }] };
    }
  );

  // ── FERRAMENTA 7: Feriados Mexicanos ──
  server.registerTool(
    "get_mexico_holidays",
    {
      description: "Returns Mexican national public holidays for any given year. Use this tool when calculating delivery dates, scheduling appointments, or any task requiring knowledge of non-working days in Mexico. Returns all national holidays with dates in YYYY-MM-DD format and names in both Spanish and English. Note: some Mexican holidays fall on the nearest Monday (puente) — the dates returned are the fixed calendar dates as established by law.",
      inputSchema: { year: z.number().describe("The year to get holidays for. Example: 2026") },
      annotations: { title: "Get Mexico Holidays", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ year }) => {
      const holidays = [
        { date: `${year}-01-01`, name: "Año Nuevo", name_en: "New Year's Day" },
        { date: `${year}-02-05`, name: "Día de la Constitución", name_en: "Constitution Day" },
        { date: `${year}-03-21`, name: "Natalicio de Benito Juárez", name_en: "Benito Juárez Birthday" },
        { date: `${year}-05-01`, name: "Día del Trabajo", name_en: "Labour Day" },
        { date: `${year}-09-16`, name: "Día de la Independencia", name_en: "Independence Day" },
        { date: `${year}-11-18`, name: "Revolución Mexicana", name_en: "Mexican Revolution Day" },
        { date: `${year}-12-25`, name: "Navidad", name_en: "Christmas Day" },
      ];
      return { content: [{ type: "text", text: JSON.stringify({ year, country: "Mexico", total_holidays: holidays.length, holidays }) }] };
    }
  );

  // ── FERRAMENTA 8: Feriados Chilenos ──
  server.registerTool(
    "get_chile_holidays",
    {
      description: "Returns Chilean national public holidays for any given year. Use this tool when calculating delivery dates, scheduling appointments, computing working days, or any task requiring knowledge of non-working days in Chile. Returns all national holidays with dates in YYYY-MM-DD format and names in both Spanish and English.",
      inputSchema: { year: z.number().describe("The year to get holidays for. Example: 2026") },
      annotations: { title: "Get Chile Holidays", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ year }) => {
      const holidays = [
        { date: `${year}-01-01`, name: "Año Nuevo", name_en: "New Year's Day" },
        { date: `${year}-05-01`, name: "Día del Trabajo", name_en: "Labour Day" },
        { date: `${year}-05-21`, name: "Día de las Glorias Navales", name_en: "Navy Day" },
        { date: `${year}-06-20`, name: "Día Nacional de los Pueblos Indígenas", name_en: "Indigenous Peoples Day" },
        { date: `${year}-06-29`, name: "San Pedro y San Pablo", name_en: "Saints Peter and Paul" },
        { date: `${year}-07-16`, name: "Virgen del Carmen", name_en: "Our Lady of Mount Carmel" },
        { date: `${year}-08-15`, name: "Asunción de la Virgen", name_en: "Assumption of Mary" },
        { date: `${year}-09-18`, name: "Independencia de Chile", name_en: "Independence Day" },
        { date: `${year}-09-19`, name: "Día de las Glorias del Ejército", name_en: "Army Day" },
        { date: `${year}-10-12`, name: "Encuentro de Dos Mundos", name_en: "Columbus Day" },
        { date: `${year}-10-31`, name: "Día de las Iglesias Evangélicas", name_en: "Evangelical Churches Day" },
        { date: `${year}-11-01`, name: "Día de Todos los Santos", name_en: "All Saints Day" },
        { date: `${year}-12-08`, name: "Inmaculada Concepción", name_en: "Immaculate Conception" },
        { date: `${year}-12-25`, name: "Navidad", name_en: "Christmas Day" },
      ];
      return { content: [{ type: "text", text: JSON.stringify({ year, country: "Chile", total_holidays: holidays.length, holidays }) }] };
    }
  );

  // ── FERRAMENTA 9: Validar CUIT Argentino ──
  server.registerTool(
    "validate_cuit",
    {
      description: "Validates an Argentine CUIT (Código Único de Identificación Tributaria) using the official AFIP checksum algorithm. CUIT is used by companies, self-employed workers, and other entities for tax purposes. Use this tool when processing Argentine invoices, supplier registrations, B2B transactions, or any document requiring a valid Argentine tax identifier. Accepts CUIT with or without formatting (dashes). Returns whether the CUIT is valid, the entity type detected, and the cleaned CUIT.",
      inputSchema: { cuit: z.string().describe("The Argentine CUIT to validate. Formatting (dashes) is automatically removed. Example: '30-12345678-9' or '30123456789'") },
      annotations: { title: "Validate Argentine CUIT", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ cuit }) => {
      const clean = cuit.replace(/[\s\-]/g, "");
      if (!/^\d{11}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "CUIT must have exactly 11 digits" }) }] };
      }

      // Detect type from prefix
      const prefix = parseInt(clean.substring(0, 2));
      const typeMap = {
        20: "individual_male",
        23: "individual_male",
        24: "individual_male",
        27: "individual_female",
        30: "company",
        33: "company",
        34: "company"
      };
      const entityType = typeMap[prefix] || "other";

      // Official AFIP checksum algorithm
      const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(clean[i]) * weights[i];
      }
      const remainder = sum % 11;
      let checkDigit;
      if (remainder === 0) checkDigit = 0;
      else if (remainder === 1) checkDigit = 9;
      else checkDigit = 11 - remainder;

      const valid = checkDigit === parseInt(clean[10]);
      const formatted = `${clean.substring(0, 2)}-${clean.substring(2, 10)}-${clean[10]}`;
      return { content: [{ type: "text", text: JSON.stringify({ valid, type: entityType, cuit: clean, formatted }) }] };
    }
  );

  // ── FERRAMENTA 10: Validar CUIL Argentino ──
  server.registerTool(
    "validate_cuil",
    {
      description: "Validates an Argentine CUIL (Código Único de Identificación Laboral) using the official ANSES checksum algorithm. CUIL is the labor identification number assigned to all workers and employees in Argentina. Use this tool when processing Argentine payroll, employment contracts, social security forms, HR onboarding, or any document requiring a valid Argentine labor identifier. The validation algorithm is identical to CUIT. Returns whether the CUIL is valid and the cleaned CUIL.",
      inputSchema: { cuil: z.string().describe("The Argentine CUIL to validate. Formatting (dashes) is automatically removed. Example: '20-12345678-9' or '20123456789'") },
      annotations: { title: "Validate Argentine CUIL", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ cuil }) => {
      const clean = cuil.replace(/[\s\-]/g, "");
      if (!/^\d{11}$/.test(clean)) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, reason: "CUIL must have exactly 11 digits" }) }] };
      }

      const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(clean[i]) * weights[i];
      }
      const remainder = sum % 11;
      let checkDigit;
      if (remainder === 0) checkDigit = 0;
      else if (remainder === 1) checkDigit = 9;
      else checkDigit = 11 - remainder;

      const valid = checkDigit === parseInt(clean[10]);
      const formatted = `${clean.substring(0, 2)}-${clean.substring(2, 10)}-${clean[10]}`;
      return { content: [{ type: "text", text: JSON.stringify({ valid, cuil: clean, formatted }) }] };
    }
  );

  // ── FERRAMENTA 11: Feriados Argentinos ──
  server.registerTool(
    "get_argentina_holidays",
    {
      description: "Returns Argentine national public holidays for any given year. Use this tool when calculating delivery dates, scheduling appointments, computing working days, or any task requiring knowledge of non-working days in Argentina. Returns all national holidays with dates in YYYY-MM-DD format and names in both Spanish and English. Note: Argentina also has bridge holidays (feriados puente) declared annually by the government which are not included here.",
      inputSchema: { year: z.number().describe("The year to get holidays for. Example: 2026") },
      annotations: { title: "Get Argentina Holidays", readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ year }) => {
      const holidays = [
        { date: `${year}-01-01`, name: "Año Nuevo", name_en: "New Year's Day" },
        { date: `${year}-03-24`, name: "Día Nacional de la Memoria por la Verdad y la Justicia", name_en: "National Day of Remembrance for Truth and Justice" },
        { date: `${year}-04-02`, name: "Día del Veterano y de los Caídos en la Guerra de Malvinas", name_en: "Malvinas War Veterans Day" },
        { date: `${year}-05-01`, name: "Día del Trabajador", name_en: "Labour Day" },
        { date: `${year}-05-25`, name: "Día de la Revolución de Mayo", name_en: "May Revolution Day" },
        { date: `${year}-06-20`, name: "Paso a la Inmortalidad del General Manuel Belgrano", name_en: "General Belgrano Memorial Day" },
        { date: `${year}-07-09`, name: "Día de la Independencia", name_en: "Independence Day" },
        { date: `${year}-08-17`, name: "Paso a la Inmortalidad del General José de San Martín", name_en: "General San Martín Memorial Day" },
        { date: `${year}-10-12`, name: "Día del Respeto a la Diversidad Cultural", name_en: "Cultural Diversity Day" },
        { date: `${year}-11-20`, name: "Día de la Soberanía Nacional", name_en: "National Sovereignty Day" },
        { date: `${year}-12-08`, name: "Inmaculada Concepción de María", name_en: "Immaculate Conception" },
        { date: `${year}-12-25`, name: "Navidad", name_en: "Christmas Day" },
      ];
      return { content: [{ type: "text", text: JSON.stringify({ year, country: "Argentina", total_holidays: holidays.length, holidays }) }] };
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
      version: "1.2.0",
      description: "Latin American data validation and utility tools for AI agents",
      tools: ["validate_cpf", "validate_cnpj", "validate_pix_key", "get_brazil_holidays", "validate_rfc_mx", "validate_rut_cl", "get_mexico_holidays", "get_chile_holidays", "validate_cuit", "validate_cuil", "get_argentina_holidays"],
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
