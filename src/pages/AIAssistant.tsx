import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Sparkles, BarChart3, Globe, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrades } from '@/hooks/use-trades';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { buildTradeContext, aiUserQuestionPrefix } from '@/lib/ai-trade-context';
import { getAiQuickPrompts, type AiModeId } from '@/i18n/translations';
import { supabase } from '@/integrations/supabase/client';
import { getBearerTokenForEdgeFunctions } from '@/lib/edge-function-auth';

type Mode = AiModeId;
type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const modeIds: Mode[] = ['coach', 'analysis', 'sentiment'];
const modeIcons = { coach: Sparkles, analysis: BarChart3, sentiment: Globe };

async function streamChat({
  messages,
  mode,
  onDelta,
  onDone,
  errRate,
  errCredits,
}: {
  messages: Msg[];
  mode: Mode;
  onDelta: (t: string) => void;
  onDone: () => void;
  errRate: string;
  errCredits: string;
}) {
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const body = JSON.stringify({ messages, mode });

  const doFetch = async (retryAfterRefresh: boolean): Promise<Response> => {
    let token: string;
    try {
      token = await getBearerTokenForEdgeFunctions();
    } catch {
      throw new Error('EDGE_AUTH_FAILED');
    }
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: anon,
      },
      body,
    });
    if (resp.status === 401 && !retryAfterRefresh) {
      await supabase.auth.refreshSession();
      return doFetch(true);
    }
    return resp;
  };

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  let resp = await doFetch(false);
  for (let attempt = 0; attempt < 2 && resp.status === 429; attempt++) {
    await sleep(2000 + attempt * 2000);
    resp = await doFetch(false);
  }

  if (resp.status === 401) {
    throw new Error('HTTP_401_EDGE');
  }

  if (resp.status === 429) {
    toast.error(errRate);
    onDone();
    return;
  }
  if (resp.status === 402) {
    toast.error(errCredits);
    onDone();
    return;
  }
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const j = (await resp.json()) as { error?: string };
      if (typeof j.error === 'string' && j.error) detail = j.error;
    } catch {
      /* keep detail */
    }
    throw new Error(detail);
  }
  if (!resp.body) throw new Error('No response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });
    let ni: number;
    while ((ni = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, ni);
      buf = buf.slice(ni + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') {
        done = true;
        break;
      }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
  onDone();
}

export default function AIAssistant() {
  const { locale, t } = useI18n();
  const { data: trades = [] } = useTrades();
  const [mode, setMode] = useState<Mode>('coach');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const modeMeta = useMemo(
    () =>
      modeIds.map((id) => ({
        id,
        icon: modeIcons[id],
        label: t(`ai.modes.${id}`),
        desc: t(`ai.modesDesc.${id}`),
      })),
    [t]
  );

  const quickPrompts = useMemo(() => getAiQuickPrompts(locale, mode), [locale, mode]);

  const packUser = useCallback(
    (text: string) => {
      const prefix = aiUserQuestionPrefix(locale);
      return mode !== 'sentiment'
        ? `${buildTradeContext(trades, locale)}\n\n${prefix} ${text}`
        : text;
    },
    [locale, mode, trades]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: packUser(input.trim()) };
    const displayMsg: Msg = { role: 'user', content: input.trim() };

    setMessages((prev) => [...prev, displayMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const allMsgs = [
        ...messages.map((m) =>
          m.role === 'user' ? { ...m, content: packUser(m.content) } : m
        ),
        userMsg,
      ];
      await streamChat({
        messages: allMsgs,
        mode,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        errRate: t('common.rateLimit'),
        errCredits: t('common.aiCredits'),
      });
    } catch (e) {
      console.error(e);
      const fallback = t('ai.errorResponse');
      let msg = e instanceof Error && e.message && e.message !== 'stream' ? e.message : fallback;
      if (e instanceof Error && e.message === 'EDGE_AUTH_FAILED') {
        msg = t('ai.errorAuth');
      }
      if (e instanceof Error && e.message === 'HTTP_401_EDGE') {
        msg = t('ai.errorUnauthorized');
      }
      toast.error(msg.length > 280 ? `${msg.slice(0, 277)}…` : msg);
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const currentMode = modeMeta.find((m) => m.id === mode)!;

  return (
    <div className="p-4 lg:p-6 h-[calc(100vh-0px)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> {t('ai.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('ai.subtitle')}</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="gap-1.5 text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5" /> {t('ai.clear')}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {modeMeta.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              setMessages([]);
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
              mode === m.id
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <m.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}
      </div>

      <Card className="flex-1 bg-card border-border flex flex-col overflow-hidden min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <currentMode.icon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{currentMode.label}</h2>
                <p className="text-sm text-muted-foreground max-w-md mt-1">{currentMode.desc}</p>
              </div>
              <div className="flex flex-wrap gap-2 max-w-lg justify-center">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="px-3 py-1.5 rounded-full text-xs bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-4 py-3 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 text-foreground'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs [&_code]:bg-muted/30 [&_code]:px-1 [&_code]:rounded">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{t('ai.thinking')}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={t('ai.placeholder')}
              className="flex-1 min-h-[44px] max-h-32 resize-none bg-secondary/30 border-border text-sm"
              rows={1}
            />
            <Button onClick={() => void send()} disabled={!input.trim() || isLoading} size="icon" className="h-11 w-11 flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">{t('ai.disclaimer')}</p>
        </div>
      </Card>
    </div>
  );
}
