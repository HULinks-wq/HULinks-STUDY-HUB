import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { XCircle, ArrowLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PaymentCancel() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="border-border bg-card rounded-3xl shadow-2xl">
          <CardContent className="p-10 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-muted border-2 border-border flex items-center justify-center">
              <XCircle className="w-10 h-10 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Payment Cancelled</h1>
              <p className="text-muted-foreground">
                No worries — your payment was cancelled and you have not been charged.
                You can upgrade to Premium at any time.
              </p>
            </div>

            <div className="w-full p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Crown className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-foreground font-medium">
                Premium unlocks all AI study tools with no limits
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                onClick={() => navigate("/premium")}
                data-testid="button-try-again"
              >
                <Crown className="w-4 h-4" />
                Try Again — View Plans
              </Button>
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => navigate("/dashboard")}
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
