const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('ai_chat_token');
export const setAuthToken = (token) => localStorage.setItem('ai_chat_token', token);
export const removeAuthToken = () => localStorage.removeItem('ai_chat_token');

const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errData = await res.json();
      errorDetail = errData.detail || errData.message || JSON.stringify(errData);
    } catch (e) {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail);
  }

  if (res.status === 204) {
    return null;
  }

  return await res.json();
};

export const api = {
  // Auth
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    getGuestSession: () => request('/auth/guest', { method: 'GET' }),
    getMe: () => request('/auth/me', { method: 'GET' }),
  },

  // Conversations
  conversations: {
    list: () => request('/conversations', { method: 'GET' }),
    create: (data = {}) => request('/conversations', { method: 'POST', body: JSON.stringify(data) }),
    get: (id) => request(`/conversations/${id}`, { method: 'GET' }),
    rename: (id, title) => request(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    delete: (id) => request(`/conversations/${id}`, { method: 'DELETE' }),
  },

  // Documents
  documents: {
    list: () => request('/documents', { method: 'GET' }),
    upload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/documents/upload', {
        method: 'POST',
        body: formData,
      });
    },
    delete: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  },

  // Chat
  chat: {
    send: (payload) => request('/chat', { method: 'POST', body: JSON.stringify(payload) }),

    // Server-Sent Events (SSE) Streaming
    stream: async (payload, onChunk, onCitations, onDone, onError, signal) => {
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const response = await fetch(`${API_BASE}/chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || 'Streaming request failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep partial line

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const jsonStr = trimmed.replace(/^data:\s*/, '');
            try {
              const eventData = JSON.parse(jsonStr);
              if (eventData.event === 'token' && onChunk) {
                onChunk(eventData.delta);
              } else if (eventData.event === 'citations' && onCitations) {
                onCitations(eventData.citations);
              } else if (eventData.event === 'done' && onDone) {
                onDone(eventData.message_id);
              } else if (eventData.event === 'start' && payload.onStart) {
                payload.onStart(eventData);
              }
            } catch (err) {
              console.error('Error parsing SSE event', err, jsonStr);
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Stream generation aborted by user');
          if (onDone) onDone('aborted');
        } else {
          if (onError) onError(err);
        }
      }
    },
  },
};

