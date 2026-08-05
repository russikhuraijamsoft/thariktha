import React, { useState, useEffect } from 'react';
import { 
  HardDrive, FolderPlus, UploadCloud, FileText, Image as ImageIcon, 
  Folder, Search, Trash2, ExternalLink, RefreshCw, CheckCircle2, 
  AlertCircle, Lock, ShieldCheck, Cloud, Plus, X, Eye, Sparkles, Filter
} from 'lucide-react';
import { 
  authenticateGoogleDrive, getCachedDriveToken, listDriveFiles, 
  createDriveFolder, uploadFileToDrive, deleteDriveFile, DriveFileItem 
} from '../services/googleDriveService';
import { useAuth } from '../context/AuthContext';

export const GoogleDriveView: React.FC = () => {
  const { isSandboxMode } = useAuth();
  const [token, setToken] = useState<string | null>(getCachedDriveToken());
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<{ id?: string; name: string }[]>([
    { name: 'My Drive Root' }
  ]);

  // Modal states
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Delete confirmation modal state
  const [deletingFileItem, setDeletingFileItem] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Feedback notifications
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pre-populated Sandbox files for demo when offline or sandbox mode
  const MOCK_DRIVE_FILES: DriveFileItem[] = [
    {
      id: 'mock_f1',
      name: 'Cricket Closet ERP Assets',
      mimeType: 'application/vnd.google-apps.folder',
      createdTime: new Date(Date.now() - 86400000 * 10).toISOString(),
      modifiedTime: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'mock_f2',
      name: 'Sublimation Jersey Vectors (2026 Season)',
      mimeType: 'application/vnd.google-apps.folder',
      createdTime: new Date(Date.now() - 86400000 * 15).toISOString(),
      modifiedTime: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      id: 'mock_img1',
      name: 'Manipur_Lions_Custom_Jersey_Front_Back_Vector.svg',
      mimeType: 'image/svg+xml',
      size: '1420500',
      webViewLink: 'https://drive.google.com',
      thumbnailLink: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=300&q=80',
      createdTime: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'mock_doc1',
      name: 'English_Willow_Grading_Specs_Grade1_A.pdf',
      mimeType: 'application/pdf',
      size: '3450000',
      webViewLink: 'https://drive.google.com',
      createdTime: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      id: 'mock_doc2',
      name: 'Melbourne_Club_Bulk_Equipment_Proposal_INV2026-88.pdf',
      mimeType: 'application/pdf',
      size: '890000',
      webViewLink: 'https://drive.google.com',
      createdTime: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ];

  const fetchFiles = async (authToken: string | null) => {
    setLoading(true);
    setAuthError(null);
    try {
      if (authToken) {
        const result = await listDriveFiles(authToken, {
          folderId: currentFolderId,
          searchQuery: searchQuery,
          mimeTypeFilter: filterType !== 'all' ? filterType : undefined
        });
        setFiles(result);
      } else {
        // Filter mock files based on search and filter type
        let filtered = [...MOCK_DRIVE_FILES];
        if (searchQuery.trim()) {
          filtered = filtered.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (filterType === 'folder') {
          filtered = filtered.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
        } else if (filterType === 'image') {
          filtered = filtered.filter(f => f.mimeType.startsWith('image/'));
        } else if (filterType === 'document') {
          filtered = filtered.filter(f => f.mimeType.includes('pdf') || f.mimeType.includes('document'));
        }
        setFiles(filtered);
      }
    } catch (err: any) {
      console.error("Error loading drive files:", err);
      setAuthError(err.message || 'Failed to communicate with Google Drive API.');
      // Fallback to mock list on error
      setFiles(MOCK_DRIVE_FILES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(token);
  }, [token, currentFolderId, filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(token);
  };

  const handleConnectGoogleDrive = async () => {
    setAuthError(null);
    try {
      const freshToken = await authenticateGoogleDrive();
      setToken(freshToken);
      setStatusMsg({ type: 'success', text: 'Successfully authenticated with Google Drive!' });
      fetchFiles(freshToken);
    } catch (err: any) {
      setAuthError(err.message || 'Google Drive authorization popup was cancelled or failed.');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    if (!token) {
      // Mock local creation
      const mockFolder: DriveFileItem = {
        id: `mock_f_${Date.now()}`,
        name: newFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        createdTime: new Date().toISOString()
      };
      setFiles(prev => [mockFolder, ...prev]);
      setStatusMsg({ type: 'success', text: `Folder "${newFolderName}" created locally.` });
      setNewFolderName('');
      setIsNewFolderModalOpen(false);
      return;
    }

    try {
      setLoading(true);
      await createDriveFolder(token, newFolderName, currentFolderId);
      setStatusMsg({ type: 'success', text: `Folder "${newFolderName}" created in Google Drive!` });
      setNewFolderName('');
      setIsNewFolderModalOpen(false);
      fetchFiles(token);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Could not create folder' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile) return;

    setIsUploading(true);
    if (!token) {
      // Mock local upload
      const mockItem: DriveFileItem = {
        id: `mock_up_${Date.now()}`,
        name: selectedUploadFile.name,
        mimeType: selectedUploadFile.type || 'application/octet-stream',
        size: selectedUploadFile.size.toString(),
        createdTime: new Date().toISOString()
      };
      setFiles(prev => [mockItem, ...prev]);
      setStatusMsg({ type: 'success', text: `File "${selectedUploadFile.name}" added to cloud list.` });
      setSelectedUploadFile(null);
      setUploadDescription('');
      setIsUploadModalOpen(false);
      setIsUploading(false);
      return;
    }

    try {
      await uploadFileToDrive(token, selectedUploadFile, selectedUploadFile.name, currentFolderId, uploadDescription);
      setStatusMsg({ type: 'success', text: `File "${selectedUploadFile.name}" successfully uploaded to Google Drive!` });
      setSelectedUploadFile(null);
      setUploadDescription('');
      setIsUploadModalOpen(false);
      fetchFiles(token);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDeleteFile = async () => {
    if (!deletingFileItem) return;

    setIsDeleting(true);
    if (!token) {
      setFiles(prev => prev.filter(f => f.id !== deletingFileItem.id));
      setStatusMsg({ type: 'success', text: `Item "${deletingFileItem.name}" deleted.` });
      setDeletingFileItem(null);
      setIsDeleting(false);
      return;
    }

    try {
      await deleteDriveFile(token, deletingFileItem.id);
      setStatusMsg({ type: 'success', text: `"${deletingFileItem.name}" permanently deleted from Google Drive.` });
      setDeletingFileItem(null);
      fetchFiles(token);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Delete operation failed' });
    } finally {
      setIsDeleting(false);
    }
  };

  const navigateIntoFolder = (folder: DriveFileItem) => {
    if (folder.mimeType === 'application/vnd.google-apps.folder') {
      setCurrentFolderId(folder.id);
      setFolderBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    }
  };

  const navigateBreadcrumb = (index: number) => {
    const target = folderBreadcrumbs[index];
    setFolderBreadcrumbs(prev => prev.slice(0, index + 1));
    setCurrentFolderId(target.id);
  };

  const formatBytes = (bytes?: string) => {
    if (!bytes) return '—';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '—';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-neutral-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/40 p-6 rounded-2xl border border-neutral-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <HardDrive className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold font-mono tracking-tight uppercase text-white flex items-center gap-2">
                Google Drive Storage Hub
                {token ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> CONNECTED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> DEMO / OFFLINE MODE
                  </span>
                )}
              </h1>
              <p className="text-xs text-neutral-400">
                Store, synchronize, and search vector sublimation assets, equipment catalog spec sheets, and customer invoices.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!token ? (
            <button
              onClick={handleConnectGoogleDrive}
              className="gsi-material-button bg-white hover:bg-neutral-100 text-neutral-900 px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md cursor-pointer border border-neutral-300"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>Connect Google Drive Account</span>
            </button>
          ) : (
            <button
              onClick={() => fetchFiles(token)}
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Drive</span>
            </button>
          )}

          <button
            onClick={() => setIsNewFolderModalOpen(true)}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer transition-transform active:scale-95"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMsg && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
            : 'bg-red-950/60 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:opacity-80 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Auth warning error */}
      {authError && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-200">Google OAuth Scope Notice</p>
            <p>{authError}</p>
            <p className="text-[11px] text-amber-400/80">
              Note: You can continue exploring and creating items in Sandbox storage below.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search files or folders in Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </form>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-mono text-neutral-500 uppercase flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Files' },
            { id: 'folder', label: 'Folders' },
            { id: 'image', label: 'Images/Vectors' },
            { id: 'document', label: 'PDFs/Docs' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                filterType === f.id
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs font-mono bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-850 overflow-x-auto">
        <span className="text-neutral-500">Location:</span>
        {folderBreadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-neutral-600">/</span>}
            <button
              onClick={() => navigateBreadcrumb(idx)}
              className={`hover:underline cursor-pointer ${
                idx === folderBreadcrumbs.length - 1 
                  ? 'text-amber-400 font-bold' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* File List Grid / Table */}
      <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500 space-y-3 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
            <p>Communicating with Google Drive cloud ledger...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 space-y-3 font-mono text-xs">
            <HardDrive className="w-8 h-8 mx-auto text-neutral-600 opacity-60" />
            <p className="text-neutral-400 font-sans text-sm">No files or folders found in this directory.</p>
            <p className="text-neutral-600">Click "Upload File" or "New Folder" to add items to Google Drive.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-neutral-950/80 border-b border-neutral-800 text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Size</th>
                  <th className="p-3.5">Last Modified</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {files.map(item => {
                  const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                  const isSvg = item.name.endsWith('.svg') || item.mimeType.includes('svg');
                  const isImage = item.mimeType.startsWith('image/');
                  const isPdf = item.mimeType.includes('pdf');

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-neutral-800/40 transition-colors group cursor-pointer"
                      onClick={() => isFolder && navigateIntoFolder(item)}
                    >
                      {/* Name */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            isFolder 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : isImage 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {isFolder ? <Folder className="w-4 h-4" /> : isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-200 group-hover:text-amber-400 transition-colors line-clamp-1">
                              {item.name}
                            </p>
                            {isSvg && <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">JERSEY VECTOR</span>}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="p-3.5 text-neutral-400 font-mono text-[11px]">
                        {isFolder ? 'Folder' : isPdf ? 'PDF Spec Document' : isSvg ? 'SVG Vector Graphics' : isImage ? 'Image' : 'File'}
                      </td>

                      {/* Size */}
                      <td className="p-3.5 text-neutral-400 font-mono text-[11px]">
                        {isFolder ? '—' : formatBytes(item.size)}
                      </td>

                      {/* Modified Date */}
                      <td className="p-3.5 text-neutral-400 font-mono text-[11px]">
                        {item.createdTime ? new Date(item.createdTime).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {item.webViewLink && (
                            <a
                              href={item.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Open in Google Drive"
                              className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setDeletingFileItem(item)}
                            title="Delete file from Google Drive"
                            className="p-1.5 hover:bg-red-950/60 text-neutral-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold font-mono text-sm text-white flex items-center gap-2 uppercase">
                <FolderPlus className="w-4 h-4 text-amber-400" />
                Create Drive Folder
              </h3>
              <button onClick={() => setIsNewFolderModalOpen(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-neutral-400 uppercase">Folder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sublimation Vector Artworks 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold font-mono text-sm text-white flex items-center gap-2 uppercase">
                <UploadCloud className="w-4 h-4 text-amber-400" />
                Upload File to Drive
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-neutral-400 uppercase">Select File</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedUploadFile(e.target.files?.[0] || null)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-500 file:text-neutral-950 hover:file:bg-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-neutral-400 uppercase">Description (Optional)</label>
                <textarea
                  placeholder="Notes about this file (e.g. Sublimation jersey print layout for Manipur Lions FC)"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedUploadFile}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? 'Uploading...' : 'Upload Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Explicit User Confirmation Modal for Destructive Operations */}
      {deletingFileItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold font-mono text-sm uppercase text-white">Confirm Delete Operation</h3>
                <p className="text-[11px] text-neutral-400">Explicit approval required before modifying Google Drive</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              Are you sure you want to permanently remove <strong className="text-white font-mono">{deletingFileItem.name}</strong> from Google Drive? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingFileItem(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
