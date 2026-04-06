import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { CHAT_TOOLS } from "@/lib/openai-tools";
import { executeChatTool, type ChatToolContext } from "@/lib/chat-tools";
import { handleLocalChat } from "@/lib/local-chat";

const bodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  lastExpenseIds: z.array(z.string()).optional(),
});

const SYSTEM = `You are a helpful financial assistant inside an expense tracking app.
You MUST use the provided tools to read or change the user's data. Never invent amounts or transactions.
After tools run, answer in clear, friendly language with specific numbers and confirmations.
When the user fixes a previous add (e.g. "make that $50"), call update_expense with useLastCreated true.
For bulk deletes affecting multiple rows, if the tool returns needsConfirmation, ask the user to confirm, then call again with confirmed true.
Use ISO dates (YYYY-MM-DD) in tool arguments when interpreting calendar ranges.
For questions like "How much did I spend on food this month?", call get_spending_summary with period this_month and categoryGroup food (aggregates groceries, restaurants, coffee, food).
For "Update yesterday's grocery expense to $52", use update_expense with lookupDateHint yesterday, lookupCategoryHint groceries, and the new amount.
For "Remove all coffee expenses from this week", use delete_expenses_batch with period this_week, categorySlug coffee, confirmed only after the user agrees.
When the user asks "what was my total again" or to repeat a prior figure, use the most recent tool results or your own previous assistant message in this thread — do not guess.
For electricity/utility bills, add_expenses with categoryHint bills or bills-utilities.`;

export async function POST(req: Request) {
  let parsedData: z.infer<typeof bodySchema> | null = null;
  let userId: string | null = null;
  try {
    userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    parsedData = parsed.data;

    const lastIds = [...(parsedData.lastExpenseIds ?? [])];
    const apiKey = process.env.OPENAI_API_KEY ?? "";
    const useLocalFallback = !apiKey || apiKey === "sk-..." || apiKey.startsWith("sk-....");

    if (useLocalFallback) {
      const out = await handleLocalChat({
        userId,
        messages: parsedData.messages,
        lastExpenseIds: lastIds,
      });
      return NextResponse.json(out);
    }

    const openai = new OpenAI({ apiKey });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM },
      ...parsedData.messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    let reply = "";
    const maxRounds = 8;
    for (let round = 0; round < maxRounds; round++) {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages,
        tools: CHAT_TOOLS as OpenAI.Chat.Completions.ChatCompletionTool[],
        tool_choice: "auto",
        temperature: 0.3,
      });
      const choice = completion.choices[0];
      const msg = choice?.message;
      if (!msg) {
        reply = "Sorry, I could not generate a response.";
        break;
      }

      if (msg.tool_calls?.length) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          if (call.type !== "function") continue;
          const name = call.function.name;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
          } catch {
            args = {};
          }
          const ctx: ChatToolContext = { lastExpenseIds: lastIds };
          const { result, newExpenseIds } = await executeChatTool(userId, name, args, ctx);
          if (newExpenseIds?.length) {
            for (const id of newExpenseIds) {
              if (!lastIds.includes(id)) lastIds.unshift(id);
            }
          }
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      reply = msg.content?.trim() || "";
      break;
    }

    if (!reply && messages.length) {
      reply = "Done.";
    }

    return NextResponse.json({
      reply,
      lastExpenseIds: lastIds.slice(0, 20),
    });
  } catch (error) {
    try {
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!parsedData) {
        return NextResponse.json({ error: "Invalid chat payload" }, { status: 400 });
      }
      const out = await handleLocalChat({
        userId,
        messages: parsedData.messages,
        lastExpenseIds: parsedData.lastExpenseIds ?? [],
      });
      return NextResponse.json(out);
    } catch {
      const message =
        error instanceof Error ? error.message : "Chat service failed. Try again.";
      return NextResponse.json({ error: `Chat error: ${message}` }, { status: 500 });
    }
  }
}
