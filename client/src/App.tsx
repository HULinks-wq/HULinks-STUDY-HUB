import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { Layout } from "@/components/Layout";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Landing } from "@/pages/Landing";
import { Dashboard } from "@/pages/Dashboard";
import { Quizzes } from "@/pages/Quizzes";
import { QuizSession } from "@/pages/QuizSession";
import { Assignments } from "@/pages/Assignments";
import { Calculator } from "@/pages/Calculator";
import { Premium } from "@/pages/Premium";
import { ExamPredictor } from "@/pages/ExamPredictor";
import { MockExam } from "@/pages/MockExam";
import { ExamHistory } from "@/pages/ExamHistory";
import { StudyUploads } from "@/pages/StudyUploads";
import { PresentationAnalyzer } from "@/pages/PresentationAnalyzer";
import { VoiceExplainer } from "@/pages/VoiceExplainer";
import { StudyBuddy } from "@/pages/StudyBuddy";
import { Research } from "@/pages/Research";
import { PaymentSuccess } from "@/pages/PaymentSuccess";
import { PaymentCancel } from "@/pages/PaymentCancel";

function ProtectedRoutes() {
  return (
    <Layout>
      <OnboardingModal />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/quizzes" component={Quizzes} />
        <Route path="/quizzes/:id" component={QuizSession} />
        <Route path="/assignments" component={Assignments} />
        <Route path="/calculator" component={Calculator} />
        <Route path="/premium" component={Premium} />
        <Route path="/exam-predictor" component={ExamPredictor} />
        <Route path="/mock-exam" component={MockExam} />
        <Route path="/exam-history" component={ExamHistory} />
        <Route path="/study-uploads" component={StudyUploads} />
        <Route path="/presentation-analyzer" component={PresentationAnalyzer} />
        <Route path="/voice-explainer" component={VoiceExplainer} />
        <Route path="/study-buddy" component={StudyBuddy} />
        <Route path="/research" component={Research} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/payment-cancel" component={PaymentCancel} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function MainRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl animate-bounce mb-6">
          <span className="text-primary-foreground font-bold text-2xl">H</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return <ProtectedRoutes />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <ErrorBoundary>
            <MainRouter />
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
