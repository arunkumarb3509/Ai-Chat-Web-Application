import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Sparkles, Trash2, AlertCircle, Bot, Code2, Globe, FileQuestion } from 'lucide-react';
import { MessageItem } from './MessageItem';

export function ChatArea({
  activeConversation,
  messages,
  isGenerating,
  error,
  mode,
  onSendMessage,
  onStopGeneration,
  onRetryLastMessage,
  onClearChat,
  onOpenDocuments,
}) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll on new messages or streaming chunks
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Adjust textarea height automatically
  const handleInput = (e) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const suggestions = [
    {
      title: 'Python & FastAPI',
      desc: 'Build an async REST endpoint with Pydantic validation',
      icon: <Code2 size={18} color="var(--accent)" />,
      prompt: 'Write a Python FastAPI async endpoint with Pydantic request validation and clean error handling.',
    },
    {
      title: 'Tamil & Tanglish (தமிழ்)',
      desc: 'Vanakkam! Ask questions in Tamil or Tanglish',
      icon: <Globe size={18} color="#a855f7" />,
      prompt: 'வணக்கம்! செயற்கை நுண்ணறிவு (AI) எவ்வாறு இயங்குகிறது என்று எளிய தமிழில் விளக்குங்கள்.',
    },
    {
      title: 'Document Q&A (RAG)',
      desc: 'Ask questions based on your uploaded files',
      icon: <FileQuestion size={18} color="var(--success)" />,
      prompt: 'Summarize the primary conclusions from the uploaded documents and cite the source pages.',
    },
    {
      title: 'Full-Stack Architecture',
      desc: 'Explain React state management and streaming SSE',
      icon: <Sparkles size={18} color="#f59e0b" />,
      prompt: 'Explain how Server-Sent Events (SSE) work between a React frontend and Python FastAPI backend.',
    },
  ];

  return (
    <main className="main-chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-title">
          <span>{activeConversation ? activeConversation.title : 'New Chat'}</span>
          <span className={`mode-badge ${mode}`}>
            {mode === 'auto' ? 'Auto Router' : mode === 'rag' ? 'RAG Mode' : 'General Chat'}
          </span>
        </div>

        {messages.length > 0 && (
          <button
            className="action-icon-btn"
            onClick={onClearChat}
            title="Clear current conversation"
          >
            <Trash2 size={16} />
          </button>
        )}
      </header>

      {/* Message Scroll Area */}
      <div className="chat-scroll-area" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Sparkles size={32} />
            </div>
            <h2>How can I assist you today?</h2>
            <p>
              Ask any question across programming, science, business, or daily life.
              Upload custom documents to ground answers with verified citations.
            </p>

            <div className="suggestion-grid">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  className="suggestion-btn"
                  onClick={() => onSendMessage(sug.prompt)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sug.icon}
                    <span className="title">{sug.title}</span>
                  </div>
                  <span className="desc">{sug.desc}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isLastAssistant =
              msg.role === 'assistant' && index === messages.length - 1;
            return (
              <MessageItem
                key={msg.id || index}
                message={msg}
                isLastAssistant={isLastAssistant}
                onRetry={onRetryLastMessage}
              />
            );
          })
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ margin: '0 24px', padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--danger)' }}>
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
        </div>
      )}

      {/* Composer Input Area */}
      <div className="chat-composer-container">
        <div className="composer-box">
          <button
            className="composer-btn attach"
            title="Upload Document for RAG"
            onClick={onOpenDocuments}
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            className="composer-textarea"
            rows={1}
            placeholder={
              mode === 'rag'
                ? 'Ask a question grounded in your uploaded documents...'
                : 'Message Antigravity AI (Enter to send, Shift+Enter for new line)...'
            }
            value={inputText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          />

          <div className="composer-actions">
            {isGenerating ? (
              <button
                className="composer-btn stop"
                title="Stop Generating"
                onClick={onStopGeneration}
              >
                <Square size={16} fill="white" />
              </button>
            ) : (
              <button
                className="composer-btn send"
                title="Send Message"
                disabled={!inputText.trim()}
                onClick={handleSubmit}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="composer-footnote">
          Antigravity AI can make mistakes. Verify critical facts and consult cited sources.
        </div>
      </div>
    </main>
  );
}

