import React, { useState, useEffect } from 'react';
import { Upload, X, Trash2, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export function DocumentModal({ isOpen, onClose, onDocumentsUpdated }) {
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchDocs = async () => {
    try {
      const list = await api.documents.list();
      setDocuments(list);
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocs();
      setUploadError(null);
      setUploadSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const result = await api.documents.upload(file);
      setUploadSuccess(result.message || 'Document uploaded and indexed successfully!');
      await fetchDocs();
      if (onDocumentsUpdated) onDocumentsUpdated();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await api.documents.delete(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (onDocumentsUpdated) onDocumentsUpdated();
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Knowledge Base & Documents (RAG)</h3>
          <button className="action-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Upload Dropzone */}
          <div
            className={`dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".pdf,.txt,.md,.markdown,.csv,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUpload(e.target.files[0]);
                }
              }}
            />
            {isUploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Loader2 size={32} className="animate-spin" color="var(--accent)" />
                <span className="dropzone-title">Parsing & Indexing Chunks into ChromaDB...</span>
              </div>
            ) : (
              <>
                <Upload size={32} className="dropzone-icon" />
                <div className="dropzone-title">Click to upload or drag & drop</div>
                <div className="dropzone-desc">Supports PDF, Markdown, TXT (up to 15MB)</div>
              </>
            )}
          </div>

          {/* Feedback banners */}
          {uploadSuccess && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--success)' }}>
              <CheckCircle2 size={16} />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--danger)' }}>
              <AlertCircle size={16} />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Documents List */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 10, color: 'var(--text-secondary)' }}>
              Indexed Documents ({documents.length})
            </h4>

            {documents.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                No documents uploaded yet. Upload reference files to enable grounded RAG answering.
              </p>
            ) : (
              <div className="doc-list">
                {documents.map((doc) => (
                  <div key={doc.id} className="doc-item">
                    <div className="doc-info">
                      <FileText size={18} color="var(--accent)" />
                      <div>
                        <div className="doc-name">{doc.filename}</div>
                        <div className="doc-meta">
                          {formatFileSize(doc.file_size)} • {doc.chunk_count} chunks indexed
                        </div>
                      </div>
                    </div>
                    <button
                      className="action-icon-btn delete"
                      title="Delete document"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

