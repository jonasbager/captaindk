// Delte CSV-hjælpere — bruges af bank-import (Import.tsx) og senere af
// migreringsguiden (Flyt dit regnskab). Ren parsing, ingen I/O.

export type ParsedCsv = { headers: string[]; rows: string[][] };

export function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, "").trim());
}

export function detectDelimiter(lines: string[]): string {
  const candidates = [";", ",", "\t"];
  const sample = lines.slice(0, 5);

  return candidates
    .map((delimiter) => ({
      delimiter,
      score: sample.reduce((sum, line) => sum + splitCsvLine(line, delimiter).length, 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.delimiter || ",";
}

// Dansk talformat: "1.234,56" → 1234.56. Tåler valutategn/-tekst ("kr.", "DKK") og mellemrum.
export function parseLocalizedAmount(value: string): number {
  // Behold kun cifre, punktum, komma og minus
  let s = value.replace(/[^0-9.,-]/g, "");
  if (s.includes(",")) {
    // Dansk: punktum = tusindtalsseparator, komma = decimaltegn
    s = s.replace(/\./g, "").replace(",", ".");
  }
  // Ellers engelsk format: punktum er allerede decimaltegn
  const amount = Number(s);
  return Number.isFinite(amount) ? amount : 0;
}

// ISO, dd-mm-yyyy / dd.mm.yyyy / dd/mm/yyyy, ellers Date-fallback. Null hvis uparsebar.
export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = trimmed.match(/^(\d{2})[/.\-](\d{2})[/.\-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

// Parse en hel CSV-tekst til headers + rækker (BOM fjernet, tomme linjer væk).
export function parseCsv(text: string): ParsedCsv | null {
  const raw = text.replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const delimiter = detectDelimiter(lines);
  const parsed = lines.map((line) => splitCsvLine(line, delimiter));
  const headers = parsed[0].map((header, index) => header || `Kolonne ${index + 1}`);
  const rows = parsed
    .slice(1)
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => headers.map((_, index) => row[index] ?? ""));

  return { headers, rows };
}
