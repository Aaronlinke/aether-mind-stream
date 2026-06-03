// Vollständige A-Z secp256k1 / OMNIGENESIS Referenzrechnung (d=3).
// Quelle: User-Input, doppelt geprüft und rückwärts analysiert.

export const VOLLRECHNUNG_MD = String.raw`# VOLLRECHNUNG – A BIS Z (HIN UND ZURÜCK)

## 1. SECP256K1 GRUNDLAGEN

- \(p = 2^{256} - 2^{32} - 977\)
- \(p = 115792089237316195423570985008687907853269984665640564039457584007908834671663\)
- \(n = 115792089237316195423570985008687907852837564279074904382605163141518161494337\)
- \(G_x = 55066263022277343669578718895168534326250603453777594175500187360389116729240\)
- \(G_y = 32670510020758816978083085130507043184471273380659243275938904335757337482424\)
- Kurve: \(y^2 = x^3 + 7 \pmod{p}\)

## 2. OMNIGENESIS PIPELINE

Parameter: \(h=1,\ n_{\text{nav}}=1,\ g=1,\ o=1,\ r=1,\ i=0\)

- \(k_i = (h + n_{\text{nav}} \cdot g + o + i) \bmod n = 3\)
- \(r^{-1} \bmod n = 1\)
- \(d = k_i \cdot r^{-1} \bmod n = 3\)

## 3. PRIVATE KEY (Hex, 32 B)

\`0000000000000000000000000000000000000000000000000000000000000003\`

## 4. WIF KOMPRIMIERT

- Payload: \`80…0301\`
- SHA256² → Checksum \`8e2dbabf\`
- **WIF**: \`KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU74sHUHy8S\`

## 5. WIF UNKOMPRIMIERT

- Checksum \`969142d8\`
- **WIF**: \`5HpHagT65TZzG1PH3CSu63k8DbpvD8s5ip4nEB3kEsreB1FQ8BZ\`

## 6. PUBLIC KEY Q = 3G

**Punktverdopplung 2G**
- \(\lambda_{2G} = 3G_x^2 \cdot (2G_y)^{-1} \bmod p = 91914383230618135761690975197207778399550061809281766160147273830617914855857\)
- \(x_{2G} = 89565891926547004231252920425935692360644145829622209833684329913297188986597\)
- \(y_{2G} = 12158399299693830322967808612735361395635616578704162817679887195411665491030\)

**Addition 3G = 2G + G**
- Zähler: \(20512110721064986655115276517793644548315905493617615099140032380968965828494\)
- Nenner: \(81292460333046534861896783477920749818876442289795948381273441455000762414306\)
- Nenner⁻¹: \(37732016455592228448156445462498416408852156224504820822700452822953572406827\)
- \(\lambda_{3G} = 23578750110654438173404407907450265080473019639451825850605815020978465167024\)
- \(x_{3G} = 112711660439710606056748659173929673102114977341539408544630613555209775888121\)
- \(y_{3G} = 25583027980570883691656905877401976406448868254816295069919888960541586679410\)

Hex:
- \(x_{3G}\) = \`f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9\`
- \(y_{3G}\) = \`388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672\`

\(y_{3G}\) gerade ⇒ Prefix \`02\`.

**Komprimierter Public Key**:
\`02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9\`

## 7. BITCOIN ADRESSE (komprimiert)

- SHA256(Q) = \`eae10cdd2f289bdad44615809cb422d2fabe9622ed706ad5d9d3ffd2cdd1c001\`
- RIPEMD160 = \`7dd65592d0ab2fe0d0257d571abf032cd9db93dc\`
- Payload (00‖hash160) = \`007dd65592d0ab2fe0d0257d571abf032cd9db93dc\`
- Checksum = \`ac074bec\`
- **Adresse**: \`1CUNEBjYrCn2y1SdiUMohaKUi4wpP326Lb\`

Unkomprimiert: \`1NZUP3JAc9JkmbvmoTv7nVgZGtyJjirKV1\`

## 8. DYNAMISCHES SYSTEM – Matrix A

\[
A = \begin{pmatrix} 0 & 0.7 & 1.4 \\ 0.9 & 0.3 & 0.5 \\ 1.5 & 1.0 & 1.0 \end{pmatrix}
\]

Charakteristisches Polynom: \(\lambda^3 - 1.3\lambda^2 - 2.93\lambda - 0.525 = 0\)

**Eigenwerte (korrigiert)**
- \(\lambda_1 = 2.536654580591124\)
- \(\lambda_2 = -1.037091103749855\)
- \(\lambda_3 = -0.19956347684126985\)

## 9. NONCE-REUSE ANGRIFF (ECDSA)

Gegeben zwei Signaturen \((r,s_1),(r,s_2)\) mit Hashes \(z_1,z_2\):

\[
k = (z_1 - z_2)(s_1 - s_2)^{-1} \bmod n
\quad,\quad
d = (k s_1 - z_1) \cdot r^{-1} \bmod n
\]

Mit \(k=2\) und korrekten Werten ergibt sich \(d = 3\).

## 10. POST-QUANTUM TOY (LWE)

- \(q=17,\ N=4,\ \tau=1,\ R_q=\mathbb{Z}_{17}[X]/(X^4+1)\)
- \(s = 2 + 13X + 3X^3\)
- \(a^{\text{diff}} = 6 + 10X + 15X^2 + 16X^3\)
- \(b = a \cdot s + e = 13 + X + 9X^2 + 7X^3\)
- \(\|e\|_\infty = 1 \le \tau\) ✓

## 11. ENDERGEBNISTAFEL

| Komponente | Wert |
|---|---|
| d (dez) | 3 |
| Hex | \`0…03\` |
| WIF comp | \`KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU74sHUHy8S\` |
| WIF uncomp | \`5HpHagT65TZzG1PH3CSu63k8DbpvD8s5ip4nEB3kEsreB1FQ8BZ\` |
| Pubkey comp | \`02f9308a…36f9\` |
| Adresse comp | \`1CUNEBjYrCn2y1SdiUMohaKUi4wpP326Lb\` |
| Eigenwerte | \(2.5366,\ -1.0371,\ -0.1996\) |
| Nonce-Reuse k | 2 |
| LWE Fehlernorm | 1 |

---

## RÜCKWÄRTSANALYSE

| Schritt | Vorwärts | Rückwärts |
|---|---|---|
| (h,n,g,o,r,i) → \(k_i\) | bijektiv | eindeutig bei bekanntem r |
| \(k_i\) → d | mult. mod n | eindeutig bei bekanntem r |
| d → Hex / WIF | Base58Check | invertierbar |
| d → Pubkey | Skalar-Mult | **ECDLP** (nicht effizient) |
| Pubkey → Hash160 | SHA256+RIPEMD160 | **Einweg** \(O(2^{160})\) |
| Hash160 → Adresse | Base58Check | invertierbar |
| affine Pipeline | n→1 | **nicht eindeutig** (diophantisch) |
| Nonce-Reuse Glg.system | – | **eindeutig** bei \(s_1 \ne s_2\) |

\[
\boxed{(h,n,g,o,r,i) \xrightarrow{\text{affine}} d \xrightarrow{\text{ECC}} Q \xrightarrow{\text{H160}} \text{Adresse}}
\]
`;

