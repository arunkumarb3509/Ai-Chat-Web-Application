import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

export function useChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('auto'); // 'auto', 'general', 'rag'
  const abortControllerRef = useRef(null);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const list = await api.conversations.list();
      setConversations(list);
      return list;
    } catch (err) {
      console.error('Failed to load conversations', err);
      return [];
    }
  }, []);

  // Select a conversation
  const selectConversation = useCallback(async (convId) => {
    if (!convId) return;
    setError(null);
    try {
      const data = await api.conversations.get(convId);
      setActiveConversationId(convId);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message || 'Failed to load conversation');
    }
  }, []);

  // Create new chat
  const startNewChat = useCallback(async () => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  }, [isGenerating]);

  // Rename a conversation
  const renameConversation = useCallback(async (convId, newTitle) => {
    try {
      await api.conversations.rename(convId, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      setError(err.message || 'Failed to rename conversation');
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (convId) => {
    try {
      await api.conversations.delete(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        startNewChat();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete conversation');
    }
  }, [activeConversationId, startNewChat]);

  // Stop generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  // Send message with streaming
  const sendMessage = useCallback(
    async (text, retryFromLast = false) => {
      const promptText = text.trim();
      if (!promptText) return;

      setError(null);
      setIsGenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Optimistically append user message if not a retry
      if (!retryFromLast) {
        const userMsg = {
          id: 'user-' + Date.now(),
          role: 'user',
          content: promptText,
          mode,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
      }

      // Placeholder for streaming assistant response
      const assistantMsgId = 'asst-' + Date.now();
      const placeholderMsg = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        citations: null,
        mode,
        isStreaming: true,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, placeholderMsg]);

      let accumulatedContent = '';

      try {
        await api.chat.stream(
          {
            conversation_id: activeConversationId,
            message: promptText,
            mode,
            onStart: (data) => {
              if (!activeConversationId && data.conversation_id) {
                setActiveConversationId(data.conversation_id);
                loadConversations();
              }
            },
          },
          // onChunk
          (delta) => {
            accumulatedContent += delta;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: accumulatedContent }
                  : msg
              )
            );
          },
          // onCitations
          (citations) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, citations } : msg
              )
            );
          },
          // onDone
          (savedMessageId) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      id: savedMessageId !== 'aborted' ? savedMessageId : msg.id,
                      isStreaming: false,
                    }
                  : msg
              )
            );
            setIsGenerating(false);
            abortControllerRef.current = null;
            loadConversations();
          },
          // onError
          (err) => {
            setError(err.message || 'Stream connection error');
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content:
                        msg.content ||
                        'Sorry, an error occurred while generating the response.',
                      isStreaming: false,
                    }
                  : msg
              )
            );
            setIsGenerating(false);
            abortControllerRef.current = null;
          },
          controller.signal
        );
      } catch (err) {
        setError(err.message);
        setIsGenerating(false);
      }
    },
    [activeConversationId, mode, loadConversations]
  );

  // Retry last assistant message
  const retryLastMessage = useCallback(() => {
    if (isGenerating || messages.length === 0) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserIndex;
    const lastUserMsg = messages[actualIndex];

    // Remove everything after this user message
    setMessages((prev) => prev.slice(0, actualIndex + 1));
    sendMessage(lastUserMsg.content, true);
  }, [messages, isGenerating, sendMessage]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
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
  };
}

