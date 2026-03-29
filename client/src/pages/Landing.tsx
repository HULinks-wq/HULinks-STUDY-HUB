import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BrainCircuit, FileText, Calculator, Loader2, Clock, Crown, Shield } from "lucide-react";

export function Landing() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loginForm, setLoginForm] = useState({ studentNumber: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", studentNumber: "", course: "", password: "", confirmPassword: "" });

  useEffect(() => {
    if (isAuthenticated) window.location.href = "/dashboard";
  }, [isAuthenticated]);

  const loginMutation = useMutation({
    mutationFn: async (data: typeof loginForm) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (user) => { queryClient.setQueryData(["/api/auth/user"], user); window.location.href = "/dashboard"; },
    onError: (err: any) => toast({ title: "Login failed", description: err.message, variant: "destructive" }),
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { name: string; studentNumber: string; course: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/signup", data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (user) => { queryClient.setQueryData(["/api/auth/user"], user); window.location.href = "/dashboard"; },
    onError: (err: any) => toast({ title: "Signup failed", description: err.message, variant: "destructive" }),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, studentNumber, course, password, confirmPassword } = signupForm;
    if (!name || !studentNumber || !course || !password) return toast({ title: "Please fill in all fields", variant: "destructive" });
    if (password !== confirmPassword) return toast({ title: "Passwords do not match", variant: "destructive" });
    if (password.length < 6) return toast({ title: "Password must be at least 6 characters", variant: "destructive" });
    signupMutation.mutate({ name, studentNumber, course, password });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-base">H</span>
          </div>
          <div>
            <span className="font-bold text-base text-foreground">NMU HUB</span>
            <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">HUlinks</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">No Replit account needed</span>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-5">
                <Clock className="w-3.5 h-3.5" />
                Every new student gets a FREE 2-day trial
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-foreground leading-tight">
                Study smarter.<br />
                <span className="text-primary">Score higher.</span>
              </h1>
              <p className="text-muted-foreground text-lg mt-4 leading-relaxed">
                AI-powered exam generation, assignment feedback, and step-by-step maths — built exclusively for NMU students.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BrainCircuit, label: "AI Exam Generator" },
                { icon: FileText, label: "Assignment Assistant" },
                { icon: Calculator, label: "Step-by-Step Solver" },
                { icon: Crown, label: "Quiz & Test Mode" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-foreground">Content Protection Enabled</p>
                <p className="text-xs text-muted-foreground mt-0.5">All generated content stays inside the platform. Exams and summaries cannot be exported or shared.</p>
              </div>
            </div>
          </motion.div>

          {/* Right: Auth Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <Card className="shadow-2xl border-border bg-card rounded-3xl">
              <CardHeader className="pb-0">
                <CardTitle className="text-xl text-foreground">NMU Student Portal</CardTitle>
                <CardDescription>Use your student number to log in or sign up</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                  <TabsList className="w-full mb-6 rounded-xl bg-secondary">
                    <TabsTrigger value="login" className="flex-1 rounded-lg" data-testid="tab-login">Log In</TabsTrigger>
                    <TabsTrigger value="signup" className="flex-1 rounded-lg" data-testid="tab-signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-foreground">Student Number</Label>
                        <Input placeholder="e.g. 219012345" value={loginForm.studentNumber}
                          onChange={(e) => setLoginForm({ ...loginForm, studentNumber: e.target.value })}
                          className="h-11 rounded-xl bg-input border-border text-foreground" data-testid="input-login-student-number" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-foreground">Password</Label>
                        <Input type="password" placeholder="Your password" value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          className="h-11 rounded-xl bg-input border-border text-foreground" data-testid="input-login-password" required />
                      </div>
                      <Button type="submit" className="w-full h-11 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 mt-2" disabled={loginMutation.isPending} data-testid="button-login">
                        {loginMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Logging in...</> : "Log In"}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">No account? <button type="button" onClick={() => setTab("signup")} className="text-primary font-medium underline">Sign up</button></p>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-foreground">Full Name</Label>
                        <Input placeholder="e.g. Sipho Dlamini" value={signupForm.name}
                          onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                          className="h-11 rounded-xl bg-input border-border text-foreground" data-testid="input-signup-name" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-foreground">Student Number</Label>
                        <Input placeholder="e.g. 219012345" value={signupForm.studentNumber}
                          onChange={(e) => setSignupForm({ ...signupForm, studentNumber: e.target.value })}
                          className="h-11 rounded-xl bg-input border-border text-foreground" data-testid="input-signup-student-number" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-foreground">Course / Faculty</Label>
                        <Select value={signupForm.course} onValueChange={(v) => setSignupForm({ ...signupForm, course: v })}>
                          <SelectTrigger className="h-11 rounded-xl bg-input border-border text-foreground" data-testid="select-signup-course">
                            <SelectValue placeholder="Select your course..." />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {["Computer Science","Information Technology","Mathematics","Physics","Engineering","Business Management","Accounting","Law","Education","Other"].map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-foreground">Password</Label>
                          <Input type="password" placeholder="Min. 6 chars" value={signupForm.password}
                            onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                            className="h-11 rounded-xl bg-input border-border text-foreground" data-testid="input-signup-password" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-foreground">Confirm</Label>
                          <Input type="password" placeholder="Repeat" value={signupForm.confirmPassword}
                            onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                            className="h-11 rounded-xl bg-input border-border text-foreground" data-testid="input-signup-confirm-password" required />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-11 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 mt-1" disabled={signupMutation.isPending} data-testid="button-signup">
                        {signupMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : "Create Account & Start Free Trial"}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">Already have an account? <button type="button" onClick={() => setTab("login")} className="text-primary font-medium underline">Log in</button></p>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © 2026 NMU HUB | HUlinks · Nelson Mandela University · Content is protected
      </footer>
    </div>
  );
}
