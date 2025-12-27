import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Play, Square, Zap } from "lucide-react";

// SECP256k1 Kurvenordnung
const N_CURVE = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

interface DerivationResult {
  iteration: number;
  z: string;
  r: string;
  s: string;
  n: string;
  g: string;
  h: string;
  k: string;
  privateKey: string;
  status: "OK" | "ERROR";
  error: string;
}

// Modulare Inverse via erweitertem euklidischem Algorithmus
function modInverse(a: bigint, m: bigint): bigint {
  if (m === 1n) return 0n;
  let m0 = m;
  let y = 0n, x = 1n;
  a = a % m;
  if (a < 0n) a += m;
  
  while (a > 1n) {
    if (m === 0n) throw new Error("Division durch Null");
    const q = a / m;
    let t = m;
    m = a % m;
    a = t;
    t = y;
    y = x - q * y;
    x = t;
  }
  
  if (a !== 1n) throw new Error(`Modulare Inverse existiert nicht`);
  if (x < 0n) x += m0;
  return x;
}

// BigInt zu Hex mit Padding
function bigIntToHex(value: bigint | null, padding = 64): string {
  if (value === null) return "N/A";
  return value.toString(16).toUpperCase().padStart(padding, '0');
}

// Hex-Validierung
function isValidHex(str: string): boolean {
  if (!str) return false;
  const clean = str.replace(/^0x/i, '').trim();
  return /^[0-9a-fA-F]+$/.test(clean);
}

// Schlüsselableitung
function derivePrivateKey(
  zHex: string,
  rHex: string,
  sStr: string,
  nParam: bigint,
  gParam: bigint,
  hParam: bigint
): { k: bigint | null; privateKey: bigint | null; status: "OK" | "ERROR"; error: string } {
  try {
    const zVal = BigInt("0x" + zHex);
    const rVal = BigInt("0x" + rHex);
    const sVal = sStr.toLowerCase().startsWith("0x") ? BigInt(sStr) : BigInt(sStr);

    if (rVal <= 0n || rVal >= N_CURVE) throw new Error("R-Wert ungültig");
    if (sVal <= 0n || sVal >= N_CURVE) throw new Error("S-Wert ungültig");

    // k-Berechnung nach Linke-Formel
    let k = (nParam * gParam) + hParam;
    k = k % N_CURVE;
    if (k <= 0n) k += N_CURVE;
    if (k === 0n) throw new Error("k ist 0");

    // Modulare Inverse von r
    const rInv = modInverse(rVal, N_CURVE);

    // Kern-Formel: d = (s * k - z) * r_inv mod N
    const term1 = (sVal * k) % N_CURVE;
    let numerator = (term1 - zVal) % N_CURVE;
    if (numerator < 0n) numerator += N_CURVE;

    let privateKey = (numerator * rInv) % N_CURVE;
    if (privateKey <= 0n) privateKey += N_CURVE;
    if (privateKey === 0n) throw new Error("Private Key ist 0");

    return { k, privateKey, status: "OK", error: "" };
  } catch (e) {
    return { k: null, privateKey: null, status: "ERROR", error: (e as Error).message };
  }
}

