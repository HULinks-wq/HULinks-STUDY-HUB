import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, Crown, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PaymentSuccess() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    const timer = setTimeout(() => navigate("/dashboard"), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="border-emerald-500/30 bg-card rounded-3xl shadow-2xl">
          <CardContent className="p-10 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
              <p className="text-muted-foreground">
                Welcome to Hulinks Premium. You now have unlimited access to all study tools.
              </p>
            </div>
            <div className="w-full p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Crown className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-foreground font-medium">
                Premium access is now active on your account
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Redirecting to dashboard in a few seconds…
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              onClick={() => navigate("/dashboard")}
              data-testid="button-go-dashboard"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
