import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Clock, Crown, BookOpen, FileText, Calculator, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const plans = [
  {
    key: "monthly" as const,
    name: "Monthly",
    price: "R29",
    amount: "1.60",
    period: "month",
    desc: "Full access, billed monthly",
    badge: null,
    features: [
      "Unlimited AI Quiz Generation",
      "Unlimited AI Exam Papers",
      "Unlimited Test Mode (with timer)",
      "Full Assignment AI Feedback",
      "Unlimited Calculator Explanations",
      "Save & view past exams offline",
    ],
  },
  {
    key: "semester" as const,
    name: "Semester",
    price: "R150",
    amount: "8.30",
    period: "semester",
    desc: "Full semester — save R24",
    badge: "Best Value",
    features: [
      "Everything in Monthly",
      "Priority AI processing",
      "Early access to new features",
      "Exam summary notes",
      "Best value for long-term study",
      "Only R25/month effective rate",
    ],
  },
];

function PlanCard({
  plan,
  isPremium,
  onSuccess,
}: {
  plan: typeof plans[number];
  isPremium: boolean;
  onSuccess: (plan: string) => void;
}) {
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);

  return (
    <Card
      className={`relative overflow-hidden h-full flex flex-col border-2 bg-card ${
        plan.badge ? "border-primary shadow-lg shadow-primary/10" : "border-border"
      }`}
    >
      {plan.badge && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
            {plan.badge}
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
        <CardDescription className="text-muted-foreground">{plan.desc}</CardDescription>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-4xl font-bold text-primary">{plan.price}</span>
          <span className="text-muted-foreground text-sm">/{plan.period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <div className="mt-0.5 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-primary" />
              </div>
              <span className="text-foreground">{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-4">
        {isPremium ? (
          <div className="w-full h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm">
            <Check className="w-4 h-4" /> Current Plan
          </div>
        ) : paying ? (
          <div className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Processing…
          </div>
        ) : (
          <PayPalButtons
            style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 48 }}
            fundingSource={undefined}
            createOrder={async () => {
              const r = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ plan: plan.key }),
              });
              const data = await r.json() as { orderId?: string; message?: string };
              if (!data.orderId) throw new Error(data.message || "Failed to create order");
              return data.orderId;
            }}
            onApprove={async (data) => {
              setPaying(true);
              try {
                const r = await fetch("/api/payments/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ orderId: data.orderID }),
                });
                const result = await r.json() as { success?: boolean; message?: string };
                if (result.success) {
                  onSuccess(plan.key);
                } else {
                  throw new Error(result.message || "Capture failed");
                }
              } catch (err: any) {
                toast({ title: "Payment error", description: err.message, variant: "destructive" });
              } finally {
                setPaying(false);
              }
            }}
            onError={(err) => {
              console.error("PayPal error:", err);
              toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
            }}
            onCancel={() => {
              toast({ title: "Payment cancelled", description: "You can try again any time." });
            }}
            data-testid={`paypal-button-${plan.key}`}
          />
        )}
      </CardFooter>
    </Card>
  );
}

export function Premium() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [clientId, setClientId] = useState<string | null>(null);
  const isPremium = user?.tier === "premium" || (user as any)?.isPremium;
  const trialActive = (user as any)?.trialActive;
  const trialDaysLeft = (user as any)?.trialDaysLeft ?? 0;

  useEffect(() => {
    fetch("/api/payments/config", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { clientId: string }) => setClientId(d.clientId))
      .catch(() => toast({ title: "Could not load payment methods", variant: "destructive" }));
  }, []);

  const handleSuccess = async (plan: string) => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    toast({ title: "Payment successful!", description: `Welcome to Hulinks Premium — ${plan} plan.` });
    setTimeout(() => navigate("/payment-success"), 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto"
        >
          <Crown className="w-8 h-8 text-primary" />
        </motion.div>
        <h1 className="text-4xl font-bold text-foreground">Upgrade to Premium</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Unlock unlimited AI-powered study tools designed specifically for NMU students.
        </p>

        {trialActive && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Clock className="w-4 h-4" />
            Free trial active — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining
          </div>
        )}
        {isPremium && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <Check className="w-4 h-4" /> You are on Premium — enjoy full access!
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
        <Clock className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm text-foreground">
          <span className="font-bold text-primary">Free Trial:</span> Every new student gets a 2-day free trial with full premium access — automatically applied on signup.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground font-medium">Pay securely with:</span>
        {["PayPal", "Debit / Credit Card", "Bank Transfer"].map((method) => (
          <span
            key={method}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary border border-border text-foreground font-medium"
          >
            {method}
          </span>
        ))}
      </div>

      {clientId ? (
        <PayPalScriptProvider
          options={{
            clientId,
            currency: "USD",
            intent: "capture",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <PlanCard plan={plan} isPremium={!!isPremium} onSuccess={handleSuccess} />
              </motion.div>
            ))}
          </div>
        </PayPalScriptProvider>
      ) : (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading payment options…
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: BookOpen, title: "Unlimited Exams", desc: "Generate as many quizzes and exam papers as you need, any time." },
          { icon: FileText, title: "Assignment Help", desc: "Unlimited AI feedback on your assignment structure and grammar." },
          { icon: Calculator, title: "Step-by-Step Math", desc: "Solve unlimited maths and physics problems with full explanations." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="p-5 rounded-2xl border border-border bg-card">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <p className="font-bold text-sm text-foreground mb-1">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="p-8 rounded-3xl bg-primary/10 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-foreground">Ready to ace your semester?</h3>
          <p className="text-muted-foreground text-sm mt-1">Join NMU students already using Hulinks to study smarter.</p>
        </div>
        {!isPremium && (
          <p className="shrink-0 text-sm text-muted-foreground">Choose a plan above to get started.</p>
        )}
      </div>
    </div>
  );
}
