"use client";
import { useRef, useState, useEffect } from "react";
import { uploadFileToNextcloud, createFolderNextcloud, createTextFileNextcloud } from "@/actions/nextcloud";

export default function UploadButton({ currentPath = "/remote.php/webdav/" }: { currentPath?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setIsDropdownOpen(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", currentPath);
      await uploadFileToNextcloud(formData);
    } catch (error) {
      console.error(error);
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateFolder = async () => {
    setIsDropdownOpen(false);
    const name = window.prompt("Enter new folder name:");
    if (!name) return;
    try {
      await createFolderNextcloud(name, currentPath);
    } catch (error) {
      console.error(error);
      alert("Failed to create folder.");
    }
  };

  const handleCreateTextFile = async () => {
    setIsDropdownOpen(false);
    const name = window.prompt("Enter new text file name:");
    if (!name) return;
    try {
      await createTextFileNextcloud(name, currentPath);
    } catch (error) {
      console.error(error);
      alert("Failed to create file.");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleUpload}
      />
      
      <button 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isUploading}
        className="bg-slate-800 text-blue-400 px-5 py-2 rounded-full font-semibold flex items-center space-x-2 hover:bg-slate-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
        </svg>
        <span className="text-white">{isUploading ? "Uploading..." : "New"}</span>
      </button>

      {isDropdownOpen && (
        <>
          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 mt-3 w-64 bg-[#1f2022] border border-white/5 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Top Pointer Arrow */}
            <div className="absolute -top-1.5 left-8 w-3 h-3 bg-[#1f2022] rotate-45 border-t border-l border-white/5"></div>
            
            <div className="py-2 relative z-10">
              <div className="px-4 py-2 mt-1 text-xs font-semibold text-slate-400">Upload from device</div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-4 py-2.5 text-slate-200 hover:bg-white/10 transition-colors flex items-center space-x-3"
              >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                </svg>
                <span>Upload files</span>
              </button>
              
              <div className="my-2 border-t border-white/5 mx-3"></div>
              
              <div className="px-4 py-2 text-xs font-semibold text-slate-400">Create new</div>
              <button 
                onClick={handleCreateFolder}
                className="w-full text-left px-4 py-2.5 text-slate-200 hover:bg-white/10 transition-colors flex items-center space-x-3"
              >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span>New folder</span>
              </button>
              <button 
                onClick={handleCreateTextFile}
                className="w-full text-left px-4 py-2.5 text-slate-200 hover:bg-white/10 transition-colors flex items-center space-x-3 mb-1"
              >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span>New text file</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
