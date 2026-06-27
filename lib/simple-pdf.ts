export interface PdfSection {
  heading: string;
  rows?: Array<[string, string]>;
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface PdfDocument {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  fileName: string;
}

export interface PremiumReportData {
  label: string;
  sales: any[];
  transactions: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
  shopName: string;
  totalStockValue: number;
  productsCount: number;
  lowStockItems: Array<{
    name: string;
    quantity: number;
    lowStockLimit: number;
  }>;
  totalPendingUdhari: number;
  highestUdharCustomer: { name: string; balance: number } | null;
  paymentBreakdown: Record<string, { count: number; amount: number }>;
  totalItemsSold: number;
  averageBill: number;
  dailyData?: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    meta?: string;
    severity: string;
    category: string;
  }>;
}

function cleanText(value: string) {
  return value
    .replace(/₹/g, "Rs.")
    .replace(/[–—]/g, "-")
    .replace(/[×]/g, "x")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function objectBlock(id: number, content: string) {
  return `${id} 0 obj\n${content}\nendobj\n`;
}

function splitIntoPages(lines: string[]) {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 42) {
    pages.push(lines.slice(index, index + 42));
  }
  return pages.length ? pages : [[]];
}

export function downloadSimplePdf(document: PdfDocument) {
  const sectionLines = document.sections.flatMap((section) => {
    const lines: string[] = [`${section.heading}:`];

    if (section.table) {
      const headerLine = section.table.headers.join(" | ");
      const separatorLine = section.table.headers
        .map((h) => "-".repeat(Math.max(3, h.length)))
        .join("-+-");

      lines.push(`  ${headerLine}`);
      lines.push(`  ${separatorLine}`);
      lines.push(...section.table.rows.map((row) => `  ${row.join(" | ")}`));
    } else {
      lines.push(
        ...(section.rows || []).map(([label, value]) =>
          label ? `  ${label}: ${value}` : `  ${value}`,
        ),
      );
    }

    lines.push("");
    return lines;
  });

  const lines = [
    document.title,
    document.subtitle || "",
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    "",
    ...sectionLines,
  ].filter((line, index, allLines) => line || allLines[index - 1]);

  const pages = splitIntoPages(lines);
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const pagesObjectId = 3;
  let nextId = 4;

  for (const pageLines of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageObjectIds.push(pageId);

    const streamLines = pageLines.map((line, index) => {
      const fontSize =
        index === 0 ? 18 : index === 1 ? 12 : line.endsWith(":") ? 13 : 11;
      const font = line.includes("|") ? "F2" : "F1";
      const y = 790 - index * 17;
      return `BT /${font} ${fontSize} Tf 48 ${y} Td (${cleanText(line)}) Tj ET`;
    });

    const stream = streamLines.join("\n");
    objects.push(
      objectBlock(
        pageId,
        `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
    objects.push(
      objectBlock(
        contentId,
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      ),
    );
  }

  const pageRefs = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  const baseObjects = [
    objectBlock(1, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    objectBlock(2, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"),
    objectBlock(
      pagesObjectId,
      `<< /Type /Pages /Kids [${pageRefs}] /Count ${pageObjectIds.length} >>`,
    ),
    ...objects,
    objectBlock(nextId, `<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`),
  ];

  const header = "%PDF-1.4\n";
  let body = "";
  const offsets = [0];

  for (const object of baseObjects) {
    offsets.push(header.length + body.length);
    body += object;
  }

  const xrefOffset = header.length + body.length;
  const xref = [
    `xref\n0 ${baseObjects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets
      .slice(1)
      .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `),
    `trailer\n<< /Size ${baseObjects.length + 1} /Root ${nextId} 0 R >>`,
    `startxref\n${xrefOffset}`,
    "%%EOF",
  ].join("\n");

  const pdf = `${header}${body}${xref}`;
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
