import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

export default function Moms() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-semibold">
        Momsperioder
      </motion.h1>

      <div className="border border-border/50 rounded bg-card flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Ingen momsperioder endnu</p>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
          Momsperioder beregnes automatisk når du har bogført salg og køb med moms.
        </p>
      </div>
    </div>
  );
}
