import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, FileText, Calculator,
  Crown, LogOut, Menu, BrainCircuit, History, Sparkles, TimerIcon, Upload,
  Presentation, Volume2, Bot, LibraryBig
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/study-buddy", label: "Study Buddy", icon: Bot },
  { href: "/quizzes", label: "Exams & Quizzes", icon: BrainCircuit },
  { href: "/exam-predictor", label: "Exam Predictor", icon: Sparkles },
  { href: "/mock-exam", label: "Mock Exam", icon: TimerIcon },
  { href: "/exam-history", label: "My Exam History", icon: History },
  { href: "/study-uploads", label: "Notes & QP Generator", icon: Upload },
  { href: "/presentation-analyzer", label: "Presentation Analyzer", icon: Presentation },
  { href: "/voice-explainer", label: "Voice Explainer", icon: Volume2 },
  { href: "/research", label: "Research Engine", icon: LibraryBig },
  { href: "/assignments", label: "Assignments", icon: FileText },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/premium", label: "Premium Pack", icon: Crown, premium: true },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const trialActive = (user as any)?.trialActive;
  const trialDaysLeft = (user as any)?.trialDaysLeft ?? 0;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex flex-col gap-0.5 w-full">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
              isActive
                ? "bg-primary text-primary-foreground font-semibold shadow-md"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="text-sm">{item.label}</span>
            {item.premium && !isActive && (
              <Crown className="w-3 h-3 ml-auto text-primary" />
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-sm">H</span>
          </div>
          <div>
            <span className="font-bold text-base text-foreground leading-none block">NMU HUB | HUlinks</span>
            <span className="text-[9px] text-primary/70 font-medium leading-none">Powered by Students For Students</span>
          </div>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-6 flex flex-col bg-card border-border">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">H</span>
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">NMU HUB | HUlinks</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Study Platform</p>
              </div>
            </div>
            <NavLinks />
            <div className="mt-auto pt-6 border-t border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {user?.name?.[0]?.toUpperCase() || "S"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{user?.name?.split(" ")[0] || "Student"}</p>
                  <p className="text-xs text-muted-foreground">{(user as any)?.tier === "premium" ? "Premium" : trialActive ? `Trial (${trialDaysLeft}d left)` : "Free"}</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 bg-card border-r border-border px-4 py-6 z-40">
        <div className="flex items-center gap-3 mb-7 px-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold">H</span>
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground leading-none">NMU HUB</h1>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">HUlinks Platform</span>
            <p className="text-[9px] text-primary/70 font-medium mt-0.5 leading-none">Powered by Students For Students</p>
          </div>
        </div>

        <NavLinks />

        {trialActive && (
          <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs font-bold text-primary">Free Trial Active</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining</p>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {user?.name?.[0]?.toUpperCase() || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{user?.name || "Student"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.studentNumber || ""}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2" onClick={() => logout()}>
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
