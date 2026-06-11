// Captain SKAT engine — pure functions, no I/O.
// Works in the frontend AND in edge functions (import into captain-chat as tools).
//
// Design principle: amounts are computed from journal entries with explicit VAT codes.
// Rubrik NUMBERS are kept in display maps at the bottom (they shift between years and
// TastSelv revisions; the semantic lines don't). Verify the number map once per year.

export type VatCode = 'U25'|'UEUV'|'UEUY'|'UEKS'|'I25'|'IEUV'|'IEUY'|'IVKU'|'REP'|'NONE'
export type CompanyType = 'enkeltmandsvirksomhed' | 'aps'

export interface EngineEntry {
  date: string                 // ISO date
  net_amount: number           // ex-VAT, signed: revenue positive, expense positive (kind disambiguates)
  vat_amount: number
  vat_code: VatCode
  account_kind: 'revenue'|'expense'|'asset'|'liability'|'equity'
  tax_line: string | null
  energy_levy: string | null
}

const r2 = (n: number) => Math.round(n * 100) / 100
const inPeriod = (e: EngineEntry, from: string, to: string) => e.date >= from && e.date <= to
const sum = (xs: number[]) => r2(xs.reduce((a, b) => a + b, 0))

// ---------------------------------------------------------------------------
// 1. MOMS — momsangivelsen (identical for enkeltmandsvirksomhed and ApS)
// ---------------------------------------------------------------------------

export interface MomsResult {
  salgsmoms: number                 // udgående moms af dansk salg
  moms_varekoeb_udland: number      // beregnet 25% af EU/tredjelands varekøb (omvendt betalingspligt)
  moms_ydelseskoeb_udland: number   // beregnet 25% af udenlandske ydelseskøb (omvendt betalingspligt)
  koebsmoms: number                 // indgående moms inkl. fradragsberettiget del af reverse charge
  elafgift: number
  vandafgift: number
  olie_flaskegasafgift: number
  naturgas_bygasafgift: number
  rubrik_a_varer: number            // EU-varekøb ekskl. moms
  rubrik_a_ydelser: number          // EU-ydelseskøb ekskl. moms
  rubrik_b_varer: number            // EU-varesalg (skal også indberettes til "EU-salg uden moms")
  rubrik_b_ydelser: number          // EU-ydelsessalg
  rubrik_c: number                  // eksport uden for EU mv.
  momstilsvar: number               // + = betal, - = tilgodehavende
  warnings: string[]
}

