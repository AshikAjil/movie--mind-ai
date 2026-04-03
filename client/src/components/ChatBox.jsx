import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { chatWithAI } from '../services/api.js';

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your MovieMind AI assistant. Ask me for recommendations or questions about movies!" }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send message + last 5 messages for context
      const history = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const data = await chatWithAI(input, history);
      
      const aiMessage = { 
        role: 'assistant', 
        content: data.reply, 
        movies: data.movies // Store movies directly in the message object
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again later." }]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Chat"
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'var(--accent-1)', padding: '0.4rem', borderRadius: '8px' }}>
                <Bot size={20} color="white" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Movie Assistant</h4>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Powered by AI & RAG</p>
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: '0.3rem' }} onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                {msg.role === 'assistant' && (
                  <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-1)' }}>
                    <Sparkles size={12} /> AI ASSISTANT
                  </div>
                )}
                <div>{msg.content}</div>
                
                {/* Embedded Movie Results */}
                {msg.movies && msg.movies.length > 0 && (
                  <div className="chat-movie-results hide-scrollbar">
                    {msg.movies.map((movie) => (
                      <div key={movie._id} className="chat-movie-card">
                        <img 
                          src={movie.poster} 
                          alt={movie.title} 
                          style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }} 
                        />
                        <div style={{ padding: '0.5rem' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--success)', marginTop: '2px' }}>🎯 {movie.matchPercentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="chat-bubble chat-bubble-ai">
                <div className="chat-loading">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              className="chat-input"
              placeholder="Ask for a recommendation..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ padding: '0.6rem' }}
              disabled={loading || !input.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
