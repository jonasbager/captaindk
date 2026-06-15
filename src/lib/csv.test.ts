import { describe, it, expect } from "vitest";
import { splitCsvLine, detectDelimiter, parseLocalizedAmount, parseDate, parseCsv } from "./csv";

describe("splitCsvLine", () => {
  it("splitter på delimiter", () => {
    expect(splitCsvLine("a;b;c", ";")).toEqual(["a", "b", "c"]);
  });
  it("respekterer citationstegn", () => {
    expect(splitCsvLine('"Netto, A/S";100', ";")).toEqual(["Netto, A/S", "100"]);
  });
  it("håndterer escaped citationstegn", () => {
    expect(splitCsvLine('"a ""b"" c";2', ";")).toEqual(['a "b" c', "2"]);
  });
});

describe("detectDelimiter", () => {
  it("vælger semikolon for dansk eksport", () => {
    expect(detectDelimiter(["dato;tekst;beløb", "2026-01-01;Kaffe;-45,00"])).toBe(";");
  });
  it("vælger komma når det dominerer", () => {
    expect(detectDelimiter(["date,text,amount", "2026-01-01,Coffee,-45.00"])).toBe(",");
  });
});

describe("parseLocalizedAmount", () => {
  it("dansk format med tusindtalsseparator", () => {
    expect(parseLocalizedAmount("1.234,56")).toBe(1234.56);
  });
  it("negativt beløb med valutcategn", () => {
    expect(parseLocalizedAmount("-45,00 kr.")).toBe(-45);
  });
  it("engelsk punktum-decimal", () => {
    expect(parseLocalizedAmount("1234.56")).toBe(1234.56);
  });
  it("ugyldigt → 0", () => {
    expect(parseLocalizedAmount("abc")).toBe(0);
  });
});

describe("parseDate", () => {
  it("ISO", () => expect(parseDate("2026-06-15")).toBe("2026-06-15"));
  it("dd-mm-yyyy", () => expect(parseDate("15-06-2026")).toBe("2026-06-15"));
  it("dd.mm.yyyy", () => expect(parseDate("15.06.2026")).toBe("2026-06-15"));
  it("dd/mm/yyyy", () => expect(parseDate("15/06/2026")).toBe("2026-06-15"));
  it("tom → null", () => expect(parseDate("")).toBeNull());
});

describe("parseCsv", () => {
  it("parser headers + rækker og fjerner BOM", () => {
    const res = parseCsv("﻿dato;tekst;beløb\n2026-01-01;Kaffe;-45,00\n2026-01-02;Salg;1.000,00");
    expect(res?.headers).toEqual(["dato", "tekst", "beløb"]);
    expect(res?.rows).toHaveLength(2);
    expect(res?.rows[1]).toEqual(["2026-01-02", "Salg", "1.000,00"]);
  });
  it("for lidt data → null", () => {
    expect(parseCsv("kun en linje")).toBeNull();
  });
});
