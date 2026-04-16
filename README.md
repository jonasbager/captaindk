# Captain

AI-first bogføringssystem til danske freelancere og små virksomheder.

## Status: Beta — UI Complete, Backend In Progress

### What's UI-complete (built in Lovable)
- Dashboard, Bogfør (chat), Indbakke, Bilag, Faktura, Posteringer
- Kontoplan, Moms, SKAT, Import, Integrationer, Indstillinger

### What needs backend implementation (in Claude Code)
- Real Claude API integration for chat
- Email receipt pipeline (inbound email handling)
- Claude Vision OCR for receipt extraction
- CSV parsing logic
- Bank transaction matching algorithm
- SKAT rubrik calculation engine
- Gmail/Outlook OAuth backend flows

### Tech stack
- React + Vite
- Supabase (auth, database, storage)
- shadcn/ui components
- Tailwind CSS
- TypeScript

### Local development
```bash
npm install
npm run dev
```
