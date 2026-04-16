import { motion } from "framer-motion";
import { company } from "@/lib/demo-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Indstillinger() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        Indstillinger
      </motion.h1>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="border border-border/50 rounded p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold">Virksomhed</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Virksomhedsnavn</Label>
            <Input defaultValue={company.name} className="h-8 text-sm bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CVR-nummer</Label>
            <Input defaultValue={company.cvr} className="h-8 text-sm bg-background font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Regnskabsår start</Label>
            <Input defaultValue="2025-01-01" type="date" className="h-8 text-sm bg-background font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Momsperiode</Label>
            <Select defaultValue="halvaar">
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="halvaar">Halvårlig</SelectItem>
                <SelectItem value="kvartal">Kvartalsvis</SelectItem>
                <SelectItem value="maaned">Månedlig</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" className="text-xs">Gem ændringer</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="border border-border/50 rounded p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold">Konto</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Navn</Label>
            <Input defaultValue="Jonas Bager" className="h-8 text-sm bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input defaultValue="jonas@bagerconsulting.dk" className="h-8 text-sm bg-background" />
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="border border-destructive/30 rounded p-5 space-y-3"
      >
        <h2 className="text-sm font-semibold text-destructive">Farezone</h2>
        <p className="text-xs text-muted-foreground">Slet alle data og nulstil virksomheden. Denne handling kan ikke fortrydes.</p>
        <Button variant="destructive" size="sm" className="text-xs">Slet virksomhed</Button>
      </motion.div>
    </div>
  );
}
