import { describe, it, expect } from "vitest";
import {
  computeMoms,
  computeResultat,
  computeBalance,
  computeOplysningsskema,
  computeSelskabsskat,
  computeAarsrapportB,
  complianceCalendar,
  type EngineEntry,
  type VatCode,
} from "./engine";

const Y = "2025";
const FROM = `${Y}-01-01`;
const TO = `${Y}-12-31`;

function entry(overrides: Partial<EngineEntry>): EngineEntry {
  return {
    date: `${Y}-03-15`,
    net_amount: 0,
    vat_amount: 0,
    vat_code: "NONE" as VatCode,
    account_kind: "expense",
    tax_line: null,
    energy_levy: null,
    ...overrides,
  };
}

const sale = (net: number, date = `${Y}-03-01`): EngineEntry =>
  entry({ date, net_amount: net, vat_amount: net * 0.25, vat_code: "U25", account_kind: "revenue", tax_line: "nettoomsaetning" });

const purchase = (net: number, date = `${Y}-03-10`): EngineEntry =>
  entry({ date, net_amount: net, vat_amount: net * 0.25, vat_code: "I25", account_kind: "expense", tax_line: "andre_driftsomkostninger" });

describe("computeMoms", () => {
  it("beregner salgsmoms af dansk salg (U25)", () => {
    const moms = computeMoms([sale(10000)], FROM, TO);
    expect(moms.salgsmoms).toBe(2500);
  });

  it("beregner købsmoms af dansk køb (I25)", () => {
    const moms = computeMoms([purchase(4000)], FROM, TO);
    expect(moms.koebsmoms).toBe(1000);
  });

  it("repræsentation: kun 25% af momsen fradrages", () => {
    const rep = entry({ net_amount: 1000, vat_amount: 250, vat_code: "REP", tax_line: "repraesentation" });
    const moms = computeMoms([rep], FROM, TO);
    expect(moms.koebsmoms).toBe(62.5);
  });

  it("EU-ydelseskøb (IEUY): beregnet 25% moms, nul-sum ved fuld fradragsret, rubrik A-ydelser", () => {
    const ieuY = entry({ net_amount: 1000, vat_code: "IEUY", tax_line: "andre_driftsomkostninger" });
    const moms = computeMoms([ieuY], FROM, TO);
    expect(moms.moms_ydelseskoeb_udland).toBe(250);
    expect(moms.koebsmoms).toBe(250);
    expect(moms.rubrik_a_ydelser).toBe(1000);
    expect(moms.momstilsvar).toBe(0);
  });

  it("EU-varekøb (IEUV) og import (IVKU) samles i moms af varekøb i udlandet", () => {
    const euVare = entry({ net_amount: 2000, vat_code: "IEUV", tax_line: "vareforbrug" });
    const importVare = entry({ net_amount: 1000, vat_code: "IVKU", tax_line: "vareforbrug" });
    const moms = computeMoms([euVare, importVare], FROM, TO);
    expect(moms.moms_varekoeb_udland).toBe(750);
    expect(moms.rubrik_a_varer).toBe(2000);
  });

  it("EU-varesalg (UEUV) udfylder rubrik B-varer og advarer om separat EU-salgsindberetning", () => {
    const euSalg = entry({ net_amount: 5000, vat_code: "UEUV", account_kind: "revenue", tax_line: "nettoomsaetning" });
    const moms = computeMoms([euSalg], FROM, TO);
    expect(moms.rubrik_b_varer).toBe(5000);
    expect(moms.warnings.some((w) => w.includes("EU-salg uden moms"))).toBe(true);
  });

  it("eksport uden for EU (UEKS) → rubrik C", () => {
    const eksport = entry({ net_amount: 8000, vat_code: "UEKS", account_kind: "revenue", tax_line: "nettoomsaetning" });
    expect(computeMoms([eksport], FROM, TO).rubrik_c).toBe(8000);
  });

  it("momstilsvar = salgsmoms + udenlandsk moms − købsmoms", () => {
    const moms = computeMoms([sale(10000), purchase(4000)], FROM, TO);
    expect(moms.momstilsvar).toBe(2500 - 1000);
  });

  it("filtrerer på periode", () => {
    const moms = computeMoms([sale(10000, `${Y}-02-01`), sale(99999, "2024-12-31")], `${Y}-01-01`, `${Y}-06-30`);
    expect(moms.salgsmoms).toBe(2500);
  });

  it("elafgift: sættes til 0 med advarsel (godtgørelse er pr. enhed)", () => {
    const el = entry({ net_amount: 1200, vat_amount: 300, vat_code: "I25", tax_line: "andre_driftsomkostninger", energy_levy: "elafgift" });
    const moms = computeMoms([el], FROM, TO);
    expect(moms.elafgift).toBe(0);
    expect(moms.warnings.some((w) => w.includes("Elafgift"))).toBe(true);
  });
});

