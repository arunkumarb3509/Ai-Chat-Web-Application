import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RotateCw, FileText, ChevronDown, ChevronUp, Bot, User } from 'lucide-react';

export function MessageItem({ message, isLastAssistant, onRetry }) {
  const [copied, setCopied] = useState(false);
  const [showAllCitations, setShowAllCitations] = useState(false);
  const isUser = message.role === 'user';

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-bubble">
        {isUser ? (
          <div>{message.content}</div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && language) {
                    return <CodeBlock language={language} code={codeString} />;
                  }

                  return (
                    <code className="inline-code" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>

            {message.isStreaming && <span className="streaming-cursor" />}

            {/* Citations section */}
            {message.citations && message.citations.length > 0 && (
              <div className="citations-container">
                <div className="citations-header">
                  <FileText size={14} />
                  <span>Sources & References ({message.citations.length})</span>
                </div>
                <div className="citation-cards">
                  {(showAllCitations
                    ? message.citations
                    : message.citations.slice(0, 3)
                  ).map((cite, idx) => (
                    <div key={idx} className="citation-card" title={cite.snippet}>
                      <span className="citation-title">
                        {cite.filename} {cite.page ? `• p. ${cite.page}` : ''}
                      </span>
                      <span className="citation-snippet">"{cite.snippet}"</span>
                    </div>
                  ))}
                  {message.citations.length > 3 && (
                    <button
                      className="footer-btn"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }}
                      onClick={() => setShowAllCitations(!showAllCitations)}
                    >
                      {showAllCitations ? 'Show Less' : `+${message.citations.length - 3} more`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="message-meta">
        <span>{isUser ? 'You' : 'Assistant'}</span>
        {!isUser && !message.isStreaming && (
          <>
            <button
              className="action-icon-btn"
              onClick={handleCopyMessage}
              title="Copy answer"
            >
              {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
            </button>
            {isLastAssistant && onRetry && (
              <button
                className="action-icon-btn"
                onClick={onRetry}
                title="Regenerate answer"
              >
                <RotateCw size={13} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-header">
        <span>{language || 'text'}</span>
        <button className="code-copy-btn" onClick={copyCode}>
          {copied ? (
            <>
              <Check size={12} color="var(--success)" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

