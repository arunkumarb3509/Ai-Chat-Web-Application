import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { DocumentModal } from './components/DocumentModal';
import { AuthModal } from './components/AuthModal';
import { useChat } from './hooks/useChat';
import { api, getAuthToken, removeAuthToken } from './services/api';
import './styles/main.css';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('ai_chat_theme') || 'dark');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [documentCount, setDocumentCount] = useState(0);

  const {
    conversations,
    activeConversationId,
    messages,
    isGenerating,
    error,
    mode,
    setMode,
    selectConversation,
    startNewChat,
    renameConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
    retryLastMessage,
    loadConversations,
  } = useChat();

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ai_chat_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check auth and load documents count
  const checkAuthAndData = async () => {
    const token = getAuthToken();
    if (token) {
      try {
        const user = await api.auth.getMe();
        setCurrentUser(user);
      } catch (e) {
        removeAuthToken();
        setCurrentUser(null);
      }
    }

    try {
      const docs = await api.documents.list();
      setDocumentCount(docs.length);
    } catch (e) {
      // Ignored if unauthenticated
    }
  };

  useEffect(() => {
    checkAuthAndData();
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
    startNewChat();
    loadConversations();
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="app-container">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewChat={startNewChat}
        onRenameConversation={renameConversation}
        onDeleteConversation={deleteConversation}
        mode={mode}
        onModeChange={setMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenDocuments={() => setIsDocModalOpen(true)}
        documentCount={documentCount}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <ChatArea
        activeConversation={activeConversation}
        messages={messages}
        isGenerating={isGenerating}
        error={error}
        mode={mode}
        onSendMessage={sendMessage}
        onStopGeneration={stopGeneration}
        onRetryLastMessage={retryLastMessage}
        onClearChat={startNewChat}
        onOpenDocuments={() => setIsDocModalOpen(true)}
      />

      {/* Modals */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onDocumentsUpdated={checkAuthAndData}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          loadConversations();
          checkAuthAndData();
        }}
      />
    </div>
  );
}