describe("computeResultat", () => {
  it("opgør resultat før og efter renter", () => {
    const entries = [
      sale(100000),
      entry({ net_amount: 20000, account_kind: "expense", tax_line: "vareforbrug" }),
      entry({ net_amount: 10000, account_kind: "expense", tax_line: "fremmed_arbejde" }),
      purchase(15000),
      entry({ net_amount: 5000, account_kind: "expense", tax_line: "afskrivninger" }),
      entry({ net_amount: 500, account_kind: "revenue", tax_line: "renteindtaegter" }),
      entry({ net_amount: 1500, account_kind: "expense", tax_line: "renteudgifter" }),
    ];
    const res = computeResultat(entries, FROM, TO);
    expect(res.nettoomsaetning).toBe(100000);
    expect(res.vareforbrug).toBe(20000);
    expect(res.fremmed_arbejde).toBe(10000);
    expect(res.andre_driftsomkostninger).toBe(15000);
    expect(res.afskrivninger).toBe(5000);
    expect(res.resultat_foer_renter).toBe(50000);
    expect(res.resultat).toBe(50000 + 500 - 1500);
  });

  it("revisor, repræsentation og bøder indgår regnskabsmæssigt fuldt i andre driftsomkostninger", () => {
    const entries = [
      entry({ net_amount: 1000, account_kind: "expense", tax_line: "revisor_advokat" }),
      entry({ net_amount: 2000, account_kind: "expense", tax_line: "repraesentation" }),
      entry({ net_amount: 500, account_kind: "expense", tax_line: "boeder" }),
    ];
    expect(computeResultat(entries, FROM, TO).andre_driftsomkostninger).toBe(3500);
  });
});

describe("computeBalance", () => {
  it("opgør balance pr. dato (alt til og med datoen)", () => {
    const entries = [
      entry({ date: "2024-06-01", net_amount: 10000, account_kind: "asset", tax_line: "omsaetningsaktiver" }),
      entry({ date: `${Y}-05-01`, net_amount: 20000, account_kind: "asset", tax_line: "anlaegsaktiver" }),
      entry({ date: `${Y}-06-01`, net_amount: 15000, account_kind: "equity", tax_line: "egenkapital" }),
      entry({ date: `${Y}-06-01`, net_amount: 4000, account_kind: "liability", tax_line: "skyldig_moms" }),
      // After cutoff — must be excluded
      entry({ date: "2026-01-15", net_amount: 99999, account_kind: "asset", tax_line: "omsaetningsaktiver" }),
    ];
    const bal = computeBalance(entries, TO);
    expect(bal.omsaetningsaktiver).toBe(10000);
    expect(bal.anlaegsaktiver).toBe(20000);
    expect(bal.balancesum).toBe(30000);
    expect(bal.egenkapital).toBe(15000);
    expect(bal.skyldig_moms).toBe(4000);
  });
});

