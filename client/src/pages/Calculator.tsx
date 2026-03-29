import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSolveEquation, useCalculatorHistory, useSolveFromFile } from "@/hooks/use-calculator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calculator as CalcIcon, Loader2, ChevronRight, Upload,
  ImageIcon, FileText, X, Keyboard, Sparkles, Copy, Check,
  BookOpen, ChevronDown, ChevronUp, Paperclip, Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED = ".jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf,.txt,.md,.docx";

const FILE_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  image: { label: "Image", color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
  pdf:   { label: "PDF",   color: "text-red-600",  bg: "bg-red-50 border-red-100"   },
  text:  { label: "Text",  color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
};

function fileCategory(f: File) {
  if (f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name)) return "image";
  if (f.type === "application/pdf" || f.name.endsWith(".pdf")) return "pdf";
  return "text";
}

function FileChip({ file, onRemove }: { file: File; preview?: string; onRemove: () => void }) {
  const cat = fileCategory(file);
  const cfg = FILE_TYPE_CONFIG[cat];
  return (
    <div className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cat === "image" ? <ImageIcon className="w-3.5 h-3.5 shrink-0" /> : <FileText className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate max-w-[120px]">{file.name}</span>
      <span className="text-[10px] opacity-60 shrink-0">{(file.size / 1024).toFixed(0)}KB</span>
      <button
        type="button"
        onClick={onRemove}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 transition-all shrink-0"
        data-testid={`remove-file-${file.name}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

function ImagePreviewGrid({ files, previews, onRemove }: { files: File[]; previews: Map<string, string>; onRemove: (i: number) => void }) {
  const images = files.map((f, i) => ({ f, i, preview: previews.get(f.name) })).filter(x => x.preview);
  if (images.length === 0) return null;
  return (
    <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {images.map(({ f, i, preview }) => (
        <div key={i} className="relative rounded-xl overflow-hidden bg-zinc-100 aspect-video">
          <img src={preview} alt={f.name} className="w-full h-full object-cover" />
          <button
            onClick={() => onRemove(i)}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all"
            data-testid={`remove-img-${i}`}
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full truncate max-w-[80%]">{f.name}</div>
        </div>
      ))}
    </div>
  );
}

function StepItem({ step, index }: { step: string; index: number }) {
  const isHeader = /^(step\s*\d+|part\s+[a-z]|sub-?question)/i.test(step);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex gap-4 items-start"
      data-testid={`step-${index}`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm ${isHeader ? "bg-primary text-white" : "bg-zinc-100 text-zinc-600"}`}>
        {isHeader ? "★" : index + 1}
      </div>
      <div className="flex-1 pt-1">
        <p className={`text-sm leading-relaxed font-mono ${isHeader ? "font-bold text-zinc-900" : "text-zinc-700"}`}>{step}</p>
      </div>
    </motion.div>
  );
}

