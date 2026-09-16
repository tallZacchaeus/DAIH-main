"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  Loader2,
  Camera,
  RefreshCw,
} from "lucide-react";

export interface AvatarCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  isUploading?: boolean;
  onClose: () => void;
  onCropComplete: (croppedBase64: string) => Promise<void> | void;
}

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({
  isOpen,
  imageSrc,
  isUploading = false,
  onClose,
  onCropComplete,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset transform state when new image is provided
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support for mobile/trackpad
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    },
    [isDragging, dragStart],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleCropAndSave = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const outputSize = 512;
    const previewSize = 256;
    const scaleRatio = outputSize / previewSize;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.save();
    // Fill background with white in case of transparent borders
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputSize, outputSize);

    // 1. Move origin to center of canvas + scaled user drag offset
    ctx.translate(
      outputSize / 2 + position.x * scaleRatio,
      outputSize / 2 + position.y * scaleRatio,
    );

    // 2. Rotate around this center
    ctx.rotate((rotation * Math.PI) / 180);

    // 3. Scale by zoom level
    ctx.scale(zoom, zoom);

    // 4. Draw image centered at origin
    const baseW = outputSize;
    const naturalAspect =
      (img.naturalHeight || img.height || 1) /
      (img.naturalWidth || img.width || 1);
    const baseH = outputSize * naturalAspect;
    ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);

    ctx.restore();

    // Export as high quality webp data url
    const base64Data = canvas.toDataURL("image/webp", 0.95);
    onCropComplete(base64Data);
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center min-h-full animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#EBE7F5] shadow-2xl max-w-md w-full my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header - Fixed top */}
        <div className="p-4 sm:p-5 border-b border-[#EBE7F5] flex items-center justify-between bg-[#F8F9FA] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Adjust Profile Photo
              </h3>
              <p className="text-[11px] text-slate-500">
                Drag to reposition or use controls to zoom & rotate.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* Viewport / Canvas Container */}
          <div className="p-4 sm:p-6 bg-slate-950 flex flex-col items-center justify-center select-none overflow-hidden relative min-h-[280px]">
            {/* Crop Container (256x256 circular mask) */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className={`w-64 h-64 relative rounded-full overflow-hidden ring-4 ring-white/30 shadow-2xl ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Avatar Preview"
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none pointer-events-none transition-transform duration-75 ease-out select-none"
                style={{
                  width: "256px",
                  height: "auto",
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              />
            </div>

            {/* Helper hint */}
            <p className="text-[11px] text-slate-400 font-medium mt-3 sm:mt-4">
              Click & drag image to reposition
            </p>
          </div>

          {/* Controls */}
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-white">
            {/* Zoom Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-[#23055c]" />
                  Zoom
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#23055c]"
                />
                <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Quick Toolbar: Rotate & Reset */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90°</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions - Sticky Bottom */}
        <div className="p-3 sm:p-4 border-t border-[#EBE7F5] bg-[#F8F9FA] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCropAndSave}
            disabled={isUploading}
            className="px-5 py-2.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Profile Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
