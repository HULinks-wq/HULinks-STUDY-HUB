import { useRef, useState, useCallback, useEffect } from "react";
import { Upload, X, FileText, Image, File, Loader2, CheckCircle2, ClipboardPaste, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onTextExtracted: (text: string, files: File[]) => void;
  className?: string;
  label?: string;
  hint?: string;
  compact?: boolean;
}

function fileIcon(file: File) {
  if (file.type.startsWith("image/")) return Image;
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) return FileText;
  return File;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadZone({ onTextExtracted, className, label, hint, compact = false }: FileUploadZoneProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const extractingRef = useRef(false);

  const doExtract = useCallback(async (filesToExtract: File[]) => {
    if (filesToExtract.length === 0 || extractingRef.current) return;
    extractingRef.current = true;
    setExtracting(true);
    setDone(false);
    setError(null);
    try {
      const formData = new FormData();
      filesToExtract.forEach(f => formData.append("files", f));
      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Could not read file" }));
        throw new Error(err.message || "Could not read file");
      }
      const { text, count, totalChars } = await res.json();
      setDone(true);
      onTextExtracted(text, filesToExtract);
      toast({
        title: `${count} file${count !== 1 ? "s" : ""} read successfully`,
        description: `${totalChars.toLocaleString()} characters loaded`,
      });
    } catch (e: any) {
      setError(e.message || "Failed to read file");
      toast({ title: "Could not read file", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
      extractingRef.current = false;
    }
  }, [onTextExtracted, toast]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const fresh = arr.filter(f => !existing.has(f.name + f.size));
      const next = [...prev, ...fresh];
      if (fresh.length > 0) {
        setDone(false);
        setError(null);
        setTimeout(() => doExtract(next), 0);
      }
      return next;
    });
  }, [doExtract]);

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setDone(false);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const fileItems: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) fileItems.push(f);
      }
    }

    if (fileItems.length > 0) {
      e.preventDefault();
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 600);
      addFiles(fileItems);
      return;
    }

    const textItem = Array.from(items).find(i => i.kind === "string" && i.type === "text/plain");
    if (textItem) {
      textItem.getAsString((text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        e.preventDefault();
        setPasteFlash(true);
        setTimeout(() => setPasteFlash(false), 600);
        setDone(true);
        onTextExtracted(trimmed, []);
        toast({ title: "Text pasted", description: `${trimmed.length.toLocaleString()} characters loaded.` });
      });
    }
  }, [addFiles, onTextExtracted, toast]);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    zone.addEventListener("paste", handlePaste);
    return () => zone.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const isEmpty = files.length === 0 && !done;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}

      {isEmpty ? (
        <div
          ref={zoneRef}
          tabIndex={0}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            compact ? "p-3" : "p-6",
            pasteFlash
              ? "border-primary bg-primary/10 scale-[0.99]"
              : dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-secondary/50"
          )}
          data-testid="upload-zone-droparea"
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
            data-testid="input-file-upload"
          />
          <div className={cn("flex items-center gap-3 text-center", compact ? "justify-start" : "flex-col justify-center py-2")}>
            <div className={cn("rounded-xl bg-primary/10 flex items-center justify-center shrink-0", compact ? "w-8 h-8" : "w-10 h-10")}>
              {pasteFlash ? <ClipboardPaste className={cn("text-primary", compact ? "w-4 h-4" : "w-5 h-5")} /> : <Upload className={cn("text-primary", compact ? "w-4 h-4" : "w-5 h-5")} />}
            </div>
            <div className={compact ? "text-left" : ""}>
              <p className="text-sm font-medium text-foreground">
                {compact ? (
                  <>Drop, <span className="text-primary underline underline-offset-2 cursor-pointer">browse</span>, or <span className="text-primary underline underline-offset-2 cursor-pointer" onClick={e => { e.stopPropagation(); zoneRef.current?.focus(); }} data-testid="button-paste-zone">paste</span> a file</>
                ) : (
                  <>Drop files, <span className="text-primary underline underline-offset-2">browse</span>{", or "}<span className="text-primary underline underline-offset-2 cursor-pointer" onClick={e => { e.stopPropagation(); zoneRef.current?.focus(); }} data-testid="button-paste-zone">paste</span>{" here"}</>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hint || "PDF, images, Word (.docx), text, CSV — reads automatically"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={zoneRef}
          className={cn(
            "rounded-2xl border transition-all",
            done ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20" :
            error ? "border-red-300 bg-red-50/50 dark:bg-red-950/20" :
            "border-primary/30 bg-primary/5"
          )}
          data-testid="upload-zone-droparea"
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
            data-testid="input-file-upload"
          />
          <div className="px-3 py-2.5 flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
              done ? "bg-emerald-500/15" : error ? "bg-red-500/15" : "bg-primary/15"
            )}>
              {extracting ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : error ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : (
                <FileText className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {extracting ? (
                <>
                  <p className="text-xs font-semibold text-primary">Reading {files.length} file{files.length !== 1 ? "s" : ""}…</p>
                  <p className="text-[11px] text-muted-foreground truncate">{files.map(f => f.name).join(", ")}</p>
                </>
              ) : done ? (
                <>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Content loaded</p>
                  <p className="text-[11px] text-muted-foreground truncate">{files.map(f => f.name).join(", ")}</p>
                </>
              ) : error ? (
                <>
                  <p className="text-xs font-semibold text-red-600">{error}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{files.map(f => f.name).join(", ")}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground truncate">{files.map(f => f.name).join(", ")}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {error && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); doExtract(files); }}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-100 transition-all"
                  data-testid="button-retry-extract"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              )}
              {!extracting && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="text-[11px] font-medium text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/10 transition-all"
                  data-testid="button-change-file"
                >
                  Change
                </button>
              )}
              {!extracting && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFiles([]); setDone(false); setError(null); }}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground"
                  data-testid="button-clear-files"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
