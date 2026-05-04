import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface Line {
  description: string;
  quantity: number;
  price: number;
  vatRate: number;
}

interface Args {
  company: { name: string; cvr: string | null };
  customer: { name: string; cvr: string | null; email: string | null; address: string | null };
  invoice: {
    number: number;
    date: string;
    due_date: string;
    lines: Line[];
    subtotal: number;
    totalVat: number;
    total: number;
  };
}

const fmt = (n: number) =>
  n.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function generateInvoicePdf(args: Args): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0.06, 0.06, 0.07);
  const muted = rgb(0.45, 0.45, 0.5);
  let y = 800;

  // Header
  page.drawText(args.company.name, { x: 50, y, size: 16, font: bold, color: black });
  if (args.company.cvr) {
    page.drawText(`CVR ${args.company.cvr}`, { x: 50, y: y - 16, size: 9, font, color: muted });
  }
  page.drawText(`Faktura #${args.invoice.number}`, { x: 400, y, size: 14, font: bold, color: black });
  page.drawText(`Dato: ${args.invoice.date}`, { x: 400, y: y - 18, size: 9, font, color: muted });
  page.drawText(`Forfald: ${args.invoice.due_date}`, { x: 400, y: y - 30, size: 9, font, color: muted });

  // Customer
  y = 720;
  page.drawText("Til:", { x: 50, y, size: 9, font, color: muted });
  page.drawText(args.customer.name, { x: 50, y: y - 14, size: 11, font: bold, color: black });
  let cy = y - 28;
  if (args.customer.cvr) { page.drawText(`CVR ${args.customer.cvr}`, { x: 50, y: cy, size: 9, font, color: black }); cy -= 12; }
  if (args.customer.address) { page.drawText(args.customer.address, { x: 50, y: cy, size: 9, font, color: black }); cy -= 12; }
  if (args.customer.email) { page.drawText(args.customer.email, { x: 50, y: cy, size: 9, font, color: black }); }

  // Lines header
  y = 640;
  page.drawLine({ start: { x: 50, y: y + 8 }, end: { x: 545, y: y + 8 }, thickness: 0.5, color: muted });
  page.drawText("Beskrivelse", { x: 50, y, size: 9, font: bold, color: black });
  page.drawText("Antal", { x: 320, y, size: 9, font: bold, color: black });
  page.drawText("Pris", { x: 380, y, size: 9, font: bold, color: black });
  page.drawText("Moms", { x: 440, y, size: 9, font: bold, color: black });
  page.drawText("Total", { x: 500, y, size: 9, font: bold, color: black });
  page.drawLine({ start: { x: 50, y: y - 4 }, end: { x: 545, y: y - 4 }, thickness: 0.5, color: muted });

  y -= 18;
  for (const l of args.invoice.lines) {
    const lineTotal = l.quantity * l.price * (1 + l.vatRate / 100);
    page.drawText(l.description.slice(0, 50), { x: 50, y, size: 9, font, color: black });
    page.drawText(String(l.quantity), { x: 320, y, size: 9, font, color: black });
    page.drawText(fmt(l.price), { x: 380, y, size: 9, font, color: black });
    page.drawText(`${l.vatRate}%`, { x: 440, y, size: 9, font, color: black });
    page.drawText(fmt(lineTotal), { x: 500, y, size: 9, font, color: black });
    y -= 16;
  }

  // Totals
  y -= 10;
  page.drawLine({ start: { x: 350, y: y + 6 }, end: { x: 545, y: y + 6 }, thickness: 0.5, color: muted });
  page.drawText("Subtotal", { x: 350, y, size: 9, font, color: muted });
  page.drawText(`${fmt(args.invoice.subtotal)} kr.`, { x: 500, y, size: 9, font, color: black });
  y -= 14;
  page.drawText("Moms", { x: 350, y, size: 9, font, color: muted });
  page.drawText(`${fmt(args.invoice.totalVat)} kr.`, { x: 500, y, size: 9, font, color: black });
  y -= 16;
  page.drawText("Total", { x: 350, y, size: 11, font: bold, color: black });
  page.drawText(`${fmt(args.invoice.total)} kr.`, { x: 500, y, size: 11, font: bold, color: black });

  // Footer
  page.drawText("Tak for handlen.", { x: 50, y: 60, size: 9, font, color: muted });

  return await pdf.save();
}
