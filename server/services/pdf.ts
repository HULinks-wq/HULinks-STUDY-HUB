export async function parsePdf(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse");
  const fn = (mod.default ?? mod) as (buf: Buffer) => Promise<{ text: string }>;
  const res = await fn(buffer);
  return res.text?.trim() ?? "";
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}