describe("computeOplysningsskema (enkeltmandsvirksomhed)", () => {
  it("omsætning under 300.000: fritaget for regnskabsoplysninger", () => {
    const skema = computeOplysningsskema([sale(250000)], FROM, TO);
    expect(skema.fritaget_regnskabsoplysninger).toBe(true);
    expect(skema.regnskabsoplysninger.find((r) => r.rubrik === "301/302")?.amount).toBe("Ja");
    expect(skema.regnskabsoplysninger.find((r) => r.rubrik === "320")).toBeUndefined();
  });

  it("omsætning over 300.000: rubrik 320-638 udfyldes", () => {
    const entries = [
      sale(400000),
      entry({ net_amount: 50000, account_kind: "expense", tax_line: "vareforbrug" }),
      entry({ net_amount: 30000, account_kind: "expense", tax_line: "fremmed_arbejde" }),
      purchase(20000),
      entry({ net_amount: 10000, account_kind: "expense", tax_line: "afskrivninger" }),
    ];
    const skema = computeOplysningsskema(entries, FROM, TO);
    expect(skema.fritaget_regnskabsoplysninger).toBe(false);
    const get = (rubrik: string) => skema.regnskabsoplysninger.find((r) => r.rubrik === rubrik)?.amount;
    expect(get("320")).toBe(400000);
    expect(get("321")).toBe(50000);
    expect(get("322")).toBe(30000);
    // 323 = andre driftsomkostninger + afskrivninger
    expect(get("323")).toBe(30000);
  });

  it("overskud → rubrik 111, underskud → rubrik 112 (positivt beløb)", () => {
    const overskud = computeOplysningsskema([sale(100000)], FROM, TO);
    expect(overskud.virksomhedsoplysninger[0].rubrik).toBe("111");
    expect(overskud.virksomhedsoplysninger[0].amount).toBe(100000);

    const underskud = computeOplysningsskema(
      [entry({ net_amount: 50000, account_kind: "expense", tax_line: "vareforbrug" })],
      FROM, TO
    );
    expect(underskud.virksomhedsoplysninger[0].rubrik).toBe("112");
    expect(underskud.virksomhedsoplysninger[0].amount).toBe(50000);
  });

  it("renter medtages som rubrik 114/116 når de findes", () => {
    const entries = [
      sale(100000),
      entry({ net_amount: 800, account_kind: "revenue", tax_line: "renteindtaegter" }),
      entry({ net_amount: 1200, account_kind: "expense", tax_line: "renteudgifter" }),
    ];
    const skema = computeOplysningsskema(entries, FROM, TO);
    expect(skema.virksomhedsoplysninger.find((r) => r.rubrik === "114")?.amount).toBe(800);
    expect(skema.virksomhedsoplysninger.find((r) => r.rubrik === "116")?.amount).toBe(1200);
  });

  it("advarer altid om VSO/kapitalafkastordning", () => {
    const skema = computeOplysningsskema([sale(1000)], FROM, TO);
    expect(skema.warnings.some((w) => w.includes("VSO"))).toBe(true);
  });
});

describe("computeSelskabsskat (ApS)", () => {
  it("tillægger 75% af repræsentation og 100% af bøder", () => {
    const entries = [
      sale(100000),
      entry({ net_amount: 4000, account_kind: "expense", tax_line: "repraesentation" }),
      entry({ net_amount: 1000, account_kind: "expense", tax_line: "boeder" }),
    ];
    const skat = computeSelskabsskat(entries, FROM, TO);
    expect(skat.resultat_foer_skat).toBe(95000);
    expect(skat.korrektioner).toEqual([
      { label: "Repræsentation, ikke-fradragsberettiget 75%", amount: 3000 },
      { label: "Bøder mv., ikke fradragsberettiget", amount: 1000 },
    ]);
    expect(skat.skattepligtig_indkomst_foer_underskud).toBe(99000);
    expect(skat.selskabsskat).toBe(99000 * 0.22);
  });

  it("anvender fremført underskud, begrænset af årets indkomst", () => {
    const skat = computeSelskabsskat([sale(100000)], FROM, TO, { fremfoertUnderskud: 150000 });
    expect(skat.anvendt_underskud).toBe(100000);
    expect(skat.skattepligtig_indkomst).toBe(0);
    expect(skat.selskabsskat).toBe(0);
  });

  it("restskat = selskabsskat − betalt acontoskat", () => {
    const skat = computeSelskabsskat([sale(100000)], FROM, TO, { acontoskatBetalt: 10000 });
    expect(skat.restskat).toBe(22000 - 10000);
  });

  it("underskudsår: skat 0 og underskud fremføres", () => {
    const skat = computeSelskabsskat(
      [entry({ net_amount: 50000, account_kind: "expense", tax_line: "vareforbrug" })],
      FROM, TO
    );
    expect(skat.skattepligtig_indkomst).toBe(-50000);
    expect(skat.selskabsskat).toBe(0);
    expect(skat.warnings.some((w) => w.includes("fremføres"))).toBe(true);
  });
});

