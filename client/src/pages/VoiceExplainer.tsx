import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Volume2, BookOpen, Sparkles, Play, Pause,
  RotateCcw, Lightbulb, ChevronRight, StopCircle, Globe,
  CheckCircle2, X
} from "lucide-react";

const LANGUAGES = [
  { value: "English", label: "English", flag: "🇿🇦" },
  { value: "Afrikaans", label: "Afrikaans", flag: "🇿🇦" },
  { value: "isiZulu", label: "isiZulu", flag: "🇿🇦" },
  { value: "isiXhosa", label: "isiXhosa", flag: "🇿🇦" },
  { value: "Sesotho", label: "Sesotho", flag: "🇿🇦" },
  { value: "Setswana", label: "Setswana", flag: "🇿🇦" },
  { value: "Portuguese", label: "Portuguese", flag: "🇵🇹" },
  { value: "Spanish", label: "Spanish", flag: "🇪🇸" },
  { value: "French", label: "French", flag: "🇫🇷" },
  { value: "Mandarin Chinese", label: "Mandarin Chinese", flag: "🇨🇳" },
  { value: "Arabic", label: "Arabic", flag: "🇸🇦" },
  { value: "Hindi", label: "Hindi", flag: "🇮🇳" },
];

type ExplainerResult = {
  explanation: string;
  audioScript: string;
  examples: { title: string; description: string }[];
  keyPoints: string[];
  language: string;
};

