import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Building2, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  role: "captain" | "user";
  content: string;
  options?: { label: string; value: string }[];
  companyPreview?: CvrCompany | null;
}

interface CvrCompany {
  name: string;
  cvr: string;
  address: string;
  city: string;
  zipcode: string;
  industrycode: string;
  industrydesc: string;
  companydesc: string;
  startdate: string;
}

type Step = "welcome" | "cvr_input" | "cvr_confirm" | "manual_name" | "manual_cvr_optional" | "company_type" | "vat_period" | "fiscal_year" | "creating" | "done";

// Matcher CVR-registerets virksomhedsformtekst til vores company_type
const detectCompanyType = (companydesc: string): "enkeltmandsvirksomhed" | "aps" | null => {
  if (/anpartsselskab/i.test(companydesc)) return "aps";
  if (/enkeltmandsvirksomhed/i.test(companydesc)) return "enkeltmandsvirksomhed";
  return null;
};

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [cvrData, setCvrData] = useState<CvrCompany | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyCvr, setCompanyCvr] = useState("");
  const [companyType, setCompanyType] = useState<"enkeltmandsvirksomhed" | "aps">("enkeltmandsvirksomhed");
  const [vatPeriod, setVatPeriod] = useState<"maanedlig" | "kvartalsvis" | "halvaarlig">("halvaarlig");
  const scrollRef = useRef<HTMLDivElement>(null);

  const addMessage = (msg: Omit<ChatMessage, "id">) => {
    const newMsg = { ...msg, id: crypto.randomUUID() };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  };

  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        addMessage({
          role: "captain",
          content: "Velkommen til Captain! 🧭\n\nJeg hjælper dig med at sætte din virksomhed op. Lad os starte — har du et CVR-nummer?",
          options: [
            { label: "Ja, jeg har et CVR-nummer", value: "has_cvr" },
            { label: "Nej, jeg vil indtaste manuelt", value: "manual" },
          ],
        });
        setStep("welcome");
      }, 400);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lookupCvr = async (cvr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://apicvr.dk/api/v1/${cvr}`);
      if (!res.ok) throw new Error("CVR ikke fundet");
      const data = await res.json();
      
      const company: CvrCompany = {
        name: data.name || data.company_name || "",
        cvr: data.vat?.toString() || cvr,
        address: data.address || "",
        city: data.city || "",
        zipcode: data.zipcode || "",
        industrycode: data.industrycode?.toString() || "",
        industrydesc: data.industrydesc || "",
        companydesc: data.companydesc || "",
        startdate: data.startdate || "",
      };
      
      setCvrData(company);
      setCompanyName(company.name);
      setCompanyCvr(cvr);
      
      addMessage({
        role: "captain",
        content: `Jeg fandt din virksomhed:`,
        companyPreview: company,
        options: [
          { label: "Ja, det er korrekt!", value: "confirm_cvr" },
          { label: "Nej, det er forkert", value: "wrong_cvr" },
        ],
      });
      setStep("cvr_confirm");
    } catch {
      addMessage({
        role: "captain",
        content: "Hmm, jeg kunne ikke finde en virksomhed med det CVR-nummer. Prøv igen, eller indtast dine oplysninger manuelt.",
        options: [
          { label: "Prøv et andet CVR", value: "retry_cvr" },
          { label: "Indtast manuelt", value: "manual" },
        ],
      });
      setStep("welcome");
    } finally {
      setLoading(false);
    }
  };

  const askCompanyType = () => {
    addMessage({
      role: "captain",
      content: "Hvilken virksomhedsform har du?",
      options: [
        { label: "Enkeltmandsvirksomhed", value: "type_enkelt" },
        { label: "ApS", value: "type_aps" },
      ],
    });
    setStep("company_type");
  };

  const askVatPeriod = () => {
    addMessage({
      role: "captain",
      content: "Hvor ofte afregner du moms? Det står i din registrering hos Skattestyrelsen — nye og mindre virksomheder er typisk halvårlige.",
      options: [
        { label: "Halvårligt", value: "vat_halvaarlig" },
        { label: "Kvartalsvis", value: "vat_kvartalsvis" },
        { label: "Månedligt", value: "vat_maanedlig" },
      ],
    });
    setStep("vat_period");
  };

  const askFiscalYear = () => {
    addMessage({
      role: "captain",
      content: "Hvornår starter dit regnskabsår?",
      options: [
        { label: "1. januar", value: "fiscal_jan" },
        { label: "1. juli", value: "fiscal_jul" },
        { label: "Andet", value: "fiscal_custom" },
      ],
    });
    setStep("fiscal_year");
  };

  // Efter CVR-bekræftelse: spring virksomhedsform-spørgsmålet over hvis CVR-registeret allerede har svaret
  const afterCompanyConfirmed = () => {
    const detected = cvrData ? detectCompanyType(cvrData.companydesc) : null;
    if (detected) {
      setCompanyType(detected);
      addMessage({
        role: "captain",
        content: `Jeg kan se i CVR-registeret, at det er en **${detected === "aps" ? "ApS" : "enkeltmandsvirksomhed"}** — det noterer jeg.`,
      });
      askVatPeriod();
    } else {
      askCompanyType();
    }
  };

  const createCompany = async (name: string, cvr: string | null, fiscalStart: string) => {
    if (!user) return;
    setStep("creating");
    addMessage({ role: "captain", content: "Opretter din virksomhed..." });

    const { error } = await supabase.from("companies").insert({
      name,
      cvr: cvr || null,
      fiscal_year_start: fiscalStart,
      company_type: companyType,
      vat_period: vatPeriod,
      owner_id: user.id,
    });

    if (error) {
      toast({ title: "Fejl", description: error.message, variant: "destructive" });
      setStep("fiscal_year");
      return;
    }

    setStep("done");
    addMessage({
      role: "captain",
      content: `**${name}** er nu oprettet! 🎉\n\nDu er klar til at bogføre. Lad os komme i gang!`,
    });

    setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
  };

  const handleOptionClick = (value: string) => {
    switch (value) {
      case "has_cvr":
        addMessage({ role: "user", content: "Ja, jeg har et CVR-nummer" });
        addMessage({ role: "captain", content: "Perfekt! Indtast dit CVR-nummer nedenfor." });
        setStep("cvr_input");
        break;
      case "manual":
        addMessage({ role: "user", content: "Jeg vil indtaste manuelt" });
        addMessage({ role: "captain", content: "Ingen problem! Hvad hedder din virksomhed?" });
        setStep("manual_name");
        break;
      case "confirm_cvr":
        addMessage({ role: "user", content: "Ja, det er korrekt!" });
        afterCompanyConfirmed();
        break;
      case "type_enkelt":
        addMessage({ role: "user", content: "Enkeltmandsvirksomhed" });
        setCompanyType("enkeltmandsvirksomhed");
        askVatPeriod();
        break;
      case "type_aps":
        addMessage({ role: "user", content: "ApS" });
        setCompanyType("aps");
        askVatPeriod();
        break;
      case "vat_halvaarlig":
        addMessage({ role: "user", content: "Halvårligt" });
        setVatPeriod("halvaarlig");
        askFiscalYear();
        break;
      case "vat_kvartalsvis":
        addMessage({ role: "user", content: "Kvartalsvis" });
        setVatPeriod("kvartalsvis");
        askFiscalYear();
        break;
      case "vat_maanedlig":
        addMessage({ role: "user", content: "Månedligt" });
        setVatPeriod("maanedlig");
        askFiscalYear();
        break;
      case "wrong_cvr":
        addMessage({ role: "user", content: "Nej, det er forkert" });
        addMessage({
          role: "captain",
          content: "Beklager! Prøv igen med et andet CVR-nummer, eller indtast manuelt.",
          options: [
            { label: "Prøv et andet CVR", value: "retry_cvr" },
            { label: "Indtast manuelt", value: "manual" },
          ],
        });
        setStep("welcome");
        break;
      case "retry_cvr":
        addMessage({ role: "user", content: "Jeg prøver et andet CVR" });
        addMessage({ role: "captain", content: "Indtast dit CVR-nummer." });
        setStep("cvr_input");
        break;
      case "fiscal_jan":
        addMessage({ role: "user", content: "1. januar" });
        createCompany(companyName, companyCvr || null, new Date().getFullYear() + "-01-01");
        break;
      case "fiscal_jul":
        addMessage({ role: "user", content: "1. juli" });
        createCompany(companyName, companyCvr || null, new Date().getFullYear() + "-07-01");
        break;
      case "fiscal_custom":
        addMessage({ role: "user", content: "Andet" });
        addMessage({ role: "captain", content: "Indtast startdatoen for dit regnskabsår (f.eks. 2025-04-01)." });
        setStep("fiscal_year");
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");

    if (step === "cvr_input") {
      const cleaned = text.replace(/\s|-/g, "");
      if (!/^\d{8}$/.test(cleaned)) {
        addMessage({ role: "user", content: text });
        addMessage({ role: "captain", content: "CVR-numre er 8 cifre. Prøv igen." });
        return;
      }
      addMessage({ role: "user", content: cleaned });
      lookupCvr(cleaned);
    } else if (step === "manual_name") {
      addMessage({ role: "user", content: text });
      setCompanyName(text);
      addMessage({ role: "captain", content: `Har du et CVR-nummer til **${text}**? Skriv det nedenfor, eller tryk "Spring over".`,
        options: [{ label: "Spring CVR over", value: "skip_cvr" }],
      });
      setStep("manual_cvr_optional");
    } else if (step === "manual_cvr_optional") {
      const cleaned = text.replace(/\s|-/g, "");
      if (/^\d{8}$/.test(cleaned)) {
        setCompanyCvr(cleaned);
        addMessage({ role: "user", content: cleaned });
      } else {
        addMessage({ role: "user", content: text });
      }
      askCompanyType();
    } else if (step === "fiscal_year") {
      // Try parse a date
      addMessage({ role: "user", content: text });
      const match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        createCompany(companyName, companyCvr || null, text);
      } else {
        addMessage({ role: "captain", content: "Brug formatet ÅÅÅÅ-MM-DD, f.eks. 2025-01-01." });
      }
    }
  };

  // Handle skip_cvr option for manual flow
  const handleOptionClickExtended = (value: string) => {
    if (value === "skip_cvr") {
      addMessage({ role: "user", content: "Spring CVR over" });
      askCompanyType();
    } else {
      handleOptionClick(value);
    }
  };

  const isInputDisabled = step === "creating" || step === "done" || step === "welcome" || step === "cvr_confirm" || step === "company_type" || step === "vat_period";
  const showInput = step !== "creating" && step !== "done";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 px-6 py-4 flex items-center gap-3">
        <Logo className="h-8 w-auto" />
        <span className="text-xs text-muted-foreground ml-2">Opsætning</span>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-1" : ""}`}>
                {msg.role === "captain" && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <Logo className="h-4 w-auto" />
                    <span className="text-xs text-muted-foreground font-medium">Captain</span>
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/50"
                  }`}
                >
                  {msg.content.split("\n").map((line, i) => (
                    <p key={i} className={i > 0 ? "mt-2" : ""}>
                      {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </p>
                  ))}
                </div>

                {/* Company preview card */}
                {msg.companyPreview && (
                  <div className="mt-3 border border-border/50 rounded-lg bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{msg.companyPreview.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider">CVR</span>
                        <p className="font-mono text-foreground">{msg.companyPreview.cvr}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider">Adresse</span>
                        <p className="text-foreground">{msg.companyPreview.address}, {msg.companyPreview.zipcode} {msg.companyPreview.city}</p>
                      </div>
                      {msg.companyPreview.industrydesc && (
                        <div className="col-span-2">
                          <span className="text-[10px] uppercase tracking-wider">Branche</span>
                          <p className="text-foreground">{msg.companyPreview.industrydesc}</p>
                        </div>
                      )}
                      {msg.companyPreview.companydesc && (
                        <div className="col-span-2">
                          <span className="text-[10px] uppercase tracking-wider">Virksomhedsform</span>
                          <p className="text-foreground">{msg.companyPreview.companydesc}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Option buttons */}
                {msg.options && msg.id === messages[messages.length - 1]?.id && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.options.map((opt) => (
                      <Button
                        key={opt.value}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => handleOptionClickExtended(opt.value)}
                        disabled={loading || step === "creating"}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-muted-foreground mb-4"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Søger i CVR-registeret...
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mt-4"
          >
            <Button onClick={() => navigate("/dashboard", { replace: true })} className="gap-2">
              Gå til dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input bar */}
      {showInput && (
        <div className="border-t border-border/50 px-4 py-3 max-w-2xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                step === "cvr_input"
                  ? "Indtast CVR-nummer (8 cifre)..."
                  : step === "manual_name"
                  ? "Indtast virksomhedsnavn..."
                  : step === "fiscal_year"
                  ? "ÅÅÅÅ-MM-DD..."
                  : step === "manual_cvr_optional"
                  ? "CVR-nummer (valgfrit)..."
                  : "Skriv her..."
              }
              disabled={isInputDisabled || loading}
              className="flex-1"
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              disabled={isInputDisabled || loading || !input.trim()}
              className="shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