export function computeMoms(entries: EngineEntry[], from: string, to: string): MomsResult {
  const p = entries.filter((e) => inPeriod(e, from, to))
  const w: string[] = []

  const salgsmoms = sum(p.filter((e) => e.vat_code === 'U25').map((e) => e.vat_amount))

  // Reverse charge: Captain calculates 25% of the net — the bookkeeper never typed it
  const euVarer = sum(p.filter((e) => e.vat_code === 'IEUV').map((e) => e.net_amount))
  const tredjelandVarer = sum(p.filter((e) => e.vat_code === 'IVKU').map((e) => e.net_amount))
  const euYdelser = sum(p.filter((e) => e.vat_code === 'IEUY').map((e) => e.net_amount))

  const moms_varekoeb_udland = r2((euVarer + tredjelandVarer) * 0.25)
  const moms_ydelseskoeb_udland = r2(euYdelser * 0.25)

  // Domestic købsmoms + repræsentation (kun 25% af momsen er fradragsberettiget)
  const i25 = sum(p.filter((e) => e.vat_code === 'I25').map((e) => e.vat_amount))
  const repMoms = sum(p.filter((e) => e.vat_code === 'REP').map((e) => r2(e.vat_amount * 0.25)))
  // Reverse charge er fradragsberettiget som købsmoms ved fuld fradragsret → nul-sum
  const koebsmoms = r2(i25 + repMoms + moms_varekoeb_udland + moms_ydelseskoeb_udland)

  const levy = (key: string) =>
    sum(p.filter((e) => e.energy_levy === key).map((e) => e.net_amount))

  // NOTE: energy levies are reimbursed by RATE per kWh/m³, not by amount spent.
  // v1 conservative default: report 0 and warn, unless the user has booked the levy
  // amount explicitly on a levy account. Don't guess refunds — that's an audit magnet.
  const elBase = levy('elafgift')
  if (elBase > 0) w.push('Elafgift: godtgørelse beregnes pr. kWh, ikke af beløbet. Captain har sat 0 — book den faktiske afgift fra el-fakturaen hvis du vil have godtgørelse.')

  const result: MomsResult = {
    salgsmoms,
    moms_varekoeb_udland,
    moms_ydelseskoeb_udland,
    koebsmoms,
    elafgift: 0,
    vandafgift: 0,
    olie_flaskegasafgift: 0,
    naturgas_bygasafgift: 0,
    rubrik_a_varer: r2(euVarer),
    rubrik_a_ydelser: r2(euYdelser),
    rubrik_b_varer: sum(p.filter((e) => e.vat_code === 'UEUV').map((e) => e.net_amount)),
    rubrik_b_ydelser: sum(p.filter((e) => e.vat_code === 'UEUY').map((e) => e.net_amount)),
    rubrik_c: sum(p.filter((e) => e.vat_code === 'UEKS').map((e) => e.net_amount)),
    momstilsvar: 0,
    warnings: w,
  }
  result.momstilsvar = r2(
    result.salgsmoms + result.moms_varekoeb_udland + result.moms_ydelseskoeb_udland
    - result.koebsmoms - result.elafgift - result.vandafgift
    - result.olie_flaskegasafgift - result.naturgas_bygasafgift
  )
  if (result.rubrik_b_varer > 0) w.push('Rubrik B-varer udfyldt: husk også indberetning til "EU-salg uden moms" (tidl. listesystemet) — det er en SEPARAT indberetning.')
  return result
}

// ---------------------------------------------------------------------------
// 2. Resultat + balance (shared building block)
// ---------------------------------------------------------------------------

export interface ResultatOpgoerelse {
  nettoomsaetning: number
  andre_indtaegter: number
  vareforbrug: number
  fremmed_arbejde: number
  andre_driftsomkostninger: number   // incl. revisor, repræsentation (regnskabsmæssigt fuldt)
  afskrivninger: number
  resultat_foer_renter: number
  renteindtaegter: number
  renteudgifter: number
  resultat: number
}

export function computeResultat(entries: EngineEntry[], from: string, to: string): ResultatOpgoerelse {
  const p = entries.filter((e) => inPeriod(e, from, to))
  const line = (key: string, kind: 'revenue'|'expense') =>
    sum(p.filter((e) => e.account_kind === kind && e.tax_line === key).map((e) => e.net_amount))

  const nettoomsaetning = line('nettoomsaetning', 'revenue')
  const andre_indtaegter = line('andre_indtaegter', 'revenue')
  const vareforbrug = line('vareforbrug', 'expense')
  const fremmed_arbejde = line('fremmed_arbejde', 'expense')
  const andre = sum(p.filter((e) =>
    e.account_kind === 'expense' &&
    ['andre_driftsomkostninger', 'revisor_advokat', 'repraesentation', 'boeder'].includes(e.tax_line || '')
  ).map((e) => e.net_amount))
  const afskrivninger = line('afskrivninger', 'expense')
  const renteindtaegter = line('renteindtaegter', 'revenue')
  const renteudgifter = line('renteudgifter', 'expense')

  const resultat_foer_renter = r2(nettoomsaetning + andre_indtaegter - vareforbrug - fremmed_arbejde - andre - afskrivninger)
  return {
    nettoomsaetning, andre_indtaegter, vareforbrug, fremmed_arbejde,
    andre_driftsomkostninger: andre, afskrivninger, resultat_foer_renter,
    renteindtaegter, renteudgifter,
    resultat: r2(resultat_foer_renter + renteindtaegter - renteudgifter),
  }
}

export interface Balance {
  anlaegsaktiver: number
  omsaetningsaktiver: number
  balancesum: number
  egenkapital: number
  skyldig_moms: number      // + = skyldig, - = tilgodehavende (rubrik 638-logik)
  anden_gaeld: number
}

