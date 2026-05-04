import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/format";
import { Check, X, FileText, Receipt, Percent, Building2, AlertCircle } from "lucide-react";

interface BaseProps {
  onApprove?: () => void;
  onReject?: () => void;
}

export interface PostingCardData {
  kind: "posting";
  date: string;
  description: string;
  amount: number;
  account: string;
  counter_account: string;
  vat_rate?: number;
}

export interface InvoiceCardData {
  kind: "invoice";
  number: number;
  customer: string;
  total: number;
  due_date: string;
}

export interface VatCardData {
  kind: "vat";
  period: string;
  sales_vat: number;
  purchase_vat: number;
  net: number;
  deadline: string;
}

export interface AlertCardData {
  kind: "alert";
  title: string;
  description: string;
}

export type StructuredCardData = PostingCardData | InvoiceCardData | VatCardData | AlertCardData;

export function MessageCard({ data, onApprove, onReject }: { data: StructuredCardData } & BaseProps) {
  if (data.kind === "posting") {
    return (
      <div className="border border-border/60 rounded bg-card/60 p-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Receipt className="h-3 w-3" />
          <span>Konteringsforslag</span>
          <span className="font-mono ml-auto">{data.date}</span>
        </div>
        <p className="font-medium">{data.description}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-muted-foreground">Konto:</span> <span className="font-mono">{data.account}</span></div>
          <div><span className="text-muted-foreground">Modkonto:</span> <span className="font-mono">{data.counter_account}</span></div>
          <div><span className="text-muted-foreground">Beløb:</span> <span className="font-mono">{formatAmount(data.amount)}</span></div>
          {data.vat_rate !== undefined && (
            <div><span className="text-muted-foreground">Moms:</span> <span className="font-mono">{data.vat_rate}%</span></div>
          )}
        </div>
        {(onApprove || onReject) && (
          <div className="flex gap-2 pt-1">
            {onApprove && <Button size="sm" className="h-7 text-xs gap-1" onClick={onApprove}><Check className="h-3 w-3" /> Godkend</Button>}
            {onReject && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onReject}><X className="h-3 w-3" /> Ret</Button>}
          </div>
        )}
      </div>
    );
  }

  if (data.kind === "invoice") {
    return (
      <div className="border border-border/60 rounded bg-card/60 p-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>Faktura #{data.number}</span>
          <span className="ml-auto">Forfald {data.due_date}</span>
        </div>
        <p className="font-medium">{data.customer}</p>
        <p className="font-mono text-base text-primary">{formatAmount(data.total)}</p>
      </div>
    );
  }

  if (data.kind === "vat") {
    return (
      <div className="border border-border/60 rounded bg-card/60 p-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Percent className="h-3 w-3" />
          <span>Moms — {data.period}</span>
          <Badge variant="outline" className="ml-auto text-[10px]">Frist {data.deadline}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><p className="text-muted-foreground">Salgsmoms</p><p className="font-mono">{formatAmount(data.sales_vat)}</p></div>
          <div><p className="text-muted-foreground">Købsmoms</p><p className="font-mono">{formatAmount(data.purchase_vat)}</p></div>
          <div><p className="text-muted-foreground">Netto</p><p className="font-mono text-primary">{formatAmount(data.net)}</p></div>
        </div>
      </div>
    );
  }

  if (data.kind === "alert") {
    return (
      <div className="border border-warning/30 bg-warning/5 rounded p-3 flex gap-2 text-sm">
        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{data.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.description}</p>
        </div>
      </div>
    );
  }

  return null;
}
