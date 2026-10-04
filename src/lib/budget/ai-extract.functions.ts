import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  fileName: z.string().max(200),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(10).max(14_000_000),
  categories: z.array(z.string().max(80)).max(60),
});

export type AiTx = {
  date: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  category: string | null;
};

export const extractWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ items: AiTx[]; error: string | null }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { items: [], error: "Сервис распознавания не настроен." };

    const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
    const filePart =
      data.mimeType === "application/pdf"
        ? { type: "file", file: { filename: data.fileName, file_data: dataUrl } }
        : { type: "image_url", image_url: { url: dataUrl } };

    const prompt = `Это банковская выписка или чек (Казахстан, тенге). Извлеки все операции.
Верни строго JSON: {"items":[{"date":"YYYY-MM-DD","amount":число без знака,"type":"income"|"expense","description":"кратко","category":одна из списка или null}]}.
Категории: ${data.categories.join("; ")}.
Если операций нет — {"items":[]}.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, filePart] }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`AI extract failed [${res.status}]: ${body}`);
      if (res.status === 429) return { items: [], error: "Слишком много запросов. Попробуйте через минуту." };
      if (res.status === 402) return { items: [], error: "Закончился лимит распознавания. Пополните баланс в настройках." };
      return { items: [], error: `Не удалось распознать файл (код ${res.status}).` };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "";
    try {
      const cleaned = content.replace(/^```(?:json)?|```$/g, "").trim();
      const parsed = JSON.parse(cleaned) as { items?: AiTx[] };
      return { items: Array.isArray(parsed.items) ? parsed.items : [], error: null };
    } catch {
      console.error("AI extract: bad JSON", content.slice(0, 500));
      return { items: [], error: "Ответ распознавания не удалось прочитать. Попробуйте ещё раз." };
    }
  });