export function computeBalance(entries: EngineEntry[], perDate: string): Balance {
  const p = entries.filter((e) => e.date <= perDate)
  const line = (key: string) => sum(p.filter((e) => e.tax_line === key).map((e) => e.net_amount))
  const anlaeg = line('anlaegsaktiver')
  const oms = line('omsaetningsaktiver')
  return {
    anlaegsaktiver: anlaeg,
    omsaetningsaktiver: oms,
    balancesum: r2(anlaeg + oms),
    egenkapital: line('egenkapital'),
    skyldig_moms: line('skyldig_moms'),
    anden_gaeld: line('anden_gaeld'),
  }
}

// ---------------------------------------------------------------------------
// 3. ENKELTMANDSVIRKSOMHED — oplysningsskemaet (personligt, frist 1. juli)
// ---------------------------------------------------------------------------

export interface OplysningsskemaResult {
  virksomhedsoplysninger: { rubrik: string; label: string; amount: number }[]
  regnskabsoplysninger: { rubrik: string; label: string; amount: number | string }[]
  fritaget_regnskabsoplysninger: boolean   // omsætning < 300.000 kr.
  warnings: string[]
}

export function computeOplysningsskema(
  entries: EngineEntry[], yearStart: string, yearEnd: string,
  opts: { revisorBistand?: boolean } = {},
): OplysningsskemaResult {
  const res = computeResultat(entries, yearStart, yearEnd)
  const bal = computeBalance(entries, yearEnd)
  const w: string[] = []
  const fritaget = res.nettoomsaetning < 300000

  const virk = [
    res.resultat >= 0
      ? { rubrik: '111', label: 'Overskud af virksomhed (før renter)', amount: r2(res.resultat_foer_renter) }
      : { rubrik: '112', label: 'Underskud af virksomhed (før renter)', amount: r2(Math.abs(res.resultat_foer_renter)) },
    ...(res.renteindtaegter > 0 ? [{ rubrik: '114', label: 'Renteindtægter i virksomhed', amount: res.renteindtaegter }] : []),
    ...(res.renteudgifter > 0 ? [{ rubrik: '116', label: 'Renteudgifter i virksomhed', amount: res.renteudgifter }] : []),
  ]

  const regnskab = fritaget
    ? [
        { rubrik: '300', label: 'CVR-/SE-nr.', amount: 'fra virksomhedsprofil' as const },
        { rubrik: '301/302', label: 'Omsætning under 300.000 kr.', amount: 'Ja' as const },
        { rubrik: '303', label: 'Revisorbistand', amount: opts.revisorBistand ? 'Ja' : 'Nej' },
      ]
    : [
        { rubrik: '300', label: 'CVR-/SE-nr.', amount: 'fra virksomhedsprofil' as const },
        { rubrik: '301/302', label: 'Omsætning under 300.000 kr.', amount: 'Nej' as const },
        { rubrik: '303', label: 'Revisorbistand', amount: opts.revisorBistand ? 'Ja' : 'Nej' },
        { rubrik: '320', label: 'Nettoomsætning', amount: res.nettoomsaetning },
        { rubrik: '321', label: 'Vareforbrug', amount: res.vareforbrug },
        { rubrik: '322', label: 'Fremmed arbejde / underleverandører', amount: res.fremmed_arbejde },
        { rubrik: '323', label: 'Andre driftsomkostninger', amount: r2(res.andre_driftsomkostninger + res.afskrivninger) },
        { rubrik: '331', label: 'Egenkapital', amount: bal.egenkapital },
        { rubrik: '332', label: 'Balancesum', amount: bal.balancesum },
        { rubrik: '63x', label: 'Anlægsaktiver', amount: bal.anlaegsaktiver },
        { rubrik: '638', label: 'Skyldig moms (negativ = tilgodehavende)', amount: bal.skyldig_moms },
      ]

  if (!fritaget) w.push('Omsætning ≥ 300.000 kr.: alle relevante regnskabsoplysninger (rubrik 300-380) skal udfyldes. Captain viser de mest brugte — gennemgå skemaet for felter som varelager, ejendomme m.fl. hvis relevant.')
  w.push('VSO (rubrik 147-152) og kapitalafkastordningen (125-139) er IKKE understøttet i v1 — vælger du en af ordningerne, så tag en revisor med.')
  w.push('Rubriknumre verificeres mod årets oplysningsskema — numrene kan ændre sig mellem år.')

  return { virksomhedsoplysninger: virk, regnskabsoplysninger: regnskab, fritaget_regnskabsoplysninger: fritaget, warnings: w }
}

