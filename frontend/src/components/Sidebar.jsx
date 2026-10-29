import React, { useState } from 'react';
import {
  MessageSquarePlus,
  MessageSquare,
  FileText,
  Moon,
  Sun,
  Trash2,
  Edit2,
  Check,
  X,
  User as UserIcon,
  Bot,
  Sparkles,
} from 'lucide-react';

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  mode,
  onModeChange,
  theme,
  onToggleTheme,
  onOpenDocuments,
  documentCount = 0,
  currentUser,
  onOpenAuth,
  onLogout,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEditing = (convId, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={18} />
          </div>
          <span>Antigravity AI</span>
        </div>
      </div>

      {/* New Chat Button */}
      <button className="new-chat-btn" onClick={onNewChat}>
        <MessageSquarePlus size={18} />
        <span>New Conversation</span>
      </button>

      {/* Mode Switcher */}
      <div className="mode-selector-container">
        <div className="mode-label">Chat Mode</div>
        <div className="mode-selector">
          <button
            className={`mode-tab ${mode === 'auto' ? 'active' : ''}`}
            onClick={() => onModeChange('auto')}
            title="Automatically routes queries: uses uploaded documents if relevant, otherwise general LLM"
          >
            Auto
          </button>
          <button
            className={`mode-tab ${mode === 'general' ? 'active' : ''}`}
            onClick={() => onModeChange('general')}
            title="General AI conversation (programming, science, daily life)"
          >
            General
          </button>
          <button
            className={`mode-tab ${mode === 'rag' ? 'active' : ''}`}
            onClick={() => onModeChange('rag')}
            title="Strict Document Q&A using uploaded files"
          >
            RAG Docs
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No conversations yet. Start a new chat!
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                className={`conversation-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="conversation-title-wrap">
                  <MessageSquare size={16} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing(conv.id, e);
                        if (e.key === 'Escape') cancelEditing(e);
                      }}
                      autoFocus
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--accent)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        padding: '2px 6px',
                        fontSize: '0.85rem',
                        width: '130px',
                      }}
                    />
                  ) : (
                    <span>{conv.title}</span>
                  )}
                </div>

                <div className="conversation-actions">
                  {isEditing ? (
                    <>
                      <button className="action-icon-btn" onClick={(e) => saveEditing(conv.id, e)}>
                        <Check size={14} color="var(--success)" />
                      </button>
                      <button className="action-icon-btn" onClick={cancelEditing}>
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="action-icon-btn"
                        title="Rename"
                        onClick={(e) => startEditing(conv, e)}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="action-icon-btn delete"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this conversation?')) {
                            onDeleteConversation(conv.id);
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Controls */}
      <div className="sidebar-footer">
        {/* Document Knowledge Base Trigger */}
        <button className="footer-btn" onClick={onOpenDocuments}>
          <FileText size={16} />
          <span>Knowledge Base</span>
          <span className="footer-btn-badge">{documentCount}</span>
        </button>

        {/* Theme Toggle */}
        <button className="footer-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
        </button>

        {/* User Auth Profile */}
        <button
          className="footer-btn"
          onClick={currentUser ? onLogout : onOpenAuth}
          title={currentUser ? `Logged in as ${currentUser.username}` : 'Sign in'}
        >
          <UserIcon size={16} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser ? currentUser.username : 'Sign In / Register'}
          </span>
          {currentUser && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Logout
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

