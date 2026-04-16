import { motion } from "framer-motion";
import { Construction } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-2.75rem)]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <Construction className="h-8 w-8 text-muted-foreground mx-auto" />
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">Kommer snart</p>
      </motion.div>
    </div>
  );
}
