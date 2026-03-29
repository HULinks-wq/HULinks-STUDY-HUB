import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Trash2, Loader2, CheckCircle2,
  FolderOpen, Sparkles, Shield, FileQuestion,
  Copy, CheckCheck, ClipboardList, Scroll, BookOpen,
  BookMarked, LayoutList, PenLine, Save, Hash
} from "lucide-react";
import { FileUploadZone } from "@/components/FileUploadZone";

type UploadRecord = {
  id: number; userId: string; module: string; topic?: string;
  filename: string; fileSize?: number; quizzesGenerated?: number; createdAt: string;
};

type QPSection = {
  label: string; title: string; marks: number;
  questions: Array<{ number: number; marks: number; question: string; options?: string[]; memo: string }>;
};

type QPResult = {
  title: string; duration: string; totalMarks: number;
  instructions: string; sections: QPSection[];
};

const COURSES = [
  "Computer Science 101", "Calculus I", "Physics 101",
  "Information Technology", "Mathematics", "Engineering",
  "Business Management", "Accounting", "Law", "Education",
  "Economics", "Statistics", "Chemistry", "Biology", "Other",
];

const EXAM_TYPES = [
  "Semester Test 1", "Semester Test 2", "Supplementary Exam",
  "Year-End Exam", "Assignment", "Class Test", "Mini Exam",
];

const DURATIONS = ["30 minutes", "1 hour", "1.5 hours", "2 hours", "2.5 hours", "3 hours"];

const QUESTION_COUNTS = ["10", "20", "30", "50", "75", "100"];

const FORMATS = [
  { value: "mixed", label: "Mixed (MCQ + Short + Essay)" },
  { value: "mcq", label: "Multiple Choice Only" },
  { value: "short", label: "Short Answer Only" },
  { value: "essay", label: "Essay / Long Answer Only" },
];

