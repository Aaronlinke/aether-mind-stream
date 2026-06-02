// Universal download helpers for module data exports.

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

export function downloadText(content: string, base: string, ext = "txt", mime = "text/plain") {
  trigger(new Blob([content], { type: `${mime};charset=utf-8` }), `${base}-${stamp()}.${ext}`);
}

export function downloadJson(data: unknown, base: string) {
  trigger(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }),
    `${base}-${stamp()}.json`,
  );
}

export function downloadMarkdown(md: string, base: string) {
  downloadText(md, base, "md", "text/markdown");
}

export function downloadCsv(rows: (string | number)[][], base: string) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map(r => r.map(esc).join(",")).join("\n");
  downloadText(csv, base, "csv", "text/csv");
}