export function VoiceExplainer() {
  const { toast } = useToast();
  const [extractedText, setExtractedText] = useState("");
  const [extractedFilename, setExtractedFilename] = useState("");
  const [language, setLanguage] = useState("English");
  const [speed, setSpeed] = useState(1.0);
  const [result, setResult] = useState<ExplainerResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis?.getVoices() ?? [];
      setVoices(available);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const handleExtracted = (text: string, files: File[]) => {
    setExtractedText(text);
    if (files.length > 0) setExtractedFilename(files[0].name);
    setResult(null);
  };

  const clearContent = () => {
    setExtractedText("");
    setExtractedFilename("");
    setResult(null);
    stopSpeech();
  };

  const explainMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/voice/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: extractedText, language }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<ExplainerResult>;
    },
    onSuccess: (data) => { setResult(data); setIsPlaying(false); },
    onError: (e: any) => toast({ title: "Failed to generate explanation", description: e.message, variant: "destructive" }),
  });

  const handleExplain = () => {
    if (!extractedText.trim() || extractedText.trim().length < 20) {
      toast({ title: "Upload or paste some content first", variant: "destructive" }); return;
    }
    stopSpeech();
    setResult(null);
    explainMutation.mutate();
  };

  const stopSpeech = () => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  };

  const toggleSpeech = () => {
    if (!result) return;
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      return;
    }
    const text = result.audioScript || result.explanation;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = speed;
    if (selectedVoice) {
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) utter.voice = voice;
    }
    utter.onend = () => setIsPlaying(false);
    utter.onerror = () => setIsPlaying(false);
    utteranceRef.current = utter;
    window.speechSynthesis?.speak(utter);
    setIsPlaying(true);
  };

  const restart = () => {
    stopSpeech();
    setTimeout(toggleSpeech, 100);
  };

  const hasSpeechSupport = typeof window !== "undefined" && "speechSynthesis" in window;
  const selectedLang = LANGUAGES.find(l => l.value === language);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Voice Explainer</h1>
        <p className="text-muted-foreground mt-1">Upload any file or paste content — AI simplifies it, translates it, gives real-world examples, and reads it aloud</p>
      </div>

      <Card className="border-border bg-card rounded-2xl">
        <CardContent className="p-6 space-y-5">
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">Upload your notes or content</Label>
            <FileUploadZone
              onTextExtracted={handleExtracted}
              label="Drop files, browse, or paste here"
              hint="PDF, Word, images, TXT — any format · Ctrl+V to paste text"
            />
          </div>

          <AnimatePresence>
            {extractedText && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  {extractedFilename
                    ? <p className="text-sm font-semibold text-foreground truncate">{extractedFilename}</p>
                    : <p className="text-sm font-semibold text-foreground">Content loaded</p>
                  }
                  <p className="text-xs text-muted-foreground">{extractedText.length.toLocaleString()} characters ready to explain</p>
                </div>
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                  onClick={clearContent} data-testid="button-clear-voice-content">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <Label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Output Language
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5 ml-1">Translate & Explain</Badge>
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-11 rounded-xl bg-input border-border" data-testid="select-voice-language">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span>{selectedLang?.flag}</span>
                    <span>{selectedLang?.label}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              The AI will explain and summarise everything in <strong>{language}</strong>, regardless of the original content's language.
            </p>
          </div>

          <Button
            onClick={handleExplain}
            className="w-full h-11 font-semibold gap-2 rounded-2xl shadow-md"
            disabled={explainMutation.isPending || !extractedText}
            data-testid="button-generate-explanation"
          >
            {explainMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Explanation...</>
              : <><Volume2 className="w-4 h-4" />Explain & Read Aloud</>}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {explainMutation.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Volume2 className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <p className="font-bold text-foreground">Generating your explanation in {language}...</p>
            <p className="text-sm text-muted-foreground">Simplifying, finding examples, preparing audio script</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Explanation in {result.language || language}</span>
              {language !== "English" && (
                <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">Translated</Badge>
              )}
            </div>

            <Card className="border-primary/30 bg-primary/5 rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleSpeech}
                    className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg hover:bg-primary/90 transition-colors"
                    data-testid="button-play-audio"
                    disabled={!hasSpeechSupport}
                  >
                    {isPlaying
                      ? <Pause className="w-5 h-5 text-primary-foreground" />
                      : <Play className="w-5 h-5 text-primary-foreground ml-0.5" />}
                  </button>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground">
                      {hasSpeechSupport ? "Audio Explanation Ready" : "Text Explanation Ready"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {hasSpeechSupport ? `Click play to hear the explanation in ${result.language || language}` : "Audio not supported in this browser"}
                    </p>
                  </div>
                  {isPlaying && (
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={stopSpeech}>
                      <StopCircle className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                  {!isPlaying && (
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={restart} title="Restart">
                      <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>

                {hasSpeechSupport && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {voices.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Voice</Label>
                        <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                          <SelectTrigger className="h-9 bg-input border-border text-foreground rounded-xl text-xs" data-testid="select-voice">
                            <SelectValue placeholder="Default voice" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border max-h-48">
                            {voices.map(v => (
                              <SelectItem key={v.name} value={v.name} className="text-xs">{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Speed: {speed.toFixed(1)}x</Label>
                      <Slider
                        min={0.5} max={2} step={0.1}
                        value={[speed]}
                        onValueChange={([v]) => setSpeed(v)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card rounded-2xl">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Simplified Explanation
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.explanation}</p>
              </CardContent>
            </Card>

            {result.keyPoints?.length > 0 && (
              <Card className="border-border bg-card rounded-2xl">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" /> Key Points to Remember
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-2">
                  {result.keyPoints.map((kp, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-foreground">{kp}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {result.examples?.length > 0 && (
              <Card className="border-border bg-card rounded-2xl">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Practical Real-World Examples
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {result.examples.map((ex, i) => (
                    <div key={i} className="p-4 rounded-xl bg-secondary border border-border">
                      <div className="flex items-center gap-2 mb-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />
                        <p className="font-semibold text-sm text-foreground">{ex.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-5">{ex.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Button variant="outline" className="w-full border-border rounded-2xl" onClick={() => { stopSpeech(); setResult(null); clearContent(); }}
              data-testid="button-explain-new">
              Explain New Content
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
