import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useAssignments, useCreateAssignment, useGenerateFeedback } from "@/hooks/use-assignments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Sparkles, CheckCircle2, AlertCircle, BookOpen, LayoutList, LibraryBig } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUploadZone } from "@/components/FileUploadZone";

export function Assignments() {
  const { data: assignments, isLoading } = useAssignments();
  const createAssignment = useCreateAssignment();
  const generateFeedback = useGenerateFeedback();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createAssignment.mutate({ title, content }, {
      onSuccess: (newAssignment) => {
        setActiveAssignmentId(newAssignment.id);
        toast({ title: "Assignment saved — generating feedback..." });
        generateFeedback.mutate(newAssignment.id);
        setTitle("");
        setContent("");
      },
      onError: (err) => {
        toast({ title: "Failed to save", description: err.message, variant: "destructive" });
      }
    });
  };

  const activeAssignment = assignments?.find(a => a.id === activeAssignmentId);
  const isGenerating = createAssignment.isPending || generateFeedback.isPending;

  const feedbackSections = activeAssignment?.feedback
    ? [
        { key: "structure", label: "Structure", icon: LayoutList, color: "text-blue-600 bg-blue-50 border-blue-100" },
        { key: "grammar", label: "Grammar & Clarity", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
        { key: "referencing", label: "Referencing", icon: BookOpen, color: "text-purple-600 bg-purple-50 border-purple-100" },
        { key: "plagiarism", label: "Plagiarism & Formatting", icon: AlertCircle, color: "text-amber-600 bg-amber-50 border-amber-100" },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-96px)] flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignment Assistant</h1>
          <p className="text-muted-foreground mt-1">AI feedback on structure, grammar, referencing, and formatting — no direct answers given.</p>
        </div>
        <Link href="/research">
          <Button variant="outline" className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 shrink-0" data-testid="button-find-sources">
            <LibraryBig className="w-4 h-4" /> Find Sources
          </Button>
        </Link>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <Card className="flex flex-col p-6 rounded-3xl border-zinc-200 shadow-sm overflow-hidden bg-white">
          <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">
            <FileUploadZone
              compact
              hint="Upload your assignment draft, notes, or any file to load content"
              onTextExtracted={(text) => setContent(prev => prev ? prev + "\n\n" + text : text)}
            />
            <Input
              placeholder="Assignment title (e.g. Research Essay Draft)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
              required
              data-testid="input-assignment-title"
            />
            <textarea
              className="flex-1 w-full resize-none outline-none text-sm text-zinc-700 leading-relaxed placeholder:text-zinc-400"
              placeholder="Paste or type your assignment text here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              data-testid="input-assignment-content"
            />
            <div className="pt-4 border-t flex justify-end">
              <Button type="submit" className="rounded-full px-8 gap-2 shadow-md" disabled={isGenerating} data-testid="button-analyze">
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing...</>
                  : <><Sparkles className="w-4 h-4" />Analyse Assignment</>}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="flex flex-col p-6 rounded-3xl border-zinc-200 shadow-sm overflow-y-auto bg-zinc-50/30">
          {!activeAssignmentId ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400">
              <FileText className="w-12 h-12 mb-4" />
              <p className="font-medium text-base">Submit your text to see AI feedback</p>
              <p className="text-sm mt-1">Structure · Grammar · Referencing · Plagiarism check</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg text-zinc-900">AI Feedback</h3>
              </div>

              {generateFeedback.isPending ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-zinc-200 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : activeAssignment?.feedback ? (
                <div className="space-y-4">
                  {feedbackSections.map(({ key, label, icon: Icon, color }) => {
                    const value = (activeAssignment.feedback as any)[key];
                    if (!value) return null;
                    return (
                      <div key={key} className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm" data-testid={`feedback-${key}`}>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold mb-3 ${color}`}>
                          <Icon className="w-3 h-3" />
                          {label}
                        </div>
                        <p className="text-sm text-zinc-700 leading-relaxed">{value}</p>
                      </div>
                    );
                  })}

                  {(activeAssignment.feedback as any).overall && (
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
                      <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Overall Summary</p>
                      <p className="text-sm text-zinc-700 leading-relaxed">{(activeAssignment.feedback as any).overall}</p>
                    </div>
                  )}

                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-800">Your assignment has been saved. You can review past submissions in the history below.</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Feedback unavailable. Please try again.</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {!isLoading && assignments && assignments.length > 0 && (
        <div className="shrink-0">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Past Submissions</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {assignments.slice(0, 8).map(a => (
              <button
                key={a.id}
                onClick={() => setActiveAssignmentId(a.id)}
                className={`shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  activeAssignmentId === a.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                }`}
                data-testid={`button-past-assignment-${a.id}`}
              >
                {a.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
