/**
 * ITF - Income. Tax. Financials - Documents Page
 * Full interactive document management with upload, preview, and OCR
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, Trash2, Eye, Download, Check, X,
  AlertCircle, RefreshCw, Search, Filter, Plus, File, Image,
  CheckCircle, Clock, XCircle, Edit, MoreVertical, Sparkles
} from 'lucide-react';

// Types
interface Document {
  id: string;
  name: string;
  type: 'W2' | '1099-NEC' | '1099-INT' | '1099-DIV' | '1099-MISC' | '1098' | 'K1' | 'Other';
  status: 'uploading' | 'processing' | 'ready' | 'error';
  employer?: string;
  amount?: number;
  uploadedAt: Date;
  fileSize: number;
  thumbnail?: string;
  extractedData?: {
    wages?: number;
    federalWithheld?: number;
    tips?: number;
    overtime?: number;
  };
}

// Sample documents data
const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'W-2 Olive Garden 2025.pdf',
    type: 'W2',
    status: 'ready',
    employer: 'Darden Restaurants - Olive Garden',
    amount: 42500,
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    fileSize: 245000,
    extractedData: {
      wages: 42500,
      federalWithheld: 6800,
      tips: 15000,
      overtime: 3500,
    },
  },
  {
    id: '2',
    name: '1099-NEC Freelance.pdf',
    type: '1099-NEC',
    status: 'ready',
    employer: 'Tech Consulting LLC',
    amount: 8500,
    uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    fileSize: 128000,
    extractedData: {
      wages: 8500,
    },
  },
  {
    id: '3',
    name: '1099-INT Bank Statement.pdf',
    type: '1099-INT',
    status: 'processing',
    employer: 'Chase Bank',
    uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    fileSize: 98000,
  },
];

export default function Documents() {
  const navigate = useNavigate();

  // State
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  // Handle file upload
  const handleFiles = (files: File[]) => {
    setIsUploading(true);

    files.forEach((file, index) => {
      const newDoc: Document = {
        id: Date.now().toString() + index,
        name: file.name,
        type: detectDocumentType(file.name),
        status: 'uploading',
        uploadedAt: new Date(),
        fileSize: file.size,
      };

      setDocuments(prev => [newDoc, ...prev]);

      // Simulate upload progress
      setTimeout(() => {
        setDocuments(prev =>
          prev.map(d => d.id === newDoc.id ? { ...d, status: 'processing' as const } : d)
        );

        // Simulate OCR processing
        setTimeout(() => {
          setDocuments(prev =>
            prev.map(d => d.id === newDoc.id ? {
              ...d,
              status: 'ready' as const,
              extractedData: {
                wages: Math.floor(Math.random() * 50000) + 20000,
                federalWithheld: Math.floor(Math.random() * 10000),
              },
            } : d)
          );
        }, 2000);
      }, 1000);
    });

    setTimeout(() => setIsUploading(false), 1500);
  };

  // Detect document type from filename
  const detectDocumentType = (filename: string): Document['type'] => {
    const lower = filename.toLowerCase();
    if (lower.includes('w-2') || lower.includes('w2')) return 'W2';
    if (lower.includes('1099-nec') || lower.includes('1099nec')) return '1099-NEC';
    if (lower.includes('1099-int') || lower.includes('1099int')) return '1099-INT';
    if (lower.includes('1099-div') || lower.includes('1099div')) return '1099-DIV';
    if (lower.includes('1099-misc') || lower.includes('1099misc')) return '1099-MISC';
    if (lower.includes('1098')) return '1098';
    if (lower.includes('k-1') || lower.includes('k1')) return 'K1';
    return 'Other';
  };

  // Handle delete
  const handleDelete = (id: string) => {
    setShowDeleteModal(id);
  };

  const confirmDelete = () => {
    if (showDeleteModal) {
      setDocuments(documents.filter(d => d.id !== showDeleteModal));
      setShowDeleteModal(null);
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.employer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Get status badge
  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'ready':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" /> Ready
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
            <RefreshCw className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      case 'uploading':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" /> Uploading
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
            <XCircle className="w-3 h-3" /> Error
          </span>
        );
    }
  };

  // Get type icon
  const getTypeIcon = (type: Document['type']) => {
    const baseClass = "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold";
    switch (type) {
      case 'W2':
        return <div className={`${baseClass} bg-blue-100 text-blue-700`}>W-2</div>;
      case '1099-NEC':
      case '1099-INT':
      case '1099-DIV':
      case '1099-MISC':
        return <div className={`${baseClass} bg-purple-100 text-purple-700`}>{type.split('-')[0]}</div>;
      case '1098':
        return <div className={`${baseClass} bg-green-100 text-green-700`}>1098</div>;
      case 'K1':
        return <div className={`${baseClass} bg-orange-100 text-orange-700`}>K-1</div>;
      default:
        return <div className={`${baseClass} bg-gray-100 text-gray-700`}><File className="w-5 h-5" /></div>;
    }
  };

  // Calculate totals
  const totals = documents.reduce((acc, doc) => {
    if (doc.extractedData) {
      acc.wages += doc.extractedData.wages || 0;
      acc.withheld += doc.extractedData.federalWithheld || 0;
      acc.tips += doc.extractedData.tips || 0;
      acc.overtime += doc.extractedData.overtime || 0;
    }
    return acc;
  }, { wages: 0, withheld: 0, tips: 0, overtime: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-bold text-gray-900">Documents</h1>
                <p className="text-xs text-gray-500">{documents.length} documents uploaded</p>
              </div>
            </div>

            <label className="flex items-center gap-2 px-4 py-2 text-white rounded-lg cursor-pointer transition hover:opacity-90" style={{ backgroundColor: '#4CAF50' }}>
              <Upload className="w-4 h-4" />
              Upload Files
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
              />
            </label>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative mb-6 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-400 bg-white'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-12 h-12 text-green-500 animate-spin mb-4" />
                  <p className="text-gray-600 font-medium">Uploading documents...</p>
                </div>
              ) : (
                <>
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-green-500' : 'text-gray-400'}`} />
                  <p className="text-gray-600 font-medium">
                    {isDragging ? 'Drop files here!' : 'Drag and drop your tax documents'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    W-2, 1099, 1098, K-1 forms (PDF, JPG, PNG)
                  </p>
                  <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition text-gray-700 font-medium">
                    <Plus className="w-4 h-4" />
                    Browse Files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                    />
                  </label>
                </>
              )}
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="W2">W-2</option>
                <option value="1099-NEC">1099-NEC</option>
                <option value="1099-INT">1099-INT</option>
                <option value="1099-DIV">1099-DIV</option>
                <option value="1098">1098</option>
                <option value="K1">K-1</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Your Documents</h2>
              </div>

              {filteredDocuments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No documents found</p>
                  <p className="text-sm mt-1">Upload your tax documents to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 hover:bg-gray-50 transition flex items-center gap-4"
                    >
                      {getTypeIcon(doc.type)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {doc.employer && `${doc.employer} • `}
                          {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}
                        </p>

                        {/* Extracted Data */}
                        {doc.status === 'ready' && doc.extractedData && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {doc.extractedData.wages && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                Wages: {formatCurrency(doc.extractedData.wages)}
                              </span>
                            )}
                            {doc.extractedData.federalWithheld && (
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                Withheld: {formatCurrency(doc.extractedData.federalWithheld)}
                              </span>
                            )}
                            {doc.extractedData.tips && doc.extractedData.tips > 0 && (
                              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Tips: {formatCurrency(doc.extractedData.tips)}
                              </span>
                            )}
                            {doc.extractedData.overtime && doc.extractedData.overtime > 0 && (
                              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                OT: {formatCurrency(doc.extractedData.overtime)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowPreview(doc)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Document Summary</h3>

              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Total Wages</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(totals.wages)}</p>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Federal Withheld</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.withheld)}</p>
                </div>

                {totals.tips > 0 && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-700 flex items-center gap-1">
                      <Sparkles className="w-4 h-4" /> OBBBA Tips
                    </p>
                    <p className="text-2xl font-bold text-yellow-700">{formatCurrency(totals.tips)}</p>
                    <p className="text-xs text-yellow-600 mt-1">Tax-free up to $25,000</p>
                  </div>
                )}

                {totals.overtime > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-700 flex items-center gap-1">
                      <Sparkles className="w-4 h-4" /> OBBBA Overtime
                    </p>
                    <p className="text-2xl font-bold text-purple-700">{formatCurrency(totals.overtime)}</p>
                    <p className="text-xs text-purple-600 mt-1">Tax-free up to $10,000</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">By Document Type</h4>
                <div className="space-y-2">
                  {['W2', '1099-NEC', '1099-INT', '1099-DIV', '1098', 'K1', 'Other'].map(type => {
                    const count = documents.filter(d => d.type === type).length;
                    if (count === 0) return null;
                    return (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-gray-600">{type}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => navigate('/returns/new')}
                className="w-full mt-6 px-4 py-3 text-white rounded-lg font-medium transition hover:opacity-90"
                style={{ backgroundColor: '#4CAF50' }}
              >
                Start Tax Return
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Document?</h3>
                <p className="text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">{showPreview.name}</h3>
                <p className="text-sm text-gray-500">{showPreview.type} • {formatFileSize(showPreview.fileSize)}</p>
              </div>
              <button
                onClick={() => setShowPreview(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Document Preview</p>
                <p className="text-sm text-gray-500 mt-1">
                  {showPreview.employer && `From: ${showPreview.employer}`}
                </p>
              </div>

              {showPreview.extractedData && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Extracted Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {showPreview.extractedData.wages && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Wages</p>
                        <p className="text-lg font-bold">{formatCurrency(showPreview.extractedData.wages)}</p>
                      </div>
                    )}
                    {showPreview.extractedData.federalWithheld && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Federal Withheld</p>
                        <p className="text-lg font-bold">{formatCurrency(showPreview.extractedData.federalWithheld)}</p>
                      </div>
                    )}
                    {showPreview.extractedData.tips && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Tips (OBBBA)
                        </p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(showPreview.extractedData.tips)}</p>
                      </div>
                    )}
                    {showPreview.extractedData.overtime && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Overtime (OBBBA)
                        </p>
                        <p className="text-lg font-bold text-purple-700">{formatCurrency(showPreview.extractedData.overtime)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowPreview(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button
                className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition hover:opacity-90"
                style={{ backgroundColor: '#4CAF50' }}
              >
                Use in Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
