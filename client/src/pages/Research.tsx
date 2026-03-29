import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Loader2, BookOpen, Copy, CheckCheck, ExternalLink,
  Sparkles, ChevronDown, ChevronUp, BookMarked, Quote,
  ClipboardList, AlertCircle, Tags, Youtube, Play, Bell, X,
  MonitorPlay, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Paper = {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string | null;
  abstract: string | null;
  doi: string | null;
  url: string | null;
  citationCount: number;
  publicationTypes: string[];
  relevance: string | null;
  apa: string | null;
  harvard: string | null;
  keyPoints: string[];
};

type Video = {
  title: string;
  channel: string;
  url: string;
  type: "channel" | "search";
  description: string;
  level: "beginner" | "intermediate" | "advanced";
};

type ResearchResult = {
  topic: string;
  overview: string;
  searchTerms: string[];
  papers: Paper[];
  totalFound: number;
  videos: Video[];
};

const FIELDS = [
  { value: "all", label: "All Fields" },
  { value: "computer science", label: "Computer Science & IT" },
  { value: "business management economics", label: "Business & Economics" },
  { value: "law jurisprudence", label: "Law" },
  { value: "education pedagogy", label: "Education" },
  { value: "engineering technology", label: "Engineering" },
  { value: "mathematics statistics", label: "Mathematics & Statistics" },
  { value: "physics chemistry", label: "Physics & Chemistry" },
  { value: "biology medicine health", label: "Biology & Health Sciences" },
  { value: "psychology sociology", label: "Psychology & Sociology" },
  { value: "political science history", label: "Political Science & History" },
  { value: "environmental science", label: "Environmental Science" },
];

const RESULT_COUNTS = [5, 8, 10, 15];

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  intermediate: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  advanced: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all bg-white dark:bg-card dark:border-border"
    >
      {copied ? <><CheckCheck className="w-3 h-3 text-emerald-500" />Copied</> : <><Copy className="w-3 h-3" />{label}</>}
    </button>
  );
}

