"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UploadButton from "@/components/UploadButton";
import { deleteNextcloudItem, renameNextcloudItem, moveNextcloudItem, copyNextcloudItem, getNextcloudData, getNextcloudActivity, createNextcloudShare } from "@/actions/nextcloud";

type FileItem = {
  name: string;
  href: string;
  time: string;
  size: string;
  isFolder: boolean;
  color: string;
  bg: string;
  fileId?: string;
};

export default function DriveClient({ nextcloudData, currentPath = '/remote.php/webdav/' }: { nextcloudData: any, currentPath?: string }) {
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [folderPage, setFolderPage] = useState(1);
  const [filePage, setFilePage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: FileItem } | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [moveCopyModal, setMoveCopyModal] = useState<{
    isOpen: boolean;
    action: 'move' | 'copy';
    item: FileItem | null;
  }>({ isOpen: false, action: 'move', item: null });
  const [modalCurrentPath, setModalCurrentPath] = useState<string>('/remote.php/webdav/');
  const [modalFolders, setModalFolders] = useState<FileItem[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'details' | 'activity'>('details');
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (selectedItem) {
      setDetailsTab('details');
      setActivities([]);
    }
  }, [selectedItem?.href]);

  useEffect(() => {
    if (detailsTab === 'activity' && selectedItem?.fileId) {
      setIsLoadingActivity(true);
      getNextcloudActivity(selectedItem.fileId).then(data => {
        setActivities(data);
        setIsLoadingActivity(false);
      });
    }
  }, [detailsTab, selectedItem?.fileId]);

  const parentPath = currentPath !== '/remote.php/webdav/' 
    ? (currentPath.replace(/\/$/, '').substring(0, currentPath.replace(/\/$/, '').lastIndexOf('/')) + '/') 
    : null;


  const toggleSelection = (href: string) => {
    setSelectedUrls(prev => prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]);
    setContextMenu(null);
  };

  const handleFolderClick = (folder: FileItem) => {
    router.push(`?path=${encodeURIComponent(folder.href)}`);
    setSelectedItem(null);
    setFolderPage(1);
    setFilePage(1);
    setSelectedUrls([]);
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleBack = () => {
    if (currentPath === '/remote.php/webdav/') return;
    let parentPath = currentPath.replace(/\/$/, '');
    parentPath = parentPath.substring(0, parentPath.lastIndexOf('/')) + '/';
    if (!parentPath.startsWith('/remote.php/webdav')) parentPath = '/remote.php/webdav/';
    router.push(`?path=${encodeURIComponent(parentPath)}`);
    setSelectedItem(null);
    setFolderPage(1);
    setFilePage(1);
    setSelectedUrls([]);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!confirm(`Are you sure you want to delete "${selectedItem.name}"?`)) return;
    
    setIsDeleting(true);
    try {
      await deleteNextcloudItem(selectedItem.href);
      setSelectedItem(null);
      setIsPreviewModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to delete the item.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameItem = async (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(null);
    const newName = window.prompt(`Enter new name for ${item.isFolder ? 'folder' : 'file'}:`, item.name);
    if (!newName || newName === item.name) return;
    try {
      await renameNextcloudItem(item.href, newName);
      if (selectedItem?.name === item.name) setSelectedItem(null);
    } catch (err) {
      console.error(err);
      alert("Failed to rename.");
    }
  };

  const handleItemDelete = async (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(null);
    setContextMenu(null);
    if (!confirm(`Are you sure you want to delete ${item.isFolder ? 'folder' : 'file'} "${item.name}"?`)) return;
    try {
      await deleteNextcloudItem(item.href);
      if (selectedItem?.name === item.name) setSelectedItem(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete.");
    }
  };

  const handleShare = async (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(null);
    setContextMenu(null);
    try {
      const link = await createNextcloudShare(file.href);
      await navigator.clipboard.writeText(link);
      setToastMessage("Public link copied to clipboard!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      console.error(error);
      alert("Failed to create share link: " + error.message);
    }
  };

  const handleMoveItemClick = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(null);
    setContextMenu(null);
    setModalCurrentPath(currentPath);
    setModalFolders(nextcloudData.folders || []);
    setMoveCopyModal({ isOpen: true, action: 'move', item });
  };

  const handleCopyItemClick = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(null);
    setContextMenu(null);
    setModalCurrentPath(currentPath);
    setModalFolders(nextcloudData.folders || []);
    setMoveCopyModal({ isOpen: true, action: 'copy', item });
  };

  const navigateModal = async (path: string) => {
    setModalCurrentPath(path);
    setIsModalLoading(true);
    try {
      const data = await getNextcloudData(path);
      setModalFolders(data.folders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsModalLoading(false);
    }
  };

  const submitMoveCopy = async () => {
    if (!moveCopyModal.item) return;
    setIsDeleting(true);
    try {
       if (moveCopyModal.action === 'move') {
          await moveNextcloudItem(moveCopyModal.item.href, modalCurrentPath);
          if (selectedItem?.name === moveCopyModal.item.name) setSelectedItem(null);
       } else {
          await copyNextcloudItem(moveCopyModal.item.href, modalCurrentPath);
       }
       setMoveCopyModal({ ...moveCopyModal, isOpen: false });
    } catch(err) {
       console.error(err);
       alert("Failed to " + moveCopyModal.action);
    } finally {
       setIsDeleting(false);
    }
  };

  const renderIcon = (item: FileItem) => {
    if (item.isFolder) {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path>
      </svg>
    );
  };

  const getDownloadUrl = (item: DriveItem) => {
    return `/api/drive/preview?path=${encodeURIComponent(item.href)}&isDir=${item.isDir || item.isFolder || false}`;
  };

  const getDownloadName = (item: DriveItem) => {
    return (item.isDir || item.isFolder) ? `${item.name}.zip` : item.name;
  };

  return (
    <div className="flex h-full w-full">
      
      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}></div>
          <div 
            className="fixed z-50 bg-white border rounded-xl shadow-2xl w-48 py-1"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button 
              onClick={(e) => handleShare(contextMenu.item, e)}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-3"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
              <span>Share Link</span>
            </button>
            <a 
              href={getDownloadUrl(contextMenu.item)}
              download={getDownloadName(contextMenu.item)}
              onClick={() => setContextMenu(null)}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-3"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>Download</span>
            </a>
          </div>
        </>
      )}

      {/* ContentArea */}
      <section className="flex-1 overflow-y-auto p-8 bg-surface">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            {currentPath !== '/remote.php/webdav/' && (
              <button onClick={handleBack} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </button>
            )}
            <h2 className="text-2xl font-bold text-slate-800">
              {currentPath === '/remote.php/webdav/' ? 'My Files' : decodeURIComponent(currentPath.split('/').filter(Boolean).pop() || '')}
            </h2>
          </div>
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
            <button className="p-2 text-slate-500 hover:bg-white rounded-md transition-all shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </button>
            <button className="p-2 text-blue-600 bg-white rounded-md shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <UploadButton currentPath={currentPath} />
            {selectedUrls.length > 0 && (
              <button 
                onClick={async () => {
                  if (!confirm(`Are you sure you want to delete ${selectedUrls.length} items?`)) return;
                  setIsDeleting(true);
                  try {
                    for (const url of selectedUrls) {
                      await deleteNextcloudItem(url);
                    }
                    setSelectedUrls([]);
                    setSelectedItem(null);
                  } catch (e) {
                    console.error(e);
                    alert("Some items failed to delete.");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg font-semibold flex items-center space-x-2 hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50 animate-in fade-in slide-in-from-left-4 duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                <span>{isDeleting ? "Deleting..." : `Delete Selected (${selectedUrls.length})`}</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 text-slate-500 text-sm font-medium px-3 py-2 hover:bg-slate-100 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span>Sort</span>
            </button>
          </div>
        </div>

        {/* Folders Section */}
        {nextcloudData.folders?.length > 0 && (
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Folders</h3>
              {selectedUrls.length > 0 && (
                <button 
                  onClick={() => {
                     const allFolderHrefs = nextcloudData.folders.map((f: FileItem) => f.href);
                     const allFoldersSelected = allFolderHrefs.every((h: string) => selectedUrls.includes(h));
                     if (allFoldersSelected) {
                       setSelectedUrls(prev => prev.filter(h => !allFolderHrefs.includes(h)));
                     } else {
                       setSelectedUrls(prev => Array.from(new Set([...prev, ...allFolderHrefs])));
                     }
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 hover:bg-blue-50 rounded animate-in fade-in"
                >
                  {nextcloudData.folders.every((f: FileItem) => selectedUrls.includes(f.href)) ? "Deselect All Folders" : "Select All Folders"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {nextcloudData.folders.slice((folderPage - 1) * 8, folderPage * 8).map((folder: FileItem, index: number) => (
                <div 
                  key={index} 
                  onClick={() => handleFolderClick(folder)}
                  onContextMenu={(e) => handleContextMenu(e, folder)}
                  className={`bg-white border p-4 rounded-lg flex items-center justify-between cursor-pointer group transition-all shadow-sm hover:border-blue-600 relative ${selectedUrls.includes(folder.href) ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-center space-x-4 overflow-hidden">
                    {(selectedUrls.includes(folder.href) || selectedUrls.length > 0) && (
                      <div 
                        onClick={(e) => { e.stopPropagation(); toggleSelection(folder.href); }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 animate-in zoom-in duration-200 cursor-pointer ${selectedUrls.includes(folder.href) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 text-transparent hover:border-blue-400'}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                      {renderIcon(folder)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-slate-800 truncate">{folder.name}</p>
                      <p className="text-xs text-slate-400">{folder.time}</p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === folder.name ? null : folder.name); }}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                    </button>
                    {activeMenu === folder.name && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }}
                        ></div>
                        <div className="absolute right-0 top-8 w-48 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-100 py-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleSelection(folder.href); setActiveMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>{selectedUrls.includes(folder.href) ? "Deselect" : "Select"}</span>
                          </button>
                          <div className="border-t my-1"></div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setSelectedItem(folder); }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>Open detail</span>
                          </button>
                          <button 
                            onClick={(e) => handleRenameItem(folder, e)}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            <span>Rename</span>
                          </button>
                          <button 
                            onClick={(e) => handleMoveItemClick(folder, e)}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                            <span>Move to...</span>
                          </button>
                          <button 
                            onClick={(e) => handleCopyItemClick(folder, e)}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                            <span>Copy to...</span>
                          </button>
                          <button 
                            onClick={(e) => handleShare(folder, e)}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                            <span>Share Link</span>
                          </button>
                          <div className="border-t my-1"></div>
                          <button 
                            onClick={(e) => handleItemDelete(folder, e)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {nextcloudData.folders.length > 8 && (
              <div className="flex justify-end mt-4 items-center space-x-2">
                <button 
                  onClick={() => setFolderPage(Math.max(1, folderPage - 1))}
                  disabled={folderPage === 1}
                  className="p-1 rounded bg-slate-100 text-slate-500 disabled:opacity-50 hover:bg-slate-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <span className="text-sm text-slate-500 font-medium">Page {folderPage} of {Math.ceil(nextcloudData.folders.length / 8)}</span>
                <button 
                  onClick={() => setFolderPage(Math.min(Math.ceil(nextcloudData.folders.length / 8), folderPage + 1))}
                  disabled={folderPage >= Math.ceil(nextcloudData.folders.length / 8)}
                  className="p-1 rounded bg-slate-100 text-slate-500 disabled:opacity-50 hover:bg-slate-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Files List Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Files</h3>
            {nextcloudData.files?.length > 0 && selectedUrls.length > 0 && (
              <button 
                onClick={() => {
                   const allFileHrefs = nextcloudData.files.map((f: FileItem) => f.href);
                   const allFilesSelected = allFileHrefs.every((h: string) => selectedUrls.includes(h));
                   if (allFilesSelected) {
                     setSelectedUrls(prev => prev.filter(h => !allFileHrefs.includes(h)));
                   } else {
                     setSelectedUrls(prev => Array.from(new Set([...prev, ...allFileHrefs])));
                   }
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 hover:bg-blue-50 rounded animate-in fade-in"
              >
                {nextcloudData.files.every((f: FileItem) => selectedUrls.includes(f.href)) ? "Deselect All Files" : "Select All Files"}
              </button>
            )}
          </div>
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Owner</th>
                  <th className="px-6 py-3 font-semibold">Last Modified</th>
                  <th className="px-6 py-3 font-semibold text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {nextcloudData.files.slice((filePage - 1) * 10, filePage * 10).map((file: FileItem, index: number) => (
                  <tr 
                    key={index} 
                    onClick={() => setSelectedItem(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className={`cursor-pointer transition-colors group ${selectedUrls.includes(file.href) ? 'bg-blue-50/60' : selectedItem?.name === file.name ? 'bg-blue-50/80 border-l-2 border-blue-600' : 'hover:bg-blue-50'}`}
                  >
                    <td className="px-6 py-4 flex items-center space-x-3 relative">
                      {(selectedUrls.includes(file.href) || selectedUrls.length > 0) && (
                        <div 
                          onClick={(e) => { e.stopPropagation(); toggleSelection(file.href); }}
                          className={`absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 animate-in zoom-in duration-200 cursor-pointer ${selectedUrls.includes(file.href) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 text-transparent hover:border-blue-400'}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      )}
                      <div className={`${file.color} ${selectedUrls.length > 0 ? 'ml-4' : ''} transition-all`}>
                        {renderIcon(file)}
                      </div>
                      <span className="font-medium text-slate-900 truncate max-w-xs">{file.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center font-bold">
                          ME
                        </div>
                        <span>Me</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{file.time}</td>
                    <td className="px-6 py-4 text-slate-500 text-right">
                      <div className="flex items-center justify-end space-x-4">
                        <span>{file.size}</span>
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === file.name ? null : file.name); }}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                          </button>
                          {activeMenu === file.name && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 cursor-default" 
                                onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }}
                              ></div>
                              <div className="absolute right-0 top-8 w-48 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-100 text-left py-1">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleSelection(file.href); setActiveMenu(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                  <span>{selectedUrls.includes(file.href) ? "Deselect" : "Select"}</span>
                                </button>
                                <div className="border-t my-1"></div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setSelectedItem(file); }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                  <span>Open detail</span>
                                </button>
                                <button 
                                  onClick={(e) => handleRenameItem(file, e)}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                  <span>Rename</span>
                                </button>
                                <button 
                                  onClick={(e) => handleMoveItemClick(file, e)}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                  <span>Move to...</span>
                                </button>
                                <button 
                                  onClick={(e) => handleCopyItemClick(file, e)}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                                  <span>Copy to...</span>
                                </button>
                                <button 
                                  onClick={(e) => handleShare(file, e)}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                                  <span>Share Link</span>
                                </button>
                                <a 
                                  href={getDownloadUrl(file)}
                                  download={getDownloadName(file)}
                                  onClick={() => setActiveMenu(null)}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                  <span>Download</span>
                                </a>
                                <div className="border-t my-1"></div>
                                <button 
                                  onClick={(e) => handleItemDelete(file, e)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {nextcloudData.files.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No files found in this directory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {nextcloudData.files.length > 10 && (
            <div className="flex justify-end mt-4 items-center space-x-2">
              <button 
                onClick={() => setFilePage(Math.max(1, filePage - 1))}
                disabled={filePage === 1}
                className="p-1 rounded bg-slate-100 text-slate-500 disabled:opacity-50 hover:bg-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <span className="text-sm text-slate-500 font-medium">Page {filePage} of {Math.ceil(nextcloudData.files.length / 10)}</span>
              <button 
                onClick={() => setFilePage(Math.min(Math.ceil(nextcloudData.files.length / 10), filePage + 1))}
                disabled={filePage >= Math.ceil(nextcloudData.files.length / 10)}
                className="p-1 rounded bg-slate-100 text-slate-500 disabled:opacity-50 hover:bg-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* DetailsPanel */}
      {selectedItem && (
        <aside className="w-96 border-l bg-white flex flex-col overflow-y-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-slate-900 truncate pr-4" title={selectedItem.name}>{selectedItem.name}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            {/* File Preview Placeholder */}
            <div 
              className={`w-full aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-6 overflow-hidden relative ${!selectedItem.isFolder ? 'cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all group' : ''}`}
              onClick={() => !selectedItem.isFolder && setIsPreviewModalOpen(true)}
            >
              {selectedItem.isFolder ? (
                <div className="text-blue-500">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                  </svg>
                </div>
              ) : selectedItem.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={`/api/drive/preview?path=${encodeURIComponent(selectedItem.href)}`} alt={selectedItem.name} className="object-contain w-full h-full" />
              ) : selectedItem.name.match(/\.(mp4|webm|ogg)$/i) ? (
                <video src={`/api/drive/preview?path=${encodeURIComponent(selectedItem.href)}`} className="w-full h-full bg-black"></video>
              ) : selectedItem.name.match(/\.(pdf)$/i) ? (
                <iframe src={`/api/drive/preview?path=${encodeURIComponent(selectedItem.href)}`} className="w-full h-full pointer-events-none"></iframe>
              ) : (
                <div className={selectedItem.color}>
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path>
                  </svg>
                </div>
              )}
              
              {/* Click Overlay Hint */}
              {!selectedItem.isFolder && (
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                  <div className="bg-white/90 text-slate-800 px-4 py-2 rounded-full font-semibold shadow-xl flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                    </svg>
                    <span>Click to Enlarge</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tabs */}
            <div className="flex border-b mb-6">
              <button 
                onClick={() => setDetailsTab('details')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${detailsTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Details
              </button>
              <button 
                onClick={() => setDetailsTab('activity')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${detailsTab === 'activity' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Activity
              </button>
            </div>
            
            {detailsTab === 'details' ? (
              <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                {/* Metadata */}
                <div className="space-y-4 mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</p>
                    <p className="text-sm flex items-center space-x-2 font-medium text-slate-700">
                      <span className={selectedItem.isFolder ? 'text-blue-500' : selectedItem.color}>
                        {renderIcon(selectedItem)}
                      </span>
                      <span>{selectedItem.isFolder ? "Folder" : (selectedItem.name.split('.').pop()?.toUpperCase() || "File") + " Document"}</span>
                    </p>
                  </div>
                  {!selectedItem.isFolder && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Size</p>
                      <p className="text-sm font-medium text-slate-700">{selectedItem.size}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Owner</p>
                    <div className="flex items-center space-x-2 mt-1 text-slate-700">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center font-bold">ME</div>
                      <span className="text-sm font-medium">Administrator</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Modified</p>
                    <p className="text-sm font-medium text-slate-700">{selectedItem.time}</p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="space-y-2">
                  <a 
                    href={getDownloadUrl(selectedItem)}
                    download={getDownloadName(selectedItem)}
                    className="w-full flex items-center justify-center space-x-3 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all border shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    <span className="font-semibold text-sm">Download</span>
                  </a>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center space-x-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-100 shadow-sm disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <span className="font-semibold text-sm">{isDeleting ? "Deleting..." : "Move to Trash"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                {isLoadingActivity ? (
                  <div className="flex justify-center py-8">
                    <svg className="animate-spin h-6 w-6 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                ) : activities.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 mt-2 ml-2">
                    {activities.map((act: any) => {
                      // Pick color based on activity type
                      let iconColor = "text-slate-500";
                      let iconBg = "bg-slate-100";
                      let iconSvg = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
                      
                      if (act.type === 'file_created') {
                        iconColor = "text-blue-600"; iconBg = "bg-blue-100";
                        iconSvg = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>;
                      } else if (act.type === 'file_changed') {
                        iconColor = "text-emerald-600"; iconBg = "bg-emerald-100";
                        iconSvg = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>;
                      } else if (act.type === 'file_deleted') {
                        iconColor = "text-red-600"; iconBg = "bg-red-100";
                        iconSvg = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;
                      } else if (act.type === 'file_renamed' || act.subject.includes('renamed')) {
                        iconColor = "text-orange-600"; iconBg = "bg-orange-100";
                        iconSvg = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>;
                      }

                      // Convert date
                      let relativeTime = act.datetime;
                      try {
                        const d = new Date(act.datetime);
                        const diffMins = Math.round((Date.now() - d.getTime()) / 60000);
                        if (diffMins < 60) relativeTime = `${diffMins} minutes ago`;
                        else if (diffMins < 24*60) relativeTime = `${Math.round(diffMins/60)} hours ago`;
                        else relativeTime = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      } catch(e) {}

                      return (
                        <div key={act.activity_id} className="relative">
                          <div className={`absolute -left-[33px] ${iconBg} ${iconColor} rounded-full p-1.5 ring-4 ring-white`}>
                            {iconSvg}
                          </div>
                          <div>
                            <p className="text-sm text-slate-800" dangerouslySetInnerHTML={{__html: act.subject_parsed || act.subject}}></p>
                            <p className="text-xs font-medium text-slate-400 mt-1">{relativeTime}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-slate-400 font-medium">No recorded activity yet</p>
                    <p className="text-xs text-slate-300 mt-1">Actions on this item will appear here.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Fullscreen Preview Modal */}
      {isPreviewModalOpen && selectedItem && !selectedItem.isFolder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-8 animate-in fade-in duration-200">
          <button 
            onClick={() => setIsPreviewModalOpen(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          
          <div className="w-full max-w-5xl h-full flex flex-col bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900">
              <h3 className="text-white font-medium truncate">{selectedItem.name}</h3>
              <a 
                href={getDownloadUrl(selectedItem)} 
                download={getDownloadName(selectedItem)}
                className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                <span>Download</span>
              </a>
            </div>
            
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-slate-950 p-4">
              {selectedItem.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={`/api/drive/preview?path=${encodeURIComponent(selectedItem.href)}`} alt={selectedItem.name} className="object-contain w-full h-full" />
              ) : selectedItem.name.match(/\.(mp4|webm|ogg)$/i) ? (
                <video controls autoPlay src={`/api/drive/preview?path=${encodeURIComponent(selectedItem.href)}`} className="w-full h-full"></video>
              ) : selectedItem.name.match(/\.(pdf)$/i) ? (
                <iframe src={`/api/drive/preview?path=${encodeURIComponent(selectedItem.href)}`} className="w-full h-full rounded-lg bg-white"></iframe>
              ) : (
                <div className="text-slate-500 flex flex-col items-center">
                  <svg className="w-24 h-24 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path>
                  </svg>
                  <p>No rich preview available for this file type.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu (Right Click) */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[110]" 
            onClick={() => setContextMenu(null)} 
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          ></div>
          <div 
            className="fixed z-[120] w-48 bg-white border rounded-xl shadow-2xl py-1 text-sm animate-in fade-in zoom-in-95 duration-100"
            style={{ 
              top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 200 : contextMenu.y), 
              left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 200 : contextMenu.x) 
            }}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); toggleSelection(contextMenu.item.href); }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>{selectedUrls.includes(contextMenu.item.href) ? "Deselect" : "Select"}</span>
            </button>
            <div className="border-t my-1"></div>
            <button 
              onClick={() => { setContextMenu(null); setSelectedItem(contextMenu.item); }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Open detail</span>
            </button>
            <button 
              onClick={(e) => { setContextMenu(null); handleRenameItem(contextMenu.item, e as any); }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              <span>Rename</span>
            </button>
            <button 
              onClick={(e) => { handleMoveItemClick(contextMenu.item, e as any); }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              <span>Move to...</span>
            </button>
            <button 
              onClick={(e) => { handleCopyItemClick(contextMenu.item, e as any); }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
              <span>Copy to...</span>
            </button>
            <a 
              href={getDownloadUrl(contextMenu.item)}
              download={getDownloadName(contextMenu.item)}
              onClick={() => setContextMenu(null)}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>Download</span>
            </a>
            <div className="border-t my-1"></div>
            <button 
              onClick={(e) => { setContextMenu(null); handleItemDelete(contextMenu.item, e as any); }}
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              <span>Delete</span>
            </button>
          </div>
        </>
      )}

      {/* Move/Copy Modal */}
      {moveCopyModal.isOpen && moveCopyModal.item && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setMoveCopyModal({ ...moveCopyModal, isOpen: false })}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center space-x-2">
                {moveCopyModal.action === 'move' ? (
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                ) : (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                )}
                <span className="truncate max-w-[200px]">{moveCopyModal.action === 'move' ? 'Move' : 'Copy'} <span className="text-blue-600">"{moveCopyModal.item.name}"</span></span>
              </h3>
              <button 
                onClick={() => setMoveCopyModal({ ...moveCopyModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 min-h-[250px]">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 px-2 flex justify-between items-center">
                <span>Select Destination</span>
                <span className="text-blue-600 font-normal truncate ml-4 text-right max-w-[200px]" title={decodeURIComponent(modalCurrentPath)}>
                  {decodeURIComponent(modalCurrentPath).replace('/remote.php/webdav', 'Drive') || 'Drive'}
                </span>
              </div>
              <div className="space-y-1">
                {(() => {
                  const mParentPath = modalCurrentPath !== '/remote.php/webdav/' 
                    ? (modalCurrentPath.replace(/\/$/, '').substring(0, modalCurrentPath.replace(/\/$/, '').lastIndexOf('/')) + '/') 
                    : null;
                  return mParentPath && mParentPath.startsWith('/remote.php/webdav') && (
                    <button
                      onClick={() => navigateModal(mParentPath)}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors border bg-white border-transparent hover:bg-slate-100 text-slate-700"
                    >
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"></path></svg>
                      <span className="font-medium">../ (Parent Folder)</span>
                    </button>
                  );
                })()}

                {isModalLoading ? (
                  <div className="py-12 flex justify-center items-center text-slate-400">
                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                ) : (
                  <>
                    {modalFolders.map((folder: FileItem) => (
                      <button
                        key={folder.href}
                        onClick={() => navigateModal(folder.href)}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors border bg-white border-transparent hover:bg-slate-100 text-slate-700"
                      >
                        <svg className="w-5 h-5 text-blue-400 fill-current" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>
                        <span className="font-medium truncate">{folder.name}</span>
                      </button>
                    ))}
                    {modalFolders.length === 0 && modalCurrentPath === '/remote.php/webdav/' && (
                      <div className="text-sm text-slate-400 text-center py-8 bg-slate-50 rounded-lg border border-dashed">No folders available here</div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end space-x-3 shrink-0">
              <button 
                onClick={() => setMoveCopyModal({ ...moveCopyModal, isOpen: false })}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitMoveCopy}
                disabled={isModalLoading || isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isDeleting ? "Processing..." : (moveCopyModal.action === 'move' ? 'Move Here' : 'Copy Here')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl font-medium flex items-center space-x-3 border border-slate-700">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

    </div>
  );
}
