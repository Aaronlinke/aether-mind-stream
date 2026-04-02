import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Copy, Check } from 'lucide-react';
import { FORMULA_DATASET } from '@/data/formulaDataset';
import { useToast } from '@/hooks/use-toast';

function generateMarkdown(): string {
  const lines: string[] = [];
  const total = FORMULA_DATASET.reduce((s, c) => s + c.formulas.length, 0);
  lines.push('# Nexus Mathematics Explorer — Formelsammlung\n');
  lines.push(`> ${total} Formeln in ${FORMULA_DATASET.length} Kategorien\n`);
  lines.push('---\n');

  for (const cat of FORMULA_DATASET) {
    if (cat.formulas.length === 0) continue;
    lines.push(`## ${cat.name}\n`);
    lines.push(`*${cat.description}*\n`);

    for (const f of cat.formulas) {
      lines.push(`### ${f.name}\n`);
      lines.push(`$$${f.latex}$$\n`);
      lines.push(`${f.description}\n`);

      if (Object.keys(f.variables).length > 0) {
        lines.push('| Variable | Bedeutung |');
        lines.push('|----------|-----------|');
        for (const [k, v] of Object.entries(f.variables)) {
          lines.push(`| \`${k}\` | ${v} |`);
        }
        lines.push('');
      }

      if (f.tags && f.tags.length > 0) {
        lines.push(`**Tags:** ${f.tags.join(', ')}\n`);
      }
    }
    lines.push('---\n');
  }
  return lines.join('\n');
}

function generateLatexDoc(): string {
  const lines: string[] = [];
  lines.push('\\documentclass[11pt,a4paper]{article}');
  lines.push('\\usepackage[utf8]{inputenc}');
  lines.push('\\usepackage{amsmath,amssymb}');
  lines.push('\\usepackage{geometry}');
  lines.push('\\usepackage{hyperref}');
  lines.push('\\geometry{margin=2.5cm}');
  lines.push('\\title{\\textbf{Nexus Mathematics Explorer}\\\\\\large Vollständige Formelsammlung}');
  lines.push('\\author{Generiert von MACALU BRAIN}');
  lines.push('\\date{\\today}');
  lines.push('\\begin{document}');
  lines.push('\\maketitle');
  lines.push('\\tableofcontents');
  lines.push('\\newpage');

  for (const cat of FORMULA_DATASET) {
    if (cat.formulas.length === 0) continue;
    lines.push(`\\section{${cat.name}}`);
    lines.push(`\\textit{${cat.description}}\n`);

    for (const f of cat.formulas) {
      lines.push(`\\subsection{${f.name}}`);
      lines.push('\\begin{equation}');
      lines.push(f.latex);
      lines.push('\\end{equation}');
      lines.push(f.description + '\n');

      if (Object.keys(f.variables).length > 0) {
        lines.push('\\begin{itemize}');
        for (const [k, v] of Object.entries(f.variables)) {
          lines.push(`  \\item $${k}$ — ${v}`);
        }
        lines.push('\\end{itemize}\n');
      }
    }
  }

  lines.push('\\end{document}');
  return lines.join('\n');
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function FormulaExport() {
  const [preview, setPreview] = useState<'md' | 'latex' | 'json'>('md');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const totalFormulas = FORMULA_DATASET.reduce((s, c) => s + c.formulas.length, 0);
  const totalCategories = FORMULA_DATASET.filter(c => c.formulas.length > 0).length;

  const mdContent = generateMarkdown();
  const latexContent = generateLatexDoc();
  const jsonContent = JSON.stringify({ metadata: { title: 'Nexus Mathematics Dataset', version: '1.0.0', totalFormulas }, categories: FORMULA_DATASET }, null, 2);

  const currentContent = preview === 'md' ? mdContent : preview === 'latex' ? latexContent : jsonContent;

  const copyContent = useCallback(() => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    toast({ title: 'Kopiert', description: `${preview.toUpperCase()} in Zwischenablage` });
    setTimeout(() => setCopied(false), 2000);
  }, [currentContent, preview, toast]);

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-3">
        <h1 className="text-sm font-medium">FORMEL-EXPORT</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {totalFormulas} Formeln • {totalCategories} Kategorien • Multi-Format
        </p>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Download buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" className="text-xs h-8" onClick={() => downloadFile(mdContent, 'nexus-formeln.md', 'text/markdown')}>
              <Download className="w-3 h-3 mr-1" /> Markdown
            </Button>
            <Button size="sm" className="text-xs h-8" onClick={() => downloadFile(latexContent, 'nexus-formeln.tex', 'text/x-tex')}>
              <Download className="w-3 h-3 mr-1" /> LaTeX
            </Button>
            <Button size="sm" className="text-xs h-8" onClick={() => downloadFile(jsonContent, 'nexus-formeln.json', 'application/json')}>
              <Download className="w-3 h-3 mr-1" /> JSON
            </Button>
          </div>

          {/* Copy */}
          <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={copyContent}>
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? 'Kopiert!' : 'Aktuelle Vorschau kopieren'}
          </Button>

          {/* Preview Toggle */}
          <div className="flex gap-1">
            {(['md', 'latex', 'json'] as const).map(fmt => (
              <Badge key={fmt} variant={preview === fmt ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]" onClick={() => setPreview(fmt)}>
                {fmt === 'md' ? 'Markdown' : fmt === 'latex' ? 'LaTeX' : 'JSON'}
              </Badge>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Formeln</div>
              <div className="text-lg font-mono font-bold">{totalFormulas}</div>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Kategorien</div>
              <div className="text-lg font-mono font-bold">{totalCategories}</div>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Zeichen</div>
              <div className="text-lg font-mono font-bold">{(currentContent.length / 1000).toFixed(1)}k</div>
            </div>
          </div>

          {/* Preview */}
          <div className="border border-border rounded p-2">
            <pre className="text-[8px] font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[400px] overflow-y-auto">
              {currentContent.slice(0, 3000)}{currentContent.length > 3000 ? '\n\n... (gekürzt)' : ''}
            </pre>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