function PaperCard({ paper, index }: { paper: Paper; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [citationStyle, setCitationStyle] = useState<"apa" | "harvard">("apa");

  const typeBadge = paper.publicationTypes?.[0];
  const citation = citationStyle === "apa" ? paper.apa : paper.harvard;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-border bg-card rounded-2xl hover:border-primary/30 transition-all" data-testid={`paper-card-${index}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {paper.year && (
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold">{paper.year}</Badge>
                )}
                {typeBadge && (
                  <Badge variant="outline" className="text-[10px] border-zinc-200 text-zinc-500 capitalize">
                    {typeBadge.replace(/([A-Z])/g, ' $1').trim()}
                  </Badge>
                )}
                {paper.citationCount > 0 && (
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Quote className="w-2.5 h-2.5" /> {paper.citationCount.toLocaleString()} citations
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-foreground leading-snug mb-1">{paper.title}</h3>
              {paper.authors.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {paper.authors.slice(0, 4).join(", ")}{paper.authors.length > 4 ? ` +${paper.authors.length - 4} more` : ""}
                  {paper.journal && <span className="text-zinc-400"> · {paper.journal}</span>}
                </p>
              )}
            </div>
            {paper.url && (
              <a href={paper.url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all shrink-0"
                data-testid={`link-paper-${index}`}>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {paper.relevance && (
            <div className="mb-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wide">Why it's relevant</p>
              <p className="text-xs text-foreground leading-relaxed">{paper.relevance}</p>
            </div>
          )}

          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 mb-3">
              {paper.abstract && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Abstract</p>
                  <p className="text-xs text-foreground leading-relaxed">{paper.abstract}</p>
                </div>
              )}
              {paper.keyPoints.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Key Points</p>
                  <ul className="space-y-1">
                    {paper.keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <span className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 font-bold text-[9px]">{i + 1}</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {(paper.apa || paper.harvard) && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1 p-0.5 bg-secondary rounded-lg">
                  {(["apa", "harvard"] as const).map(style => (
                    <button key={style}
                      onClick={() => setCitationStyle(style)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${citationStyle === style ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                      {style}
                    </button>
                  ))}
                </div>
                {citation && <CopyButton text={citation} label="Copy Ref" />}
              </div>
              {citation && (
                <p className="text-xs text-foreground leading-relaxed bg-secondary/50 p-3 rounded-xl border border-border font-mono" data-testid={`citation-${index}`}>
                  {citation}
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-2 w-full justify-center pt-2"
            data-testid={`button-expand-${index}`}
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />Show abstract & key points</>}
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function VideoCard({ video, index }: { video: Video; index: number }) {
  return (
    <motion.a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group block"
      data-testid={`video-card-${index}`}
    >
      <Card className="border-border bg-card rounded-2xl hover:border-red-500/40 hover:shadow-md transition-all cursor-pointer overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-stretch gap-0">
            <div className="w-16 bg-red-500/10 flex items-center justify-center shrink-0 rounded-l-2xl group-hover:bg-red-500/20 transition-colors">
              <Play className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" fill="currentColor" />
            </div>
            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground leading-tight group-hover:text-red-500 transition-colors line-clamp-2">{video.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Youtube className="w-3 h-3 text-red-500 shrink-0" />
                    {video.channel}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge className={`text-[10px] border capitalize ${LEVEL_COLORS[video.level]}`}>
                    {video.level}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-zinc-200 text-zinc-400 capitalize">
                    {video.type === "channel" ? "Channel" : "Search"}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">{video.description}</p>
            </div>
            <div className="flex items-center px-3 shrink-0">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-red-500 transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.a>
  );
}

function VideoNotification({ count, onView, onDismiss }: { count: number; onView: () => void; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
      data-testid="video-notification"
    >
      <div className="bg-card border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-red-500/10 px-4 py-3 flex items-center justify-between gap-3 border-b border-red-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Video Recommendations Ready</p>
              <p className="text-xs text-muted-foreground">{count} study video{count !== 1 ? "s" : ""} found for this topic</p>
            </div>
          </div>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-7 h-7 rounded-full bg-red-500/20 border-2 border-card flex items-center justify-center">
                <Youtube className="w-3.5 h-3.5 text-red-500" />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground flex-1">Educational videos and channels curated for your topic</p>
          <Button size="sm" onClick={onView} className="gap-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs h-8 shrink-0" data-testid="button-view-videos">
            Watch <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function Research() {
  const [topic, setTopic] = useState("");
  const [field, setField] = useState("all");
  const [resultCount, setResultCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [showVideoNotif, setShowVideoNotif] = useState(false);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToVideos = () => {
    setShowVideoNotif(false);
    setTimeout(() => {
      videoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSearch = async (e?: React.FormEvent, overrideTopic?: string) => {
    e?.preventDefault();
    const searchTopic = overrideTopic || topic;
    if (!searchTopic.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setShowVideoNotif(false);
    try {
      const res = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: searchTopic, field, resultCount }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Search failed");
      }
      const data = await res.json();
      if (data.papers.length === 0 && data.videos.length === 0) {
        toast({ title: "No results found", description: "Try a broader or different topic.", variant: "destructive" });
      } else {
        setResult(data);
        if (data.videos?.length > 0) {
          setTimeout(() => setShowVideoNotif(true), 1200);
        }
      }
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyAllReferences = (style: "apa" | "harvard") => {
    if (!result) return;
    const refs = result.papers.map((p, i) =>
      `[${i + 1}] ${style === "apa" ? p.apa : p.harvard}`
    ).filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(refs).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
      toast({ title: "All references copied!" });
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 text-white" />
          </span>
          Research Engine
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Find real academic papers from 240M+ published works, get proper references, and discover the best YouTube videos to study the topic.</p>
      </div>

      <Card className="border-border bg-card rounded-2xl">
        <CardContent className="p-5">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-3">
              <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter your research topic... e.g. 'impact of social media on mental health'"
                className="flex-1 h-12 rounded-xl bg-input border-border text-foreground placeholder:text-muted-foreground"
                data-testid="input-research-topic"
              />
              <Button type="submit" disabled={!topic.trim() || loading} className="h-12 px-6 rounded-xl gap-2 font-semibold shadow-md shrink-0" data-testid="button-search">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Select value={field} onValueChange={setField}>
                <SelectTrigger className="h-9 rounded-xl bg-input border-border text-sm w-auto min-w-[180px]" data-testid="select-research-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(resultCount)} onValueChange={v => setResultCount(Number(v))}>
                <SelectTrigger className="h-9 rounded-xl bg-input border-border text-sm w-36" data-testid="select-result-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESULT_COUNTS.map(n => <SelectItem key={n} value={String(n)}>{n} results</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            <span className="font-bold text-amber-400">Academic papers are real</span> — sourced from OpenAlex (240M+ peer-reviewed works). Always verify before submitting.
          </p>
        </div>
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/5 border border-red-500/20">
          <Youtube className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            <span className="font-bold text-red-400">Video recommendations</span> — curated YouTube channels and searches for every topic you research.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">Searching academic databases...</p>
            <p className="text-sm text-muted-foreground mt-1">Finding papers, formatting references, and finding study videos</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {["OpenAlex Database", "AI Analysis", "Formatting Citations", "Finding Videos"].map((step, i) => (
              <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.35 }}
                className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> {step}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {result.overview && (
              <Card className="border-border bg-card rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p className="text-xs font-bold text-primary uppercase tracking-wide">Research Overview</p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{result.overview}</p>

                  {result.searchTerms.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Tags className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Try also searching for</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.searchTerms.map(term => (
                          <button
                            key={term}
                            onClick={() => { setTopic(term); handleSearch(undefined, term); }}
                            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-all font-medium"
                            data-testid={`tag-search-term-${term}`}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground">{result.totalFound} Academic Source{result.totalFound !== 1 ? "s" : ""} Found</h2>
                <p className="text-xs text-muted-foreground mt-0.5">for "{result.topic}"</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copyAllReferences("apa")} className="gap-1.5 rounded-xl text-xs h-8" data-testid="button-copy-all-apa">
                  {allCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardList className="w-3.5 h-3.5" />}
                  Copy All APA
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyAllReferences("harvard")} className="gap-1.5 rounded-xl text-xs h-8" data-testid="button-copy-all-harvard">
                  <ClipboardList className="w-3.5 h-3.5" /> Harvard
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {result.papers.map((paper, i) => (
                <PaperCard key={paper.id || i} paper={paper} index={i} />
              ))}
            </div>

            {result.papers.length > 0 && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                <BookMarked className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">
                  <span className="font-bold text-primary">How to use these sources:</span> Click "Show abstract & key points" to understand each paper. Copy the reference directly into your assignment. Click the external link icon to access the full paper.
                </p>
              </div>
            )}

            {result.videos && result.videos.length > 0 && (
              <div ref={videoSectionRef} className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <MonitorPlay className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground">Study Video Recommendations</h2>
                      <p className="text-xs text-muted-foreground">{result.videos.length} curated YouTube resources for "{result.topic}"</p>
                    </div>
                  </div>
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs border">
                    YouTube
                  </Badge>
                </div>

                <div className="space-y-3">
                  {result.videos.map((video, i) => (
                    <VideoCard key={i} video={video} index={i} />
                  ))}
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-start gap-3">
                  <Youtube className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">
                    <span className="font-bold text-red-400">Tip:</span> "Channel" links take you to a creator's full channel page — great for binge-watching on your topic. "Search" links run a targeted YouTube search so you can pick the video that suits your level best.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVideoNotif && result?.videos && result.videos.length > 0 && (
          <VideoNotification
            count={result.videos.length}
            onView={scrollToVideos}
            onDismiss={() => setShowVideoNotif(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
