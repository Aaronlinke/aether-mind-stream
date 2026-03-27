import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Copy, Check, ChevronDown, ChevronRight, Atom, Activity, Zap, Waves, Hash, Shield, Grid3X3, Sparkles, Flame, Dna, Binary, Orbit, Globe, Swords, Bitcoin, Layers } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { FORMULA_DATASET, type Formula, type FormulaCategory } from '@/data/formulaDataset';

const ICON_MAP: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-3 h-3" />,
  Dna: <Dna className="w-3 h-3" />,
  Binary: <Binary className="w-3 h-3" />,
  Orbit: <Orbit className="w-3 h-3" />,
  Globe: <Globe className="w-3 h-3" />,
  Grid3x3: <Grid3X3 className="w-3 h-3" />,
  Swords: <Swords className="w-3 h-3" />,
  Bitcoin: <Bitcoin className="w-3 h-3" />,
  Zap: <Zap className="w-3 h-3" />,
  Layers: <Layers className="w-3 h-3" />,
  Atom: <Atom className="w-3 h-3" />,
  Activity: <Activity className="w-3 h-3" />,
  Sparkles: <Sparkles className="w-3 h-3" />,
  Hash: <Hash className="w-3 h-3" />,
  Shield: <Shield className="w-3 h-3" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  chaos: 'text-red-400',
  omnigenesis: 'text-emerald-400',
  'information-theory': 'text-green-400',
  'string-theory': 'text-violet-400',
  cosmology: 'text-blue-400',
  'lattice-cryptanalysis': 'text-purple-400',
  'attack-algorithms': 'text-orange-400',
  'bitcoin-specific': 'text-amber-400',
  'entropy-collapse': 'text-yellow-400',
  'complexity-classes': 'text-cyan-400',
  'sril-kes': 'text-sky-400',
};

function LatexRender({ latex }: { latex: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex, ref.current, { throwOnError: false, displayMode: false, trust: true });
    } catch {
      if (ref.current) ref.current.textContent = latex;
    }
  }, [latex]);
  return <div ref={ref} className="overflow-x-auto" />;
}


  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyFormula = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formula.latex);
    setCopied(true);
    toast({ title: 'Kopiert', description: formula.name });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="border border-border rounded px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />}
          <span className="text-xs font-medium truncate">{formula.name}</span>
        </div>
        <button onClick={copyFormula} className="shrink-0 text-muted-foreground hover:text-foreground">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      <div className="mt-1.5 font-mono text-xs text-primary bg-muted/50 rounded px-2 py-1.5 overflow-x-auto">
        {formula.latex}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">{formula.description}</p>

          {Object.keys(formula.variables).length > 0 && (
            <div className="space-y-0.5">
              {Object.entries(formula.variables).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-[10px]">
                  <span className="text-primary font-mono w-16 shrink-0">{k}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          )}

          {formula.tags && formula.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {formula.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FormulaLibrary() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return FORMULA_DATASET;
    const q = search.toLowerCase();
    return FORMULA_DATASET.map(cat => ({
      ...cat,
      formulas: cat.formulas.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.latex.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.tags && f.tags.some(t => t.includes(q)))
      )
    })).filter(cat => cat.formulas.length > 0);
  }, [search]);

  const totalFormulas = FORMULA_DATASET.reduce((s, c) => s + c.formulas.length, 0);
  const shownFormulas = filtered.reduce((s, c) => s + c.formulas.length, 0);

  const toggleCategory = (id: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ metadata: { title: 'Nexus Mathematics Dataset', version: '1.0.0', totalFormulas }, categories: FORMULA_DATASET }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexus-mathematics.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">NEXUS MATHEMATICS EXPLORER</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {shownFormulas}/{totalFormulas} Formeln • {filtered.length}/{FORMULA_DATASET.length} Kategorien
            </p>
          </div>
          <button onClick={exportAll} className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1">
            JSON Export
          </button>
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suche: chaos, bitcoin, entropy, shor, lattice..."
            className="pl-8 text-xs h-8"
          />
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filtered.map(cat => (
            <div key={cat.id}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className="flex items-center gap-2 w-full text-left mb-2 group"
              >
                {collapsedCategories.has(cat.id)
                  ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                }
                <span className={CATEGORY_COLORS[cat.id] || 'text-primary'}>{ICON_MAP[cat.icon] || <Sparkles className="w-3 h-3" />}</span>
                <span className="text-xs font-medium">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground">({cat.formulas.length})</span>
              </button>

              {!collapsedCategories.has(cat.id) && (
                <div className="space-y-1.5 ml-5">
                  {cat.formulas.map(f => (
                    <FormulaCard
                      key={f.id}
                      formula={f}
                      expanded={expandedId === f.id}
                      onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
