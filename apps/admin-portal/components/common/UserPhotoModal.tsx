"use client";

import React, { useEffect, useState } from "react";
import { X, ExternalLink, Download, User, Loader2 } from "lucide-react";

export interface UserPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string | null;
  userName?: string;
  userEmail?: string | null;
  userRole?: string | null;
}

export const UserPhotoModal: React.FC<UserPhotoModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  userName = "User Photo",
  userEmail,
  userRole,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImageLoading(true);
      setImageError(false);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, photoUrl, onClose]);

  if (!isOpen || !photoUrl) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${userName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_photo`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(photoUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center max-w-2xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="w-full flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#23055c] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-purple-400/40">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white truncate">
                  {userName}
                </h3>
                {userRole && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50 shrink-0">
                    {userRole}
                  </span>
                )}
              </div>
              {userEmail && (
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <button
              type="button"
              onClick={handleDownload}
              title="Download photo"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <a
              href={photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full size in new tab"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              title="Close viewer"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Photo Canvas */}
        <div className="relative w-full flex-1 flex items-center justify-center p-6 min-h-[260px] max-h-[70vh] bg-black/40 overflow-hidden">
          {imageLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          )}

          {imageError ? (
            <div className="text-center space-y-2 p-8 text-slate-400">
              <p className="text-sm font-medium">
                Could not load original image file.
              </p>
              <a
                href={photoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-purple-400 hover:underline inline-flex items-center gap-1"
              >
                Open image source <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <img
              src={photoUrl}
              alt={userName}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              className={`max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-lg transition-opacity duration-300 ${
                imageLoading ? "opacity-0" : "opacity-100"
              }`}
            />
          )}
        </div>

        {/* Footer Hint */}
        <div className="w-full px-5 py-2.5 bg-slate-900/60 border-t border-slate-800 text-center text-[11px] text-slate-500 shrink-0">
          Press{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
            Esc
          </kbd>{" "}
          or click outside to dismiss
        </div>
      </div>
    </div>
  );
};
