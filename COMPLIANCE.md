# Captain — Compliance-kort: Enkeltmandsvirksomhed vs. ApS

Hvad SKAT/Erhvervsstyrelsen kræver, hvad engine v1 dækker, og hvad der bevidst er udeladt.
Kilder: skat.dk-praksis, e-conomic/Dinero feltdokumentation, verificeret juni 2026.
⚠ = verificér mod årets faktiske skema før release (numre/grænser kan flytte sig).

## 1. MOMS — identisk for begge virksomhedsformer

Momsangivelsens felter (TastSelv Erhverv):

| Felt | Engine | Note |
|---|---|---|
| Salgsmoms (udgående) | ✅ U25 | 25% af dansk salg |
| Moms af varekøb i udlandet | ✅ IEUV+IVKU | Beregnet 25%, omvendt betalingspligt |
| Moms af ydelseskøb i udlandet | ✅ IEUY | Google Ads, software-abonnementer m.m. |
| Købsmoms (indgående) | ✅ I25+REP+reverse | Repræsentation: kun 25% af momsen fradrages |
| Elafgift / vandafgift / olie-flaskegas / naturgas-bygas | ⚠ delvist | Godtgørelse er PR. ENHED (kWh/m³), ikke pct. af beløb. v1 sætter 0 + advarsel. v2: aflæs enheder fra el-faktura via OCR |
| Rubrik A-varer / A-ydelser | ✅ | EU-køb ekskl. moms |
| Rubrik B-varer / B-ydelser | ✅ | B-varer kræver OGSÅ separat indberetning til "EU-salg uden moms" — engine advarer |
| Rubrik C | ✅ | Eksport uden for EU |

Perioder: månedlig (>50 mio.), kvartalsvis (5-50 mio. + nystartede min. 1,5 år), halvårlig (<5 mio.). Nulindberetning er obligatorisk selv uden aktivitet.

## 2. ENKELTMANDSVIRKSOMHED

**Oplysningsskema (personligt, frist 1. juli):**
- Rubrik 111 overskud / 112 underskud (før renter) — ✅
- Rubrik 114/116 renteindtægter/-udgifter i virksomhed — ✅ ⚠ verificér numre
- Regnskabsoplysninger: omsætning < 300.000 kr. → kun 300-306 (CVR, fritagelses-ja, revisorbistand). Over → 300-380: nettoomsætning (320), vareforbrug (321), fremmed arbejde (322), øvrige omkostninger (323), egenkapital (331), balancesum (332), anlægsaktiver, skyldig/tilgodehavende moms (638) — ✅ de mest brugte; ⚠ varelager, ejendomme, biler udeladt i v1
- VSO (147-152) og kapitalafkastordning (125-139): ❌ bevidst udeladt — engine advarer og henviser til revisor. Det er den rigtige v1-grænse; VSO-fejl er dyre.
- Forskudsopgørelse/B-skat: ikke en indberetning fra regnskabet, men Captain bør nudge når årets resultat afviger markant fra forskudsregistreringen.

**Årsregnskab:** Ingen indsendelse til Erhvervsstyrelsen (regnskabsklasse A). Bogføringsloven kræver dog digital opbevaring af bilag i 5 år — Captain opfylder det allerede via documents-tabellen.

## 3. APS

**Selskabsskat (oplysningsskema for selskaber, frist 6 mdr. efter årsafslutning):**
- Skattepligtig indkomst = årets resultat ± permanente korrektioner — ✅
  - Repræsentation: kun 25% skattefradrag → 75% tillægges — ✅
  - Bøder/ej-fradragsberettiget: tillægges 100% — ✅
  - Skattemæssige vs. regnskabsmæssige afskrivninger (saldometode 25%): ⚠ v1 bruger regnskabsmæssige, advarer ved afvigelse
- Underskudsfremførsel (ubegrænset tid) + underskudsregisteret — ✅ beregning, ⚠ indberetning manuel
- Selskabsskat 22%, acontoskat 20/3 + 20/11, frivillig 3. rate — ✅ i complianceCalendar

**Årsrapport (Erhvervsstyrelsen, frist 6 mdr., digital XBRL via Regnskab Basis):**
- Regnskabsklasse B: resultatopgørelse (må starte ved bruttofortjeneste), balance, egenkapitalopgørelse, anvendt regnskabspraksis, noter, ledelsespåtegning — ✅ tal-delen; tekster genereres af Captain-chat, ikke engine
- Mikro-B-lempelser (kan udelade regnskabspraksis m.m.): ⚠ grænser tjekkes pr. år
- Revisionspligt: fravælges typisk under grænserne (omsætning 8 mio. / balance 4 mio. / 12 ansatte, 2 af 3 i 2 år) ⚠ verificér aktuelle grænser

**Øvrigt ApS-specifikt:** udbytteindberetning ved udlodning, løn til ejer kræver eIndkomst-indberetning (lønsystem — udenfor Captains v1-scope, flag det i onboarding).

## 4. Hvad der gør det "airtight" i praksis

1. **VAT codes på kontoniveau** (migrationens accounts-tabel) — uden dem kan ingen momsangivelse beregnes korrekt. Det var det manglende fundament i repoet.
2. **Engine beregner, mennesket godkender.** Hvert tal kan klikkes ud til de underliggende posteringer (drill-down findes allerede i Posteringer-UI'et).
3. **Advarsler i stedet for gæt.** Elafgift, VSO, skattemæssige afskrivninger: engine siger eksplicit hvad den IKKE har beregnet. En bogføringsassistent der gætter på afgiftsgodtgørelse er værre end en der siger "det her kræver din el-faktura".
4. **Rubriknumre er displaydata**, semantiske linjer er beregningsdata. Når SKAT omdøber felter, opdateres ét map — ikke beregningslogikken.
