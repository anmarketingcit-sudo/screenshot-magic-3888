// Загружается только в браузере (динамический import из parse.ts).
// Legacy-сборка pdf.js работает и в старых мобильных браузерах.
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.min.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const byLine = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items as any[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      const arr = byLine.get(y) ?? [];
      arr.push({ x: item.transform[4], s: item.str });
      byLine.set(y, arr);
    }
    const sorted = [...byLine.entries()].sort((a, b) => b[0] - a[0]);
    out +=
      sorted
        .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(" "))
        .join("\n") + "\n";
  }
  return out;
}
