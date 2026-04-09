import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import { formatINR, answerFinanceQuestion, parseAIText } from '../../utils/financeUtils';
import { parseWithGemini, type GeminiParsedTransaction } from '../../utils/geminiUtils';
import type { Transaction } from '../../types';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  pendingTransactions?: GeminiParsedTransaction[];
}

interface AIChatbotProps {
  onAddTransaction: (t: any) => void;
  currentUser: any;
  transactions: Transaction[];
  apiKey: string;
}

const CHIPS = [
  'what is my profit?',
  'where is money going?',
  'cash flow status',
  'cogs breakdown',
  'total sales',
];

const CHAT_STORAGE_KEY = 'cafeflow_chat_history';
const CHAT_VERSION_KEY = 'cafeflow_chat_version';
const CHAT_VERSION = '4'; // Bump this to clear old cached chat history

const getWelcomeMessage = (): Message => ({
  id: '1', sender: 'ai', timestamp: new Date(),
  text: 'hi, i\'m your finance assistant.\n\nadd entries like "sales cash 500" or ask "what\'s my profit this month?"',
});

const AIChatbot: React.FC<AIChatbotProps> = ({ onAddTransaction, currentUser: _currentUser, transactions, apiKey }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    // If the stored chat version doesn't match, clear old (possibly corrupted) history
    const storedVersion = localStorage.getItem(CHAT_VERSION_KEY);
    if (storedVersion !== CHAT_VERSION) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      localStorage.setItem(CHAT_VERSION_KEY, CHAT_VERSION);
      return [getWelcomeMessage()];
    }
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Revive date objects
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {
        return [getWelcomeMessage()];
      }
    }
    return [getWelcomeMessage()];
  });


  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  const clearHistory = () => {
    if (confirm('Clear chat history?')) {
      setMessages([getWelcomeMessage()]);
    }
  };

  const process = async (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() };
    setMessages(p => [...p, userMsg]);
    setInputText('');

    const answer = answerFinanceQuestion(text, transactions);
    if (answer) {
      setTimeout(() => {
        setMessages(p => [...p, { id: (Date.now()+1).toString(), sender: 'ai', text: answer, timestamp: new Date() }]);
      }, 400);
      return;
    }

    if (!apiKey) {
      const localParsed = parseAIText(text);
      if (localParsed && localParsed.amount > 0) {
        setMessages(p => [...p, {
          id: Date.now().toString(), sender: 'ai', timestamp: new Date(),
          text: `I understood this transaction locally. Approve it?\n\n(Tip: Add a Gemini API key in Settings for much smarter AI parsing.)`,
          pendingTransactions: [localParsed as any],
        }]);
      } else {
        setMessages(p => [...p, { 
          id: Date.now().toString(), sender: 'ai', timestamp: new Date(), 
          text: "I couldn't understand that in offline mode.\n\nTry simple formats like 'sales cash 500', or ask basic questions like 'total profit'.\n\nFor advanced conversational parsing, add a Gemini API key in Settings!" 
        }]);
      }
      return;
    }

    setIsTyping(true);
    try {
      const parsedIntent = await parseWithGemini(text, apiKey, transactions);
      
      if (parsedIntent.isQuestion && parsedIntent.answerText) {
        setMessages(p => [...p, {
          id: Date.now().toString(), sender: 'ai', timestamp: new Date(),
          text: parsedIntent.answerText!
        }]);
      } else if (!parsedIntent.isQuestion && parsedIntent.extractedTransactions && parsedIntent.extractedTransactions.length > 0) {
        const txns = parsedIntent.extractedTransactions;
        setMessages(p => [...p, {
          id: Date.now().toString(), sender: 'ai', timestamp: new Date(),
          text: `I understood ${txns.length} transaction${txns.length > 1 ? 's' : ''}. approve them?`,
          pendingTransactions: txns,
        }]);
      } else {
        setMessages(p => [...p, {
          id: Date.now().toString(), sender: 'ai', timestamp: new Date(),
          text: 'I couldn\'t extract any transactions or answer that. Try being more specific.',
        }]);
      }
    } catch (err: any) {
      let errorMsg = `Sorry, I hit an error connecting to Gemini: ${err.message || err}`;
      if (err.message && err.message.includes('429')) {
        errorMsg = `⏳ **Rate limit hit!** \n\nGemini API's free tier has a limit of 15 requests per minute. You're chatting a bit too fast—please wait about 30 seconds and try again!`;
      }
      setMessages(p => [...p, {
        id: Date.now().toString(), sender: 'ai', timestamp: new Date(),
        text: errorMsg,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const confirmAll = (id: string, txns: GeminiParsedTransaction[]) => {
    txns.forEach(txn => {
      onAddTransaction({
        ...txn,
        date: new Date().toISOString()
      });
    });
    setMessages(p => p.map(m => m.id === id ? { ...m, text: `✓ successfully added ${txns.length} transaction${txns.length > 1 ? 's' : ''}.`, pendingTransactions: undefined } : m));
  };

  const reject = (id: string) => {
    setMessages(p => p.map(m => m.id === id ? { ...m, text: 'cancelled.', pendingTransactions: undefined } : m));
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 140px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-medium" style={{ fontSize: '1rem', margin: 0 }}>finance ai</h2>
          <p className="text-light" style={{ fontSize: '0.6875rem', color: apiKey ? 'var(--green)' : 'var(--yellow)', margin: '0.125rem 0 0' }}>
            {apiKey ? '● gemini online' : '◌ local mode'}
          </p>
        </div>
        <button onClick={clearHistory} className="btn-ghost" style={{ width: '48px' }} aria-label="Clear chat">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Quick chips */}
      <div className="scroll-x" style={{ marginBottom: 'var(--spacing-sm)', gap: 'var(--spacing-sm)' }}>
        {CHIPS.map(c => (
          <button key={c} className="chip" onClick={() => process(c)} style={{ fontSize: '0.625rem', borderRadius: '12px' }}>
            <Sparkles size={8} /> {c}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <div style={{
              padding: '0.75rem 0.875rem',
              borderRadius: m.sender === 'user'
                ? 'var(--radius-l) var(--radius-l) 4px var(--radius-l)'
                : 'var(--radius-l) var(--radius-l) var(--radius-l) 4px',
              background: m.sender === 'user' ? 'var(--text-0)' : 'var(--bg-2)',
              color: m.sender === 'user' ? 'var(--bg-0)' : 'var(--text-0)',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
            }}>
              {m.text}
              {m.pendingTransactions && (
                <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  <div style={{ background: 'var(--bg-0)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-m)' }}>
                    {m.pendingTransactions.map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: i < m.pendingTransactions!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span className="text-regular" style={{ fontSize: '0.6875rem', color: 'var(--text-1)' }}>{t.type} • {t.category} ({t.paymentType})</span>
                        <span className="mono text-medium" style={{ fontSize: '0.75rem', color: t.type === 'sale' ? 'var(--green)' : 'var(--red)' }}>
                           {formatINR(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button onClick={() => confirmAll(m.id, m.pendingTransactions!)} className="btn-primary" style={{
                      flex: 1, fontSize: '0.6875rem'
                    }}>approve all</button>
                    <button onClick={() => reject(m.id)} className="btn-secondary" style={{
                      flex: 1, fontSize: '0.6875rem'
                    }}>cancel</button>
                  </div>
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.5625rem', color: 'var(--text-4)', marginTop: '0.2rem', textAlign: m.sender === 'user' ? 'right' : 'left', padding: '0 0.25rem' }}>
              {m.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        ))}
        {isTyping && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '82%' }}>
             <p style={{ fontSize: '0.6875rem', color: 'var(--text-3)', fontStyle: 'italic', margin: '0 0.5rem' }}>Gemini is thinking...</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--border)', marginTop: 'var(--spacing-sm)' }}>
        <input
          type="text"
          placeholder={apiKey ? "add entry or ask a question..." : "ask a question or add entry..."}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isTyping && inputText.trim() && process(inputText)}
          className="input text-regular"
          style={{ flex: 1 }}
        />
        <button
          disabled={isTyping}
          onClick={() => inputText.trim() && process(inputText)}
          className="btn-primary"
          style={{ width: '48px', padding: 0, flexShrink: 0, opacity: !isTyping ? 1 : 0.5 }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};

export default AIChatbot;
