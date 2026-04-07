import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import { parseAIText, formatINR, answerFinanceQuestion } from '../../utils/financeUtils';
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

const AIChatbot: React.FC<AIChatbotProps> = ({ onAddTransaction, currentUser, transactions, apiKey }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Revive date objects
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: '1', sender: 'ai', timestamp: new Date(),
        text: 'hi, i\'m your advanced finance assistant powered by gemini.\n\nadd entries like "sales, cash received 312 and 120 UPI" or ask questions like "what\'s my profit?"',
      },
    ];
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
      setMessages([{
        id: Date.now().toString(), sender: 'ai', timestamp: new Date(),
        text: 'chat history cleared.'
      }]);
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
      setMessages(p => [...p, { id: (Date.now()+1).toString(), sender: 'ai', timestamp: new Date(), text: 'API key is missing! Please configure your Gemini API Key in the Settings panel below to enable AI parsing.' }]);
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
    } catch (err) {
      setMessages(p => [...p, {
        id: Date.now().toString(), sender: 'ai', timestamp: new Date(),
        text: 'Sorry, I hit an error connecting to Gemini. Is your API key valid?',
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
      <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>finance ai</h2>
          <p style={{ fontSize: '0.6875rem', color: 'var(--green)', margin: '0.125rem 0 0' }}>● online</p>
        </div>
        <button onClick={clearHistory} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)' }} aria-label="Clear chat">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Quick chips */}
      <div className="scroll-x" style={{ marginBottom: '0.75rem', gap: '0.375rem' }}>
        {CHIPS.map(c => (
          <button key={c} className="chip" onClick={() => process(c)} style={{ fontSize: '0.625rem' }}>
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
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ background: 'var(--bg-0)', padding: '0.5rem', borderRadius: 'var(--radius-s)' }}>
                    {m.pendingTransactions.map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: i < m.pendingTransactions!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-1)' }}>{t.type} • {t.category} ({t.paymentType})</span>
                        <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 500, color: t.type === 'sale' ? 'var(--green)' : 'var(--red)' }}>
                           {formatINR(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button onClick={() => confirmAll(m.id, m.pendingTransactions!)} style={{
                      flex: 1, padding: '0.5rem', background: 'var(--green-soft)', color: 'var(--green)',
                      borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 600, border: 'none',
                    }}>approve all</button>
                    <button onClick={() => reject(m.id)} style={{
                      flex: 1, padding: '0.5rem', background: 'var(--red-soft)', color: 'var(--red)',
                      borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 600, border: 'none',
                    }}>cancel</button>
                  </div>
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.5625rem', color: 'var(--text-4)', marginTop: '0.2rem', textAlign: m.sender === 'user' ? 'right' : 'left', padding: '0 0.25rem' }}>
              {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
        <input
          type="text"
          placeholder={apiKey ? "add entry or ask a question..." : "Enter key in Settings first!"}
          disabled={!apiKey}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isTyping && process(inputText)}
          className="input"
          style={{ flex: 1, borderRadius: 'var(--radius-full)', padding: '0.625rem 1rem', fontSize: '0.8125rem', opacity: apiKey ? 1 : 0.5 }}
        />
        <button
          disabled={!apiKey || isTyping}
          onClick={() => inputText.trim() && process(inputText)}
          className="btn-primary"
          style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, flexShrink: 0, opacity: apiKey && !isTyping ? 1 : 0.5 }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};

export default AIChatbot;
