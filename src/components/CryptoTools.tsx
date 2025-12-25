import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Base58 alphabet (Bitcoin style)
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = "";
  for (const byte of bytes) {
    if (byte === 0) result += BASE58_ALPHABET[0];
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

function base58Decode(str: string): Uint8Array {
  const bytes = [0];
  for (const char of str) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value < 0) throw new Error(`Invalid Base58 character: ${char}`);
    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of str) {
    if (char === BASE58_ALPHABET[0]) bytes.push(0);
    else break;
  }
  return new Uint8Array(bytes.reverse());
}

function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexDecode(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64Decode(str: string): Uint8Array {
  return new Uint8Array(atob(str).split("").map(c => c.charCodeAt(0)));
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(data.length);
  new Uint8Array(buffer).set(data);
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return new Uint8Array(hash);
}

async function sha512(data: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(data.length);
  new Uint8Array(buffer).set(data);
  const hash = await crypto.subtle.digest("SHA-512", buffer);
  return new Uint8Array(hash);
}

export function CryptoTools() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const textToBytes = (text: string) => new TextEncoder().encode(text);
  const bytesToText = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

  const run = async (fn: () => Promise<string> | string) => {
    setError("");
    try {
      setOutput(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setOutput("");
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-medium">TOOLS</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Offline • Base58 • Hex • Base64 • SHA-256 • SHA-512
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Eingabe..."
          className="resize-none bg-input border-border text-foreground min-h-[100px]"
        />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Button variant="outline" size="sm" onClick={() => run(() => base58Encode(textToBytes(input)))}>
            Base58 Encode
          </Button>
          <Button variant="outline" size="sm" onClick={() => run(() => bytesToText(base58Decode(input)))}>
            Base58 Decode
          </Button>
          <Button variant="outline" size="sm" onClick={() => run(() => hexEncode(textToBytes(input)))}>
            Hex Encode
          </Button>
          <Button variant="outline" size="sm" onClick={() => run(() => bytesToText(hexDecode(input)))}>
            Hex Decode
          </Button>
          <Button variant="outline" size="sm" onClick={() => run(() => base64Encode(textToBytes(input)))}>
            Base64 Encode
          </Button>
          <Button variant="outline" size="sm" onClick={() => run(() => bytesToText(base64Decode(input)))}>
            Base64 Decode
          </Button>
          <Button variant="outline" size="sm" onClick={() => run(async () => hexEncode(await sha256(textToBytes(input))))}>
            SHA-256
          </Button>
          <Button variant="outline" size="sm" onClick={() => run(async () => hexEncode(await sha512(textToBytes(input))))}>
            SHA-512
          </Button>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        {output && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Ergebnis:</div>
            <pre className="bg-muted p-3 rounded text-sm break-all whitespace-pre-wrap">{output}</pre>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigator.clipboard.writeText(output)}
              className="text-xs"
            >
              Kopieren
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