export const LinkeSystem = () => {
  const [startZ, setStartZ] = useState("0000000000000000000000000000000000000000000000000000000000000001");
  const [fixedR, setFixedR] = useState("7171717171717171717171717171717171717171717171717171717171717171");
  const [fixedS, setFixedS] = useState("5555555555555555555555555555555555555555555555555555555555555555");
  const [nVar, setNVar] = useState("3360");
  const [gVar, setGVar] = useState("1780");
  const [hVar, setHVar] = useState("3340");
  const [iterations, setIterations] = useState("50000");
  
  const [results, setResults] = useState<DerivationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Warte auf Startbefehl...");
  const [successCount, setSuccessCount] = useState(0);
  
  const stopRef = useRef(false);

  const startBatch = useCallback(async () => {
    const cleanZ = startZ.replace(/^0x/i, '').trim();
    const cleanR = fixedR.replace(/^0x/i, '').trim();
    
    if (!isValidHex(cleanZ) || cleanZ.length !== 64) {
      setStatus("FEHLER: Z-Wert muss 64 Hex-Zeichen haben");
      return;
    }
    if (!isValidHex(cleanR) || cleanR.length !== 64) {
      setStatus("FEHLER: R-Wert muss 64 Hex-Zeichen haben");
      return;
    }
    
    const numIter = parseInt(iterations);
    if (isNaN(numIter) || numIter < 100 || numIter > 1000000) {
      setStatus("FEHLER: Iterationen zwischen 100 und 1.000.000");
      return;
    }

    setIsRunning(true);
    stopRef.current = false;
    setResults([]);
    setProgress(0);
    setSuccessCount(0);
    setStatus("BATCH-PROZESS GESTARTET...");

    const startZBig = BigInt("0x" + cleanZ);
    const nParam = BigInt(nVar);
    const gParam = BigInt(gVar);
    const hParam = BigInt(hVar);
    
    const batchSize = 500;
    const newResults: DerivationResult[] = [];
    let successes = 0;
    const startTime = performance.now();

    for (let i = 0; i < numIter && !stopRef.current; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, numIter);
      
      for (let j = i; j < batchEnd && !stopRef.current; j++) {
        const currentZ = startZBig + BigInt(j);
        const currentZHex = currentZ.toString(16).toUpperCase().padStart(64, '0');
        
        const result = derivePrivateKey(currentZHex, cleanR, fixedS, nParam, gParam, hParam);
        
        const entry: DerivationResult = {
          iteration: j,
          z: currentZHex,
          r: cleanR,
          s: fixedS,
          n: nVar,
          g: gVar,
          h: hVar,
          k: result.k ? bigIntToHex(result.k) : "N/A",
          privateKey: result.privateKey ? bigIntToHex(result.privateKey) : "N/A",
          status: result.status,
          error: result.error
        };
        
        newResults.push(entry);
        if (result.status === "OK") successes++;
      }
      
      // UI Update
      setProgress((batchEnd / numIter) * 100);
      setSuccessCount(successes);
      setResults([...newResults.slice(-1000)]); // Nur letzte 1000 anzeigen
      setStatus(`${batchEnd}/${numIter} Iterationen (${successes} OK)`);
      
      // Yield zur UI
      await new Promise(r => setTimeout(r, 0));
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    setStatus(`FERTIG: ${newResults.length} Iterationen in ${duration}s (${successes} OK)`);
    setIsRunning(false);
  }, [startZ, fixedR, fixedS, nVar, gVar, hVar, iterations]);

  const stopBatch = () => {
    stopRef.current = true;
    setIsRunning(false);
    setStatus("GESTOPPT");
  };

  const downloadCSV = () => {
    if (results.length === 0) return;
    
    let csv = "Iteration,Nonce_k,PrivateKey,Z,R,S,N,G,H,Status,Error\n";
    results.forEach(r => {
      csv += `${r.iteration},${r.k},${r.privateKey},${r.z},${r.r},${r.s},${r.n},${r.g},${r.h},${r.status},"${r.error}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linke_keys_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-destructive/30 bg-destructive/5">
        <h1 className="text-xl font-bold text-destructive text-center tracking-widest">
          LINKE-SYSTEM [GODMODE AUTO-BATCH V2]
        </h1>
        <p className="text-xs text-muted-foreground text-center mt-1">
          SECP256k1 KEY DERIVATION ENGINE
        </p>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4 border-b border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <Label className="text-destructive/80 text-xs">START Z-WERT (Hex 64)</Label>
            <Input
              value={startZ}
              onChange={(e) => setStartZ(e.target.value)}
              className="font-mono text-xs bg-card border-destructive/30 text-foreground"
              placeholder="Z-Hash Startwert"
            />
          </div>
          <div>
            <Label className="text-destructive/80 text-xs">ITERATIONEN</Label>
            <Input
              type="number"
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
              className="font-mono text-xs bg-card border-destructive/30"
              min={100}
              max={1000000}
            />
          </div>
          <div>
            <Label className="text-destructive/80 text-xs">N (Linke)</Label>
            <Input
              value={nVar}
              onChange={(e) => setNVar(e.target.value)}
              className="font-mono text-xs bg-card border-destructive/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <Label className="text-destructive/80 text-xs">R-WERT (Hex 64)</Label>
            <Input
              value={fixedR}
              onChange={(e) => setFixedR(e.target.value)}
              className="font-mono text-xs bg-card border-destructive/30"
            />
          </div>
          <div>
            <Label className="text-destructive/80 text-xs">G (Linke)</Label>
            <Input
              value={gVar}
              onChange={(e) => setGVar(e.target.value)}
              className="font-mono text-xs bg-card border-destructive/30"
            />
          </div>
          <div>
            <Label className="text-destructive/80 text-xs">H (Linke)</Label>
            <Input
              value={hVar}
              onChange={(e) => setHVar(e.target.value)}
              className="font-mono text-xs bg-card border-destructive/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-destructive/80 text-xs">S-WERT</Label>
            <Input
              value={fixedS}
              onChange={(e) => setFixedS(e.target.value)}
              className="font-mono text-xs bg-card border-destructive/30"
            />
          </div>
          <div className="flex gap-2 items-end">
            {!isRunning ? (
              <Button 
                onClick={startBatch} 
                className="flex-1 bg-destructive hover:bg-destructive/80 text-destructive-foreground"
              >
                <Play className="w-4 h-4 mr-2" />
                STARTE GENERATION
              </Button>
            ) : (
              <Button 
                onClick={stopBatch} 
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              >
                <Square className="w-4 h-4 mr-2" />
                STOP
              </Button>
            )}
            <Button 
              onClick={downloadCSV} 
              variant="outline"
              disabled={results.length === 0}
              className="border-muted-foreground/30"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2 bg-destructive/20" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="w-3 h-3 text-destructive" />
            <span>{status}</span>
            <span className="ml-auto text-destructive">{successCount} gültige Keys</span>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <ScrollArea className="flex-1 p-4">
        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-destructive/30 text-destructive">
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">NONCE (k)</th>
                  <th className="p-2 text-left">PRIVATE KEY</th>
                  <th className="p-2 text-left">Z</th>
                  <th className="p-2 text-left">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(-100).map((r, i) => (
                  <tr 
                    key={i} 
                    className="border-b border-border/30 hover:bg-destructive/5"
                  >
                    <td className="p-2 text-muted-foreground">{r.iteration + 1}</td>
                    <td className="p-2 text-foreground/80">
                      {r.k !== "N/A" ? r.k.substring(0, 16) + "..." : "N/A"}
                    </td>
                    <td className="p-2 text-foreground">
                      {r.privateKey !== "N/A" ? r.privateKey.substring(0, 16) + "..." : "N/A"}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {r.z.substring(0, 12)}...
                    </td>
                    <td className={`p-2 ${r.status === "OK" ? "text-green-500" : "text-destructive"}`}>
                      {r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {results.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Starte den Batch-Prozess um Ergebnisse zu generieren
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