export const VOLLRECHNUNG_JSON = {
  curve: "secp256k1",
  p: "115792089237316195423570985008687907853269984665640564039457584007908834671663",
  n: "115792089237316195423570985008687907852837564279074904382605163141518161494337",
  G: {
    x: "55066263022277343669578718895168534326250603453777594175500187360389116729240",
    y: "32670510020758816978083085130507043184471273380659243275938904335757337482424",
  },
  omnigenesis: { h: 1, n_nav: 1, g: 1, o: 1, r: 1, i: 0, k_i: 3 },
  privateKey: {
    decimal: 3,
    hex: "0000000000000000000000000000000000000000000000000000000000000003",
  },
  wif: {
    compressed: "KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU74sHUHy8S",
    uncompressed: "5HpHagT65TZzG1PH3CSu63k8DbpvD8s5ip4nEB3kEsreB1FQ8BZ",
  },
  pubkey3G: {
    x: "112711660439710606056748659173929673102114977341539408544630613555209775888121",
    y: "25583027980570883691656905877401976406448868254816295069919888960541586679410",
    xHex: "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",
    yHex: "388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672",
    compressed: "02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",
  },
  address: {
    compressed: "1CUNEBjYrCn2y1SdiUMohaKUi4wpP326Lb",
    uncompressed: "1NZUP3JAc9JkmbvmoTv7nVgZGtyJjirKV1",
    sha256Q: "eae10cdd2f289bdad44615809cb422d2fabe9622ed706ad5d9d3ffd2cdd1c001",
    hash160: "7dd65592d0ab2fe0d0257d571abf032cd9db93dc",
    checksum: "ac074bec",
  },
  matrixA: {
    rows: [
      [0, 0.7, 1.4],
      [0.9, 0.3, 0.5],
      [1.5, 1.0, 1.0],
    ],
    charPoly: "λ³ - 1.3 λ² - 2.93 λ - 0.525 = 0",
    eigenvalues: [2.536654580591124, -1.037091103749855, -0.19956347684126985],
  },
  nonceReuse: {
    k_formula: "k = (z1 - z2) * (s1 - s2)^{-1} mod n",
    d_formula: "d = (k*s1 - z1) * r^{-1} mod n",
    example: { k: 2, d: 3 },
  },
  lwe: {
    q: 17, N: 4, tau: 1,
    ring: "Z_17[X]/(X^4 + 1)",
    s: [2, 13, 0, 3],
    a_diff: [6, 10, 15, 16],
    b: [13, 1, 9, 7],
    e: [1, -1, -1, 0],
    errorNormInf: 1,
  },
  reversibility: {
    "params→d": "eindeutig (r bekannt)",
    "d→pubkey": "ECDLP — nicht effizient invertierbar",
    "pubkey→hash160": "Einweg O(2^160)",
    "affine pipeline": "diophantisch, nicht eindeutig",
    "nonce-reuse": "eindeutig wenn s1≠s2",
  },
} as const;