// ---------------------------------------------------------------------------
// 4. APS — skattepligtig indkomst + selskabsskat (frist 6 mdr. efter årsafslutning)
// ---------------------------------------------------------------------------

export interface SelskabsskatResult {
  resultat_foer_skat: number
  korrektioner: { label: string; amount: number }[]   // permanente tillæg/fradrag
  skattepligtig_indkomst_foer_underskud: number
  anvendt_underskud: number
  skattepligtig_indkomst: number
  selskabsskat: number                                 // 22%
  acontoskat_betalt: number
  restskat: number
  warnings: string[]
}

export function computeSelskabsskat(
  entries: EngineEntry[], yearStart: string, yearEnd: string,
  opts: { fremfoertUnderskud?: number; acontoskatBetalt?: number } = {},
): SelskabsskatResult {
  const p = entries.filter((e) => inPeriod(e, yearStart, yearEnd))
  const res = computeResultat(entries, yearStart, yearEnd)
  const w: string[] = []

  // Permanente korrektioner (regnskab ≠ skat)
  const rep = sum(p.filter((e) => e.tax_line === 'repraesentation').map((e) => e.net_amount))
  const boeder = sum(p.filter((e) => e.tax_line === 'boeder').map((e) => e.net_amount))
  const korrektioner: { label: string; amount: number }[] = []
  if (rep > 0) korrektioner.push({ label: 'Repræsentation, ikke-fradragsberettiget 75%', amount: r2(rep * 0.75) })
  if (boeder > 0) korrektioner.push({ label: 'Bøder mv., ikke fradragsberettiget', amount: boeder })

  const skatFoerUnderskud = r2(res.resultat + korrektioner.reduce((a, k) => a + k.amount, 0))
  const fremfoert = opts.fremfoertUnderskud ?? 0
  const anvendt = skatFoerUnderskud > 0 ? r2(Math.min(fremfoert, skatFoerUnderskud)) : 0
  const skattepligtig = r2(Math.max(skatFoerUnderskud - anvendt, skatFoerUnderskud < 0 ? skatFoerUnderskud : 0))
  const skat = skattepligtig > 0 ? r2(skattepligtig * 0.22) : 0
  const aconto = opts.acontoskatBetalt ?? 0

  w.push('Skattemæssige afskrivninger (saldometoden, op til 25%) kan afvige fra regnskabsmæssige — v1 bruger regnskabsmæssige. Afvigelser kræver korrektion her.')
  w.push('Restunderskud skal indberettes i underskudsregisteret sammen med oplysningsskemaet.')
  if (skattepligtig < 0) w.push(`Årets skattemæssige underskud (${Math.abs(skattepligtig)} kr.) fremføres uden tidsbegrænsning.`)
  w.push('Acontoskat forfalder 20. marts og 20. november — frivillig 3. rate kan spare restskattetillæg.')

  return {
    resultat_foer_skat: res.resultat,
    korrektioner,
    skattepligtig_indkomst_foer_underskud: skatFoerUnderskud,
    anvendt_underskud: anvendt,
    skattepligtig_indkomst: skattepligtig,
    selskabsskat: skat,
    acontoskat_betalt: aconto,
    restskat: r2(skat - aconto),
    warnings: w,
  }
}

// ---------------------------------------------------------------------------
// 5. APS — årsrapport, regnskabsklasse B (til Erhvervsstyrelsen, frist 6 mdr.)
// ---------------------------------------------------------------------------

export interface AarsrapportB {
  resultatopgoerelse: { label: string; amount: number }[]
  balance_aktiver: { label: string; amount: number }[]
  balance_passiver: { label: string; amount: number }[]
  checks: { ok: boolean; label: string }[]
  warnings: string[]
}

