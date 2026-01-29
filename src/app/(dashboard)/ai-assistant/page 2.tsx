'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader2, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

interface Conversation {
  id: string;
  summary: string;
  context: string;
  messageCount: number;
  lastMessage?: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  };
  updatedAt: string;
}

interface ActionPlan {
  actions: Array<{
    type: 'create' | 'update' | 'delete' | 'link';
    table: string;
    operation: Record<string, unknown>;
    requiresApproval: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  description: string;
  wouldAffect: string[];
}

const CONTEXTS = ['Globale', 'Attività', 'Lead', 'Ordine', 'Cliente'] as const;

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Benvenuto nel tuo Assistente AI! Sono qui per aiutarti a navigare il CRM, rispondendo a domande e eseguendo azioni quando necessario. Cosa posso fare per te?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedContext, setSelectedContext] = useState<
    (typeof CONTEXTS)[number]
  >('Globale');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [pendingActionPlan, setPendingActionPlan] = useState<ActionPlan | null>(
    null
  );
  const [executingActions, setExecutingActions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation history on mount
  useEffect(() => {
    loadConversations();
  }, [selectedContext]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const params = new URLSearchParams({
        context: selectedContext,
        limit: '20',
      });

      const response = await fetch(`/api/ai/conversations?${params}`);
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Errore nel caricamento conversazioni');
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          context: selectedContext,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
          conversationId,
        }),
      });

      if (!response.ok) throw new Error('Errore nella chat AI');

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        intent: data.intent,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      if (data.actionPlan && data.actionPlan.actions.length > 0) {
        setPendingActionPlan(data.actionPlan);
      }

      // Reload conversations
      await loadConversations();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Errore nella richiesta AI');

      const errorMessage: Message = {
        role: 'assistant',
        content: 'Scusa, ho incontrato un errore. Riprova.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeActions = async () => {
    if (!pendingActionPlan) return;

    setExecutingActions(true);

    try {
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionPlan: pendingActionPlan,
          userAuthorization: true,
          conversationId,
        }),
      });

      const data = await response.json();

      console.log('[Execute Response]', data);

      // Handle both success and non-200 responses
      if (!response.ok) {
        const errorMsg = data.error || `API error: ${response.status}`;
        throw new Error(errorMsg);
      }

      // Show result regardless of individual action success
      if (data.actions && data.actions.length > 0) {
        const successCount = data.actions.filter((a: { result: string }) => a.result === 'success').length;
        const totalCount = data.actions.length;

        toast.success(`${successCount}/${totalCount} azioni completate`);

        const resultMessage: Message = {
          role: 'assistant',
          content: `✅ Completato! ${successCount} su ${totalCount} azioni eseguite con successo.${successCount < totalCount ? ' Alcune azioni potrebbero aver fallito.' : ''}`,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, resultMessage]);
        setPendingActionPlan(null);
      } else {
        throw new Error('Nessuna azione disponibile per l\'esecuzione');
      }
    } catch (error) {
      console.error('Execute error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Errore nell\'esecuzione';
      toast.error(errorMsg);
      
      // Still close the authorization bar on error
      setPendingActionPlan(null);
    } finally {
      setExecutingActions(false);
    }
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'high':
        return 'bg-red-500/10 text-red-700 border-red-200';
    }
  };

  const handleNewConversation = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          'Benvenuto in una nuova conversazione! Come posso aiutarti?',
        timestamp: new Date(),
      },
    ]);
    setConversationId(undefined);
    setPendingActionPlan(null);
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Assistente AI" />

        <div className="px-4 lg:px-6">
          <div className="h-[600px] flex overflow-hidden border rounded-lg bg-background">
            {/* Sidebar - Conversation History */}
            <div className="w-64 border-r bg-muted/30 flex flex-col overflow-hidden">
              <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Conversazioni
                  </h2>
                  <Button
                    onClick={handleNewConversation}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    title="Nuova conversazione"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Context Filter */}
                <div className="flex flex-wrap gap-1">
                  {CONTEXTS.map(ctx => (
                    <Badge
                      key={ctx}
                      onClick={() => setSelectedContext(ctx)}
                      className={cn(
                        'cursor-pointer text-xs',
                        selectedContext === ctx
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {ctx}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto space-y-2 p-2">
                {loadingConversations ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : conversations.length > 0 ? (
                  conversations.map(conv => (
                    <Card
                      key={conv.id}
                      onClick={() => setConversationId(conv.id)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        conversationId === conv.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <CardContent className="p-2">
                        <p className="text-xs font-medium truncate">
                          {conv.summary.substring(0, 40)}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {conv.messageCount} messaggi
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    Nessuna conversazione
                  </div>
                )}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                {messages.map((msg, idx) => (
                  <div key={idx}>
                    <div
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[60%] px-4 py-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs opacity-70">
                            {msg.timestamp.toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.intent && (
                            <Badge variant="secondary" className="text-xs">
                              {msg.intent}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-2 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}

                <div ref={scrollRef} />
              </div>

              {/* Action Authorization Bar */}
              {pendingActionPlan && (
                <div className="px-8 py-4 border-t bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          Autorizzazione richiesta per{' '}
                          {pendingActionPlan.actions.length} azioni
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pendingActionPlan.description}
                        </p>

                        {/* Action Details */}
                        <div className="mt-2 space-y-1">
                          {pendingActionPlan.actions
                            .filter((action) => action && action.type)
                            .map((action, idx) => (
                              <div
                                key={idx}
                                className={`text-xs px-2 py-1 rounded ${
                                  action.riskLevel ? getRiskColor(action.riskLevel) : 'bg-gray-100'
                                }`}
                              >
                                {action.type?.toUpperCase() || 'UNKNOWN'} su {action.table || 'unknown'} -{' '}
                                {action.riskLevel && (
                                  <Badge variant="outline" className="text-xs ml-1">
                                    {action.riskLevel}
                                  </Badge>
                                )}
                              </div>
                            ))}
                        </div>

                        <Alert className="mt-2">
                          <Info className="h-3 w-3" />
                          <AlertDescription className="text-xs">
                            Interessati: {pendingActionPlan.wouldAffect.join(', ')}
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        onClick={() => setPendingActionPlan(null)}
                        variant="outline"
                        size="sm"
                        disabled={executingActions}
                      >
                        Annulla
                      </Button>
                      <Button
                        onClick={handleAuthorizeActions}
                        size="sm"
                        disabled={executingActions}
                      >
                        {executingActions ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Esecuzione...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Autorizza
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="px-8 py-4 border-t space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Chiedi qualsiasi cosa al tuo assistente AI..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter' && !loading) {
                        handleSendMessage();
                      }
                    }}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={loading || !input.trim()}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  L'assistente AI può accedere all'intero database CRM e eseguire
                  azioni quando autorizzato
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