describe("computeAarsrapportB", () => {
  it("resultatopgørelse starter ved bruttofortjeneste og balancen tjekkes", () => {
    const entries = [
      sale(100000),
      entry({ net_amount: 20000, account_kind: "expense", tax_line: "vareforbrug" }),
      entry({ net_amount: 80000, account_kind: "asset", tax_line: "omsaetningsaktiver" }),
      entry({ net_amount: 76000, account_kind: "equity", tax_line: "egenkapital" }),
      entry({ net_amount: 4000, account_kind: "liability", tax_line: "skyldig_moms" }),
    ];
    const rapport = computeAarsrapportB(entries, FROM, TO, 17600);
    expect(rapport.resultatopgoerelse[0]).toEqual({ label: "Bruttofortjeneste", amount: 80000 });
    expect(rapport.resultatopgoerelse.at(-1)).toEqual({ label: "Årets resultat", amount: 80000 - 17600 });
    expect(rapport.checks[0].ok).toBe(true);
  });

  it("flagger når balancen ikke stemmer", () => {
    const entries = [
      entry({ net_amount: 80000, account_kind: "asset", tax_line: "omsaetningsaktiver" }),
      entry({ net_amount: 10000, account_kind: "equity", tax_line: "egenkapital" }),
    ];
    const rapport = computeAarsrapportB(entries, FROM, TO, 0);
    expect(rapport.checks[0].ok).toBe(false);
  });
});

describe("complianceCalendar", () => {
  it("enkeltmandsvirksomhed, halvårlig moms", () => {
    const frister = complianceCalendar("enkeltmandsvirksomhed", "halvaarlig");
    expect(frister.some((f) => f.label.includes("H1"))).toBe(true);
    expect(frister.some((f) => f.label.includes("Oplysningsskema"))).toBe(true);
    expect(frister.some((f) => f.label.includes("Acontoskat"))).toBe(false);
  });

  it("ApS, kvartalsvis moms", () => {
    const frister = complianceCalendar("aps", "kvartalsvis");
    expect(frister.filter((f) => f.label.startsWith("Moms")).length).toBe(4);
    expect(frister.some((f) => f.label.includes("Acontoskat"))).toBe(true);
    expect(frister.some((f) => f.label.includes("Årsrapport"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN TEST — den gyldne test fra implementeringsguiden.
// Indsæt dine faktiske 2025-tal fra Dinero/årsopgørelsen og fjern .skip:
// computeOplysningsskema på dine 2025-posteringer skal ramme præcis de tal,
// du indberettede i april 2026.
// ---------------------------------------------------------------------------
describe.skip("GOLDEN: egne 2025-tal fra Dinero", () => {
  it("rammer de indberettede rubrikker", () => {
    const entries: EngineEntry[] = [
      // TODO: eksportér 2025-posteringerne og indsæt dem her
    ];
    const skema = computeOplysningsskema(entries, "2025-01-01", "2025-12-31");
    const r111 = skema.virksomhedsoplysninger.find((r) => r.rubrik === "111");
    expect(r111?.amount).toBe(0 /* TODO: dit indberettede overskud */);
  });
});
