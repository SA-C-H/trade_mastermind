import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatMsg = { role: string; content: string };

/** Retry on 429 (provider rate limits). Respects Retry-After when present. */
async function fetchWithRateLimitRetry(doFetch: () => Promise<Response>, maxAttempts = 4): Promise<Response> {
  let last: Response | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await doFetch();
    if (last.ok) return last;
    if (last.status !== 429) return last;
    if (attempt === maxAttempts - 1) break;
    const ra = last.headers.get("retry-after");
    const sec = ra ? parseInt(ra, 10) : NaN;
    const waitMs = Number.isFinite(sec) && sec > 0
      ? Math.min(sec * 1000, 25_000)
      : Math.min(1500 * 2 ** attempt, 12_000);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  return last!;
}

function extractSystemAndRest(messages: ChatMsg[]): { system: string; rest: ChatMsg[] } {
  const systemParts: string[] = [];
  const rest: ChatMsg[] = [];
  for (const m of messages) {
    if (m.role === "system") systemParts.push(m.content);
    else rest.push(m);
  }
  return { system: systemParts.join("\n\n"), rest };
}

/** Anthropic only allows user/assistant; merge consecutive same role. */
function toAnthropicMessages(msgs: ChatMsg[]): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of msgs) {
    if (m.role === "system") continue;
    const role: "user" | "assistant" = m.role === "assistant" ? "assistant" : "user";
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.content += "\n\n" + m.content;
    } else {
      out.push({ role, content: m.content });
    }
  }
  if (out.length > 0 && out[0].role === "assistant") {
    out.unshift({ role: "user", content: "Please respond based on the conversation context." });
  }
  return out;
}

/** Map Claude SSE stream → OpenAI-style chunks for the existing web client. */
function anthropicStreamToOpenAISSE(anthropicBody: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const reader = anthropicBody.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/\r\n\r\n|\n\n/);
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            if (!part.trim()) continue;
            const lines = part.split(/\r?\n/);
            let dataJson: string | null = null;
            for (const line of lines) {
              if (line.startsWith("data:")) {
                dataJson = line.slice(5).trim();
              }
            }
            if (!dataJson) continue;
            try {
              const ev = JSON.parse(dataJson) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && typeof ev.delta.text === "string") {
                const chunk = JSON.stringify({
                  choices: [{ delta: { content: ev.delta.text } }],
                });
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
              }
            } catch {
              /* ignore non-JSON / pings */
            }
          }
        }
        if (buffer.trim()) {
          for (const line of buffer.split(/\r?\n/)) {
            if (!line.startsWith("data:")) continue;
            try {
              const ev = JSON.parse(line.slice(5).trim()) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && typeof ev.delta.text === "string") {
                const chunk = JSON.stringify({ choices: [{ delta: { content: ev.delta.text } }] });
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
              }
            } catch {
              /* */
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

async function providerFailureResponse(
  response: Response,
  provider: "anthropic" | "openai",
): Promise<Response> {
  const t = await response.text();
  console.error(`AI provider (${provider})`, response.status, t);
  let detail = "";
  try {
    const j = JSON.parse(t) as {
      error?: { message?: string; type?: string } | string;
      message?: string;
    };
    if (typeof j.error === "object" && j.error?.message) detail = j.error.message;
    else if (typeof j.error === "string") detail = j.error;
    else if (typeof j.message === "string") detail = j.message;
    else detail = t.slice(0, 800);
  } catch {
    detail = t.slice(0, 800);
  }

  let message: string;
  if (response.status === 401 || response.status === 403) {
    message =
      provider === "anthropic"
        ? `Claude / Anthropic: clé refusée (HTTP ${response.status}). ${detail} — Crée une clé sur console.anthropic.com → API Keys, colle-la dans le secret ANTHROPIC_API_KEY (sans espace avant/après), enregistre et redéploie la fonction.`
        : `OpenAI: clé refusée (HTTP ${response.status}). ${detail} — Vérifie OPENAI_API_KEY dans les secrets Supabase (clé sk-... complète).`;
  } else {
    message = `Erreur fournisseur (${response.status}): ${detail}`;
  }

  return new Response(JSON.stringify({ error: message }), {
    status: 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function systemPrompts(): Record<string, string> {
  return {
    coach: `You are an expert trading coach and mentor. You analyze traders' performance data, provide actionable feedback on discipline, risk management, and psychology. You help traders improve their edge by identifying patterns in their behavior and results. Be direct, supportive, and data-driven. Use trading terminology naturally. Format your responses with markdown for readability.`,
    analysis: `You are an expert trade analyst. When given trade data, you provide detailed analysis including:
- Entry/exit quality assessment
- Risk management evaluation
- Pattern recognition across multiple trades
- Specific, actionable improvements
- Emotional pattern detection
Be precise with numbers and honest about mistakes. Use markdown formatting.`,
    sentiment: `You are a market sentiment analyst specializing in forex and commodities. You provide:
- Current market sentiment analysis for given instruments
- Key economic events and their potential impact
- Technical and fundamental confluence analysis
- Risk factors to watch
Be concise and actionable. Use markdown formatting. Note: You provide educational analysis, not financial advice.`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = (await req.json()) as {
      messages: ChatMsg[];
      mode: string;
    };

    const prompts = systemPrompts();
    const systemMessage = prompts[mode] ?? prompts.coach;
    const openaiMessages: ChatMsg[] = [{ role: "system", content: systemMessage }, ...messages];

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim() || "";
    /** Model id from Anthropic dashboard, e.g. claude-3-5-sonnet-20241022 */
    const claudeModel = Deno.env.get("CLAUDE_MODEL")?.trim() ?? "claude-3-5-sonnet-20241022";
    const claudeMaxTokens = parseInt(Deno.env.get("CLAUDE_MAX_TOKENS") ?? "8192", 10);

    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const openaiModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

    let response: Response;
    let aiProvider: "anthropic" | "openai" | null = null;

    if (openaiKey) {
      aiProvider = "openai";
      const body = JSON.stringify({
        model: openaiModel,
        messages: openaiMessages,
        stream: true,
      });
      response = await fetchWithRateLimitRetry(() =>
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body,
        })
      );
    } else if (anthropicKey) {
      aiProvider = "anthropic";
      const { system, rest } = extractSystemAndRest(openaiMessages);
      const anthropicMessages = toAnthropicMessages(rest);
      const bodyObj: Record<string, unknown> = {
        model: claudeModel,
        max_tokens: Number.isFinite(claudeMaxTokens) && claudeMaxTokens > 0 ? claudeMaxTokens : 8192,
        stream: true,
        messages: anthropicMessages,
      };
      if (system.trim()) {
        bodyObj.system = system;
      }
      const body = JSON.stringify(bodyObj);

      response = await fetchWithRateLimitRetry(() =>
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body,
        })
      );

      if (response.ok && response.body) {
        const transformed = anthropicStreamToOpenAISSE(response.body);
        return new Response(transformed, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
      if (response.ok && !response.body) {
        return new Response(JSON.stringify({ error: "Empty response stream from Claude." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(
        JSON.stringify({
          error:
            "No AI secret found. In Supabase → Edge Functions → Secrets add OPENAI_API_KEY (recommended) or ANTHROPIC_API_KEY as fallback, then redeploy ai-assistant.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "Insufficient quota or billing (Anthropic/OpenAI). Check your provider account, payment method, and balance.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiProvider) {
        return await providerFailureResponse(response, aiProvider);
      }
      const t = await response.text();
      console.error("AI provider error:", response.status, t);
      return new Response(
        JSON.stringify({ error: `AI provider error (${response.status}). ${t.slice(0, 400)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
