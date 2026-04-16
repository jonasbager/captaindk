

# Bogføring — AI-first bogføringssystem

## Design System
- **Dark theme default**: Background #0a0b0d, surfaces #13141a, subtle 1px borders at low opacity
- **Typography**: Monospace (JetBrains Mono) for all numbers/amounts, DM Sans for body text
- **Colors**: Green accent (#4ade80) for positive/confirmations, Red (#f87171) for negative/warnings, muted text for secondary info
- **Style**: Linear/Mercury-inspired — no shadows, no rounded-everything, generous whitespace for number-heavy layouts
- **Animations**: Subtle fade-in/slide-up on load, smooth state transitions only

## Navigation
- Sidebar with all 11 items (Dashboard, Bogfør, Indbakke w/ badge, Bilag, Posteringer, Kontoplan, Moms, SKAT, Import, Integrationer, Indstillinger)
- Collapsed to icons by default, expand on hover
- Company name + CVR at bottom

## Pages to Build (Phase 1)

### 1. Dashboard (/dashboard)
- Company header (Bager Consulting, CVR 41679182, Regnskabsår 2025)
- KPI cards: Omsætning YTD, Resultat YTD, Skyldig moms, Banksaldo
- Prominent "Indbakke" section with counts (unmatched docs, unmatched transactions, pending AI suggestions) linking to relevant views
- Recent 5-10 journal entries table with status badges

### 2. Chat / Bogfør (/bogfoer)
- 70/30 split: chat bubbles left, context panel right
- Clean message-app feel — no AI avatars, no typing indicators
- Demo conversation showing: user describes purchase → system shows structured booking card (amount incl/excl VAT, account, counter-account) with Godkend/Ret buttons → user uploads receipt → system matches it
- Context panel shows relevant account info based on conversation

### 3. Indbakke (/indbakke)
- Three-column layout:
  - Col 1: Bilag uden match (8-12 items with thumbnails, vendor, amount, date)
  - Col 2: Transaktioner uden bilag (10-15 bank transactions)
  - Col 3: AI-forslag (6-8 auto-matches with confidence scores, Godkend/Afvis buttons)
- Keyboard navigation: Space=approve, X=reject, arrows=navigate
- Progress indicator: "12 af 34 forslag behandlet"
- Drag-and-drop from col 1 to col 2 for manual matching

### 4. Bilag (/bilag)
- **Email forwarding**: Unique address display with copy button, recent 10 received emails log
- **Gmail/Outlook OAuth**: Connect buttons with transparency about what's accessed
- **Mobile scanner (/snap)**: Fullscreen camera view, auto-detect receipt, haptic feedback, instant OCR preview, batch mode
- **Desktop**: Large drag-and-drop zone for images/PDFs, QR code linking to /snap
- All three methods prominently displayed

### 5. SKAT / Oplysningsskema (/skat)
- All relevant SKAT rubrikker with auto-calculated amounts from demo data
- Per-rubrik: number, field name, calculated amount, expandable explanation
- Demo data for Bager Consulting (Rubrik 320: 411.397 kr, etc.)
- "Kopier alle værdier" button + individual copy buttons
- Status indicator: ready/incomplete with specifics

## Placeholder Pages
- Posteringer, Kontoplan, Moms, Import, Integrationer, Indstillinger — basic layout with "Kommer snart" state, routed but minimal

## Demo Data
- Company: Bager Consulting, CVR 41679182, fiscal year 2025
- Danish account names, Danish number formatting (1.000,00), 25% VAT
- Realistic vendors: Elgiganten, DSB, Kontorland, Adobe, etc.
- All UI text in Danish

## Technical
- Feature-based folder structure: /features/journal, /features/chat, /features/inbox, /features/documents, /features/tax, etc.
- TypeScript throughout, shadcn/ui components restyled to match design direction
- Desktop-first, except /snap which is mobile-first
- Supabase setup deferred — all demo data hardcoded initially for fast prototyping