export function Calculator() {
  const [mode, setMode] = useState<"type" | "upload">("type");
  const [equation, setEquation] = useState("");
  const [uploadPrompt, setUploadPrompt] = useState("");
  const [activeLog, setActiveLog] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [copied, setCopied] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const solveMutation = useSolveEquation();
  const fileMutation = useSolveFromFile();
  const { data: history } = useCalculatorHistory();
  const { toast } = useToast();

  const isPending = solveMutation.isPending || fileMutation.isPending;

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...arr.filter(f => !existing.has(f.name + f.size))];
    });
    const newPreviews = new Map(previews);
    arr.forEach(f => {
      if (f.type.startsWith("image/") && !newPreviews.has(f.name)) {
        newPreviews.set(f.name, URL.createObjectURL(f));
      }
    });
    setPreviews(newPreviews);
  }, [previews]);

  const removeFile = (index: number) => {
    setFiles(prev => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (previews.has(removed.name)) {
        URL.revokeObjectURL(previews.get(removed.name)!);
        const p = new Map(previews);
        p.delete(removed.name);
        setPreviews(p);
      }
      return next;
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onSuccess = (log: any) => {
    setActiveLog(log);
    setFiles([]);
    setPreviews(new Map());
    setEquation("");
    setUploadPrompt("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSolveText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equation.trim()) return;
    solveMutation.mutate({ equation }, {
      onSuccess,
      onError: (err) => toast({ title: "Failed to solve", description: err.message, variant: "destructive" }),
    });
  };

  const handleSolveFile = () => {
    if (files.length === 0 && !uploadPrompt.trim()) {
      toast({ title: "Nothing to solve", description: "Upload at least one file or type an instruction.", variant: "destructive" });
      return;
    }
    fileMutation.mutate({ files, prompt: uploadPrompt }, {
      onSuccess,
      onError: (err) => toast({ title: "Failed to process", description: err.message, variant: "destructive" }),
    });
  };

  const copyResult = () => {
    if (!activeLog?.solution) return;
    const { problem, steps, finalAnswer } = activeLog.solution;
    const text = [`Problem: ${problem}`, "", "Working:", ...(steps || []).map((s: string, i: number) => `${i + 1}. ${s}`), "", `Final Answer: ${finalAnswer}`].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const solution = activeLog?.solution;
  const hasFiles = files.length > 0;
  const nonImageFiles = files.filter(f => fileCategory(f) !== "image");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Step-by-Step Calculator</h1>
        <p className="text-muted-foreground mt-1">Type a problem, upload photos/files, or combine both for a complete solution.</p>
      </div>

      <Card className="rounded-3xl border-zinc-200 shadow-sm bg-white overflow-hidden">
        <div className="flex border-b border-zinc-100">
          {[
            { key: "type",   Icon: Keyboard, label: "Type Problem" },
            { key: "upload", Icon: Paperclip, label: "Upload Files" },
          ].map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setMode(key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 ${
                mode === key ? "border-primary text-primary bg-primary/5" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
              }`}
              data-testid={`tab-${key}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          <AnimatePresence mode="wait">
            {mode === "type" ? (
              <motion.form key="type" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} onSubmit={handleSolveText} className="space-y-4">
                <div className="relative">
                  <textarea
                    className="w-full min-h-[130px] p-4 pr-12 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm text-zinc-900 placeholder:text-zinc-400 font-mono leading-relaxed bg-zinc-50"
                    placeholder={"Type any maths or physics problem, e.g.:\n• Solve for x: 2x² + 5x - 3 = 0\n• Find velocity if F = 10N, m = 2kg, a = ?\n• Integrate ∫(x² + 3x) dx from 0 to 5\n• A ball is thrown at 20 m/s at 45°. Find the range."}
                    value={equation}
                    onChange={(e) => setEquation(e.target.value)}
                    required
                    data-testid="input-equation"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {["Solve 2x + 5 = 17", "Integrate x² from 0 to 3", "Derivative of sin(x)·eˣ", "F = ma, find a if F=50N m=5kg", "Simplify (3x²+6x)/3x"].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setEquation(ex)}
                      className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" className="rounded-full px-8 gap-2 shadow-md h-11" disabled={isPending} data-testid="button-solve">
                    {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Solving...</> : <><Sparkles className="w-4 h-4" />Solve Step-by-Step</>}
                  </Button>
                </div>
              </motion.form>
            ) : (
              <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : hasFiles ? "border-zinc-200 bg-white" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"} ${hasFiles ? "p-4" : "p-8"}`}
                  data-testid="dropzone-file"
                >
                  {!hasFiles ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
                        <Upload className="w-7 h-7 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-700">Drop files here or click to browse</p>
                        <p className="text-xs text-zinc-400 mt-1">Upload multiple photos, PDFs, or text files at once — up to 10 files, 15MB each</p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-center">
                        {[
                          { label: "📸 Photo (JPG/PNG/WEBP)", color: "bg-blue-50 text-blue-600 border-blue-100" },
                          { label: "📄 PDF",                   color: "bg-red-50 text-red-600 border-red-100"   },
                          { label: "📝 Text / Word (.docx)",   color: "bg-amber-50 text-amber-600 border-amber-100" },
                        ].map(({ label, color }) => (
                          <span key={label} className={`text-xs px-3 py-1 rounded-full border font-medium ${color}`}>{label}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <ImagePreviewGrid files={files} previews={previews} onRemove={removeFile} />
                      {nonImageFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {nonImageFiles.map((f, i) => (
                            <FileChip key={f.name} file={f} onRemove={() => removeFile(files.indexOf(f))} />
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="flex items-center gap-2 text-xs text-primary hover:underline font-medium"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Add more files
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    className="w-full min-h-[100px] p-4 pr-12 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm text-zinc-900 placeholder:text-zinc-400 leading-relaxed bg-zinc-50"
                    placeholder={"Tell me exactly what to calculate, e.g.:\n\u2022 'Solve question 3 in the image'\n\u2022 'Calculate the kinetic energy from the values in the photo'\n\u2022 'Find the integral shown on page 2 of the PDF'"}
                    value={uploadPrompt}
                    onChange={(e) => setUploadPrompt(e.target.value)}
                    data-testid="input-upload-prompt"
                  />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                  data-testid="input-file"
                />

                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Works with textbook photos, exam papers, handwritten notes, and PDFs
                  </p>
                  <Button
                    onClick={handleSolveFile}
                    disabled={isPending}
                    className="rounded-full px-8 gap-2 shadow-md h-11 shrink-0"
                    data-testid="button-solve-file"
                  >
                    {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing...</> : <><Send className="w-4 h-4" />Solve</>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      <AnimatePresence>
        {isPending && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-6 rounded-3xl border-zinc-200 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 text-sm">Working through your problem…</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Reading content, identifying the problem, and building a full solution</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "5%" }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 12, ease: "easeInOut" }}
                />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {solution && !isPending && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="rounded-3xl border-zinc-200 shadow-sm bg-white overflow-hidden" data-testid="card-solution">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 text-sm">Solution</p>
                    {solution.topic && (
                      <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{solution.topic}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={copyResult}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-all px-3 py-1.5 rounded-lg hover:bg-zinc-100"
                  data-testid="button-copy"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Copied!</span></> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                </button>
              </div>

              {solution.problem && (
                <div className="mx-6 mt-5 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Problem</p>
                  <p className="text-sm font-mono text-zinc-800 leading-relaxed">{solution.problem}</p>
                </div>
              )}

              {solution.steps && solution.steps.length > 0 && (
                <div className="px-6 mt-5 mb-5 space-y-4">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Working</p>
                  <div className="space-y-3 border-l-2 border-zinc-100 pl-4">
                    {solution.steps.map((step: string, i: number) => (
                      <StepItem key={i} step={step} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {solution.finalAnswer && (
                <div className="mx-6 mb-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Final Answer</p>
                  <p className="text-xl font-bold font-mono text-emerald-900 leading-snug" data-testid="text-final-answer">{solution.finalAnswer}</p>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {history && history.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryExpanded(v => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3 hover:text-zinc-700 transition-all"
          >
            Recent Problems ({history.length})
            {historyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {historyExpanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                {history.slice(0, 10).map((log: any) => (
                  <button
                    key={log.id}
                    onClick={() => { setActiveLog(log); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                      activeLog?.id === log.id ? "border-primary bg-primary/5" : "border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm"
                    }`}
                    data-testid={`button-history-${log.id}`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                      <CalcIcon className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-700 truncate">{log.equation}</p>
                      {log.solution?.topic && <p className="text-xs text-zinc-400 mt-0.5">{log.solution.topic}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