export function computeAarsrapportB(
  entries: EngineEntry[], yearStart: string, yearEnd: string, selskabsskat: number,
): AarsrapportB {
  const res = computeResultat(entries, yearStart, yearEnd)
  const bal = computeBalance(entries, yearEnd)
  const bruttofortjeneste = r2(res.nettoomsaetning + res.andre_indtaegter - res.vareforbrug - res.fremmed_arbejde)
  const aaretsResultat = r2(res.resultat - selskabsskat)

  const passiverSum = r2(bal.egenkapital + bal.skyldig_moms + bal.anden_gaeld)
  const balancerer = Math.abs(bal.balancesum - passiverSum) < 0.01

  return {
    resultatopgoerelse: [
      // Klasse B må starte med bruttofortjeneste (omsætning kan udelades)
      { label: 'Bruttofortjeneste', amount: bruttofortjeneste },
      { label: 'Andre eksterne omkostninger', amount: -res.andre_driftsomkostninger },
      { label: 'Af- og nedskrivninger', amount: -res.afskrivninger },
      { label: 'Finansielle indtægter', amount: res.renteindtaegter },
      { label: 'Finansielle omkostninger', amount: -res.renteudgifter },
      { label: 'Resultat før skat', amount: res.resultat },
      { label: 'Skat af årets resultat', amount: -selskabsskat },
      { label: 'Årets resultat', amount: aaretsResultat },
    ],
    balance_aktiver: [
      { label: 'Anlægsaktiver', amount: bal.anlaegsaktiver },
      { label: 'Omsætningsaktiver', amount: bal.omsaetningsaktiver },
      { label: 'Aktiver i alt', amount: bal.balancesum },
    ],
    balance_passiver: [
      { label: 'Egenkapital', amount: bal.egenkapital },
      { label: 'Gældsforpligtelser', amount: r2(bal.skyldig_moms + bal.anden_gaeld) },
      { label: 'Passiver i alt', amount: passiverSum },
    ],
    checks: [
      { ok: balancerer, label: balancerer ? 'Balancen stemmer' : `Balancen stemmer IKKE (difference ${r2(bal.balancesum - passiverSum)} kr.) — gennemgå posteringerne` },
    ],
    warnings: [
      'Årsrapporten skal også indeholde: ledelsespåtegning, anvendt regnskabspraksis og noter — Captain genererer tallene, teksterne skal med ved indberetning.',
      'Indberettes digitalt (XBRL) via Regnskab Basis på virk.dk senest 6 måneder efter regnskabsårets udløb.',
      'Mikrovirksomheder (klasse B-mikro) kan udelade visse noter — tjek grænserne (balancesum/omsætning/ansatte).',
    ],
  }
}

// ---------------------------------------------------------------------------
// Deadlines — what Captain should nudge about, per company type
// ---------------------------------------------------------------------------

export function complianceCalendar(companyType: CompanyType, vatPeriod: string): { label: string; when: string }[] {
  const moms = vatPeriod === 'halvaarlig'
    ? [{ label: 'Momsindberetning H1', when: '1. september' }, { label: 'Momsindberetning H2', when: '1. marts' }]
    : vatPeriod === 'kvartalsvis'
      ? [{ label: 'Moms Q1', when: '1. juni' }, { label: 'Moms Q2', when: '1. september' }, { label: 'Moms Q3', when: '1. december' }, { label: 'Moms Q4', when: '1. marts' }]
      : [{ label: 'Moms månedlig', when: '25. i efterfølgende måned' }]

  return companyType === 'enkeltmandsvirksomhed'
    ? [...moms, { label: 'Oplysningsskema (personligt)', when: '1. juli' }, { label: 'B-skat rater', when: 'månedligt (undt. apr/dec)' }]
    : [...moms,
       { label: 'Acontoskat 1. rate', when: '20. marts' },
       { label: 'Acontoskat 2. rate', when: '20. november' },
       { label: 'Årsrapport til Erhvervsstyrelsen', when: '6 mdr. efter årsafslutning' },
       { label: 'Oplysningsskema for selskaber + underskudsregister', when: '6 mdr. efter årsafslutning' }]
}