const SUMMARY_TYPES = [
  { value: "topics", label: "By Topics", icon: LayoutList, desc: "Breaks content into key topics with bullet points" },
  { value: "chapters", label: "By Chapters", icon: BookMarked, desc: "Organises into chapter summaries with overviews" },
  { value: "other", label: "Custom / Other", icon: PenLine, desc: "Describe exactly how you want it summarised" },
];

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SummaryOutput({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const lines = text.split("\n");

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-foreground">AI Summary</span>
        </div>
        <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 rounded-xl text-xs h-8" data-testid="button-copy-summary">
          {copied ? <><CheckCheck className="w-3.5 h-3.5 text-emerald-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
        </Button>
      </div>
      <Card className="border-border bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <div className="space-y-1 text-sm leading-relaxed text-foreground">
            {lines.map((line, i) => {
              if (line.startsWith("## ")) {
                return (
                  <p key={i} className="font-bold text-primary text-base mt-4 first:mt-0 pb-1 border-b border-border">
                    {line.replace(/^## /, "")}
                  </p>
                );
              }
              if (line.startsWith("# ")) {
                return (
                  <p key={i} className="font-bold text-foreground text-lg mt-4 first:mt-0">
                    {line.replace(/^# /, "")}
                  </p>
                );
              }
              if (line.startsWith("- ") || line.startsWith("• ")) {
                const content = line.replace(/^[-•] /, "");
                return (
                  <p key={i} className="flex items-start gap-2 text-foreground pl-2">
                    <span className="text-primary mt-1.5 shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
                  </p>
                );
              }
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return (
                <p key={i} className="text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>") }} />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function NotesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [extractedText, setExtractedText] = useState("");
  const [extractedFilename, setExtractedFilename] = useState("Uploaded Content");
  const [summaryType, setSummaryType] = useState<"topics" | "chapters" | "other">("topics");
  const [customType, setCustomType] = useState("");
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);

  const [saveModule, setSaveModule] = useState("");
  const [saveTopic, setSaveTopic] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: uploads, isLoading: uploadsLoading } = useQuery<UploadRecord[]>({
    queryKey: ["/api/uploads"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/uploads/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      toast({ title: "Notes removed" });
    },
    onError: () => toast({ title: "Failed to delete notes", variant: "destructive" }),
    onSettled: () => setDeletingId(null),
  });

  const handleExtracted = (text: string, files: File[]) => {
    setExtractedText(text);
    if (files.length > 0) setExtractedFilename(files[0].name);
    setSummary("");
  };

  const handleSummarize = async () => {
    if (!extractedText) return toast({ title: "Load content first", variant: "destructive" });
    if (summaryType === "other" && !customType.trim()) {
      return toast({ title: "Describe your summary type", description: "Tell us how you want the content summarised.", variant: "destructive" });
    }
    setSummarizing(true);
    setSummary("");
    try {
      const res = await fetch("/api/uploads/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: extractedText, summaryType, customType }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Failed");
      }
      const data = await res.json();
      setSummary(data.summary);
    } catch (e: any) {
      toast({ title: "Summarisation failed", description: e.message, variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedText) return toast({ title: "Load content first", variant: "destructive" });
    if (!saveModule) return toast({ title: "Select a module", variant: "destructive" });
    setSaving(true);
    try {
      const res = await fetch("/api/uploads/save-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: extractedText, module: saveModule, topic: saveTopic || undefined, filename: extractedFilename }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      toast({ title: "Notes saved!", description: "Your notes are now available for quiz generation." });
      setSaveModule("");
      setSaveTopic("");
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          <p className="font-bold text-primary mb-1">Your content stays inside Hulinks</p>
          <p className="text-muted-foreground leading-relaxed">Uploaded material is only used within the platform to generate summaries and quizzes. It cannot be shared or downloaded externally.</p>
        </div>
      </div>

      <Card className="border-border bg-card rounded-2xl">
        <CardContent className="p-6 space-y-5">
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">Upload or paste your notes</Label>
            <FileUploadZone
              onTextExtracted={handleExtracted}
              label="Drop files, browse, or paste here"
              hint="PDF, Word, images, TXT — any format · Ctrl+V to paste text"
              data-testid="zone-notes-upload"
            />
          </div>

          {extractedText && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{extractedFilename}</p>
                <p className="text-xs text-muted-foreground">{extractedText.length.toLocaleString()} characters loaded</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 rounded-lg shrink-0"
                onClick={() => { setExtractedText(""); setSummary(""); }} data-testid="button-clear-content">
                Clear
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {extractedText && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="border-border bg-card rounded-2xl">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Summarise Content</h3>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2.5 block uppercase tracking-wide font-semibold">Summary Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SUMMARY_TYPES.map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      onClick={() => setSummaryType(value as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${summaryType === value ? "border-primary bg-primary/10" : "border-border hover:border-primary/30 hover:bg-secondary/50"}`}
                      data-testid={`button-summary-${value}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 shrink-0 ${summaryType === value ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-semibold ${summaryType === value ? "text-primary" : "text-foreground"}`}>{label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {summaryType === "other" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <Label className="text-sm mb-2 block">Describe what you want <span className="text-red-400">*</span></Label>
                    <Textarea
                      value={customType}
                      onChange={e => setCustomType(e.target.value)}
                      placeholder="e.g. Key definitions only, Exam revision notes, Mind map style, Timeline of events..."
                      className="rounded-xl bg-input border-border resize-none h-20 text-sm"
                      data-testid="input-custom-summary-type"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Button onClick={handleSummarize} disabled={summarizing || !extractedText}
                className="w-full h-11 gap-2 font-semibold rounded-2xl shadow-md" data-testid="button-summarize">
                {summarizing
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Summarising...</>
                  : <><Sparkles className="w-4 h-4" />Generate Summary</>}
              </Button>

              {summarizing && (
                <div className="flex items-center justify-center gap-3 py-6 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground text-sm">Generating summary...</p>
                    <p className="text-xs text-muted-foreground">This may take 15–30 seconds</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {summary && <SummaryOutput text={summary} />}

          <Card className="border-border bg-card rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-foreground">Save for Quiz Generation</h3>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Save this content so the AI can use it when generating quizzes for a specific module.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Module <span className="text-red-400">*</span></Label>
                  <Select value={saveModule} onValueChange={setSaveModule}>
                    <SelectTrigger className="h-11 bg-input border-border rounded-xl" data-testid="select-save-module">
                      <SelectValue placeholder="Select module..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Topic <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input placeholder="e.g. Chapter 3, Data Structures"
                    value={saveTopic} onChange={e => setSaveTopic(e.target.value)}
                    className="h-11 bg-input border-border rounded-xl" data-testid="input-save-topic" />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving || !saveModule || !extractedText}
                variant="outline" className="w-full h-10 gap-2 rounded-2xl font-semibold" data-testid="button-save-notes">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Notes</>}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">My Saved Notes</h2>
          {uploads && uploads.length > 0 && (
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">{uploads.length} file{uploads.length !== 1 ? "s" : ""}</Badge>
          )}
        </div>

        {uploadsLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-secondary animate-pulse" />)}
          </div>
        ) : !uploads?.length ? (
          <div className="text-center py-10 rounded-2xl border-2 border-dashed border-border bg-card/50">
            <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium">No notes saved yet</p>
            <p className="text-xs text-muted-foreground mt-1">Upload notes above and save them for quiz generation</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {uploads.map((u, i) => (
                <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}>
                  <Card className="border-border bg-card rounded-2xl hover:border-primary/30 transition-all" data-testid={`card-upload-${u.id}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{u.filename}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{u.module}</span>
                            {u.topic && <span className="text-xs text-muted-foreground">· {u.topic}</span>}
                            <span className="text-xs text-muted-foreground">· {formatBytes(u.fileSize)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(u.quizzesGenerated || 0) > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-bold text-primary">{u.quizzesGenerated} quiz{(u.quizzesGenerated || 0) !== 1 ? "zes" : ""}</span>
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl w-8 h-8"
                          disabled={deletingId === u.id}
                          onClick={() => { setDeletingId(u.id); deleteMutation.mutate(u.id); }}
                          data-testid={`button-delete-upload-${u.id}`}>
                          {deletingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function QPDisplay({ qp }: { qp: QPResult }) {
  const [showMemo, setShowMemo] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    const lines: string[] = [
      `${qp.title}`,
      `Duration: ${qp.duration}  |  Total Marks: ${qp.totalMarks}`,
      "",
      "INSTRUCTIONS:",
      qp.instructions,
      "",
      ...qp.sections.flatMap(sec => [
        `─────────────────────────────────`,
        `${sec.label} — ${sec.title} [${sec.marks} marks]`,
        `─────────────────────────────────`,
        ...sec.questions.flatMap(q => [
          `Q${q.number}. (${q.marks} marks) ${q.question}`,
          ...(q.options || []).map(o => `   ${o}`),
          "",
        ]),
      ]),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-lg">Generated Question Paper</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyText} className="gap-2 rounded-xl text-xs" data-testid="button-copy-qp">
            {copied ? <><CheckCheck className="w-3.5 h-3.5 text-emerald-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy QP</>}
          </Button>
          <Button variant={showMemo ? "default" : "outline"} size="sm" onClick={() => setShowMemo(!showMemo)} className="gap-2 rounded-xl text-xs" data-testid="button-toggle-memo">
            <Scroll className="w-3.5 h-3.5" />{showMemo ? "Hide" : "Show"} Memo
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card rounded-2xl overflow-hidden">
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <p className="text-xs uppercase tracking-widest font-medium mb-1 opacity-75">Nelson Mandela University</p>
          <h2 className="text-xl font-bold leading-tight">{qp.title}</h2>
          <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
            <span>Duration: <strong>{qp.duration}</strong></span>
            <span>Total Marks: <strong>{qp.totalMarks}</strong></span>
          </div>
        </div>
        <CardContent className="p-6 space-y-6">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Instructions to Students</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{qp.instructions}</p>
          </div>

          {qp.sections?.map((sec, si) => (
            <div key={si}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-foreground">{sec.label}</h3>
                  <p className="text-xs text-muted-foreground">{sec.title} — {sec.marks} marks</p>
                </div>
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">{sec.marks} marks</Badge>
              </div>
              <div className="space-y-4">
                {sec.questions?.map((q, qi) => (
                  <div key={qi} className="p-4 rounded-xl border border-border bg-card/60" data-testid={`question-${si}-${qi}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground leading-relaxed">
                          <span className="font-bold text-primary mr-2">Q{q.number}.</span>{q.question}
                        </p>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-3 space-y-1.5 pl-4">
                            {q.options.map((opt, oi) => (
                              <p key={oi} className="text-sm text-muted-foreground">{opt}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge className="shrink-0 bg-primary/10 text-primary border-0 text-[10px]">
                        {q.marks} mark{q.marks !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {showMemo && (
                      <div className="mt-3 pt-3 border-t border-emerald-500/20 bg-emerald-500/5 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                        <p className="text-xs font-bold text-emerald-400 mb-1.5 uppercase tracking-wide">Memo</p>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {typeof q.memo === "string"
                            ? q.memo
                            : typeof q.memo === "object" && q.memo !== null
                              ? Object.entries(q.memo as Record<string, unknown>).map(([k, v]) =>
                                  `${k}: ${Array.isArray(v) ? (v as string[]).join(", ") : String(v)}`
                                ).join("\n")
                              : String(q.memo ?? "")}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QPGeneratorTab() {
  const { toast } = useToast();
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [qpText, setQpText] = useState("");
  const [form, setForm] = useState({ module: "", examType: "Semester Test 1", duration: "2 hours", questionCount: "30", format: "mixed" });
  const [result, setResult] = useState<QPResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExtracted = (text: string, files: File[]) => {
    setQpText(text);
    if (files.length > 0) setQpFile(files[0]);
  };

  const handleGenerate = async () => {
    if (!form.module) return toast({ title: "Enter a module name", variant: "destructive" });
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      if (qpFile) fd.append("file", qpFile);
      fd.append("module", form.module);
      fd.append("examType", form.examType);
      fd.append("duration", form.duration);
      fd.append("questionCount", form.questionCount);
      fd.append("format", form.format);

      const res = await fetch("/api/uploads/generate-qp", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
        <FileQuestion className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          <p className="font-bold text-primary mb-1">AI Question Paper + Memo Generator</p>
          <p className="text-muted-foreground leading-relaxed">Upload your learning outcomes or syllabus (optional), fill in the details, and get a complete NMU-style question paper with a marking memo in seconds.</p>
        </div>
      </div>

      <Card className="border-border bg-card rounded-2xl">
        <CardContent className="p-6 space-y-5">
          <div>
            <Label className="text-sm font-semibold text-foreground mb-2 block">
              Learning Outcomes / Syllabus <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <FileUploadZone
              onTextExtracted={handleExtracted}
              compact
              label="Drop or paste your syllabus / outcomes"
              hint="PDF, Word, image, TXT"
              data-testid="zone-qp-file"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-2 block">Module Name <span className="text-red-400">*</span></Label>
              <Input value={form.module} onChange={e => setForm({ ...form, module: e.target.value })}
                placeholder="e.g. Business Management 101"
                className="h-11 rounded-xl bg-input border-border"
                data-testid="input-qp-module" />
            </div>
            <div>
              <Label className="text-sm mb-2 block">Exam Type</Label>
              <Select value={form.examType} onValueChange={v => setForm({ ...form, examType: v })}>
                <SelectTrigger className="h-11 rounded-xl bg-input border-border" data-testid="select-qp-examtype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Duration</Label>
              <Select value={form.duration} onValueChange={v => setForm({ ...form, duration: v })}>
                <SelectTrigger className="h-11 rounded-xl bg-input border-border" data-testid="select-qp-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Number of Questions
              </Label>
              <Select value={form.questionCount} onValueChange={v => setForm({ ...form, questionCount: v })}>
                <SelectTrigger className="h-11 rounded-xl bg-input border-border" data-testid="select-qp-questioncount">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_COUNTS.map(n => <SelectItem key={n} value={n}>{n} questions</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Question Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setForm({ ...form, format: f.value })}
                  className={`p-3 rounded-xl border text-left transition-all text-sm ${form.format === f.value ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/30 hover:bg-secondary/50"}`}
                  data-testid={`button-format-${f.value}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading || !form.module} className="w-full h-12 gap-2 font-semibold rounded-2xl shadow-md" data-testid="button-generate-qp">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Generating paper...</> : <><ClipboardList className="w-5 h-5" />Generate Question Paper + Memo</>}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <p className="font-bold text-foreground">Generating your question paper...</p>
          <p className="text-sm text-muted-foreground">This may take 15–30 seconds. Sit tight!</p>
        </div>
      )}

      {result && <QPDisplay qp={result} />}
    </div>
  );
}

export function StudyUploads() {
  const [activeTab, setActiveTab] = useState<"notes" | "qp">("notes");

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notes & QP Generator</h1>
        <p className="text-muted-foreground mt-1">Summarise any content, upload notes for quizzes, or generate a full NMU question paper</p>
      </div>

      <div className="flex gap-2 p-1.5 bg-secondary rounded-2xl">
        {([
          { key: "notes", label: "My Notes", icon: FileText },
          { key: "qp", label: "QP Generator", icon: FileQuestion },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === key ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
            data-testid={`tab-${key}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "notes" ? (
          <motion.div key="notes" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <NotesTab />
          </motion.div>
        ) : (
          <motion.div key="qp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <QPGeneratorTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
