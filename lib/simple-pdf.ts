export interface PdfSection {
  heading: string;
  rows: Array<[string, string]>;
}

export interface PdfDocument {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  fileName: string;
}

function cleanText(value: string) {
  return value
    .replace(/₹/g, 'Rs.')
    .replace(/[–—]/g, '-')
    .replace(/[×]/g, 'x')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
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
  const lines = [
    document.title,
    document.subtitle || '',
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    '',
    ...document.sections.flatMap((section) => [
      section.heading,
      ...section.rows.map(([label, value]) => `${label}: ${value}`),
      '',
    ]),
  ].filter((line, index, allLines) => line || allLines[index - 1]);

  const pages = splitIntoPages(lines);
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  let nextId = 3;

  for (const pageLines of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageObjectIds.push(pageId);

    const streamLines = pageLines.map((line, index) => {
      const fontSize = index === 0 ? 18 : line.endsWith(':') ? 13 : 11;
      const y = 790 - index * 17;
      return `BT /F1 ${fontSize} Tf 48 ${y} Td (${cleanText(line)}) Tj ET`;
    });

    const stream = streamLines.join('\n');
    objects.push(objectBlock(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 1 0 R >> >> /Contents ${contentId} 0 R >>`));
    objects.push(objectBlock(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
  }

  const pageRefs = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  const baseObjects = [
    objectBlock(1, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
    objectBlock(2, `<< /Type /Pages /Kids [${pageRefs}] /Count ${pageObjectIds.length} >>`),
    ...objects,
    objectBlock(nextId, '<< /Type /Catalog /Pages 2 0 R >>'),
  ];

  const header = '%PDF-1.4\n';
  let body = '';
  const offsets = [0];

  for (const object of baseObjects) {
    offsets.push(header.length + body.length);
    body += object;
  }

  const xrefOffset = header.length + body.length;
  const xref = [
    `xref\n0 ${baseObjects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${offset.toString().padStart(10, '0')} 00000 n `),
    `trailer\n<< /Size ${baseObjects.length + 1} /Root ${nextId} 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF',
  ].join('\n');

  const pdf = `${header}${body}${xref}`;
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
