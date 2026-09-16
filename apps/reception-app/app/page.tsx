"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  Clock,
  LogOut,
  LogIn,
  Wifi,
  Users,
  RefreshCw,
  Camera,
  CameraOff,
  Keyboard,
  Lock,
  Loader2,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Shield,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { api, useAuth } from "@daih/api-client";
import {
  BookingState,
  AccessRejectionReason,
  VerifyAccessPassResponse,
  AccessPassDetails,
  TerminalActivityRecord,
  LiveOccupancyDTO,
  ReceptionTerminalSummaryDTO,
  ReceptionShiftMetrics,
} from "@daih/types";
import { Html5Qrcode } from "html5-qrcode";

type ScannerMode = "CAMERA" | "HARDWARE" | "MANUAL";

/**
 * Plays a pleasant scan beep using Web Audio API
 */
function playScanBeep(success = true) {
  try {
    if (typeof window === "undefined") return;
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(success ? 880 : 330, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);

    if (navigator.vibrate) {
      navigator.vibrate(success ? [50, 50, 50] : [200]);
    }
  } catch {}
}

export default function ReceptionScannerPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [activeMode, setActiveMode] = useState<ScannerMode>("CAMERA");
  const [hardwareInput, setHardwareInput] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AccessPassDetails[]>([]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerifyAccessPassResponse | null>(null);
  const [lastActionNotice, setLastActionNotice] = useState<string | null>(null);

  // Telemetry state
  const [occupancy, setOccupancy] = useState<LiveOccupancyDTO | null>(null);
  const [activity, setActivity] = useState<TerminalActivityRecord[]>([]);
  const [shiftMetrics, setShiftMetrics] =
    useState<ReceptionShiftMetrics | null>(null);
  const [isTelemetryLoading, setIsTelemetryLoading] = useState(false);

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<
    { id: string; label: string }[]
  >([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "reception-qr-reader";
  const hardwareInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clock state
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch consolidated telemetry in a single round-trip
  const fetchTelemetry = useCallback(
    async (isManual = false) => {
      if (!user) return;
      setIsTelemetryLoading(true);
      try {
        const summary = await api.access.getTerminalSummary({
          forceRefresh: isManual,
        });
        if (summary) {
          setOccupancy(summary.occupancy);
          setActivity(summary.recentActivity || []);
          setShiftMetrics(summary.shiftMetrics);
        }
      } catch (err) {
        console.warn("Could not fetch terminal telemetry summary:", err);
      } finally {
        setIsTelemetryLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (user) {
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchTelemetry]);

  // Handle Token / Reference Verification
  const handleVerifyPass = useCallback(async (tokenOrRef: string) => {
    const clean = tokenOrRef.trim();
    if (!clean) return;

    setIsVerifying(true);
    setLastActionNotice(null);
    try {
      const response = await api.access.verifyPass(clean);
      setVerificationResult(response);
      playScanBeep(response.valid);
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        rejectionReason: AccessRejectionReason.INVALID_SIGNATURE,
        rejectionTitle: "Verification Error",
        rejectionMessage:
          err?.message || "Failed to communicate with verification API.",
      });
      playScanBeep(false);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Initialize Camera Scanner
  const startCamera = useCallback(async () => {
    if (!user) return;
    try {
      setCameraError(null);
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch {}
      }

      // Check if container exists in DOM
      const container = document.getElementById(scannerContainerId);
      if (!container) {
        setCameraError(
          "Scanner element not ready. Please switch modes or refresh.",
        );
        return;
      }

      const html5Qr = new Html5Qrcode(scannerContainerId, {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        verbose: false,
      });
      html5QrCodeRef.current = html5Qr;

      // Try camera devices enumeration
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(
            devices.map((d) => ({
              id: d.id,
              label: d.label || `Camera ${d.id.slice(0, 5)}`,
            })),
          );
        }
      } catch {}

      // Prefer environment facing mode (rear camera) or user selected ID
      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: "environment" };

      await html5Qr.start(
        cameraConfig,
        {
          fps: 20,
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          handleVerifyPass(decodedText);
        },
        () => {}, // ignore non-QR frame noise
      );

      setCameraActive(true);
    } catch (err: any) {
      console.warn("Camera start notice:", err?.message);
      setCameraError(
        "Camera access denied or unavailable. Please grant camera permission in your browser or switch to Hardware / Manual mode.",
      );
      setCameraActive(false);
    }
  }, [user, handleVerifyPass, selectedCameraId]);

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (user && activeMode === "CAMERA") {
      timeout = setTimeout(() => {
        startCamera();
      }, 100);
    } else {
      stopCamera();
    }
    return () => {
      clearTimeout(timeout);
      stopCamera();
    };
  }, [user, activeMode, startCamera, stopCamera]);

  // Handle Image File QR Scan
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsVerifying(true);
      const scanner =
        html5QrCodeRef.current || new Html5Qrcode(scannerContainerId);
      const decodedText = await scanner.scanFile(file, true);
      handleVerifyPass(decodedText);
    } catch (err: any) {
      alert("Could not detect a valid QR code in this image.");
    } finally {
      setIsVerifying(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Hardware USB Scanner Input
  const handleHardwareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hardwareInput.trim()) {
      handleVerifyPass(hardwareInput.trim());
      setHardwareInput("");
    }
  };

  // Handle Manual Search
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await api.access.searchBookings(manualQuery.trim());
      setSearchResults(results || []);
    } catch (err) {
      console.warn("Manual search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Process Check-In Action
  const handleProcessCheckIn = async () => {
    if (!verificationResult?.booking?.bookingId) return;

    setIsActionLoading(true);
    try {
      const res = await api.access.checkIn(
        verificationResult.booking.bookingId,
        {
          terminalId: "REC-GATE-01",
          notes: "Checked in via Reception Terminal",
        },
      );

      setLastActionNotice(
        res.isReEntry
          ? `✓ Member Return Recorded: ${res.booking.customerName} re-checked in.`
          : `✓ Check-In Confirmed: ${res.booking.customerName} checked in. Wi-Fi credentials issued.`,
      );

      await handleVerifyPass(verificationResult.booking.bookingId);
      fetchTelemetry();
    } catch (err: any) {
      alert(`Check-in failed: ${err?.message || "Internal error"}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Process Check-Out Action
  const handleProcessCheckOut = async () => {
    if (!verificationResult?.booking?.bookingId) return;

    setIsActionLoading(true);
    try {
      const res = await api.access.checkOut(
        verificationResult.booking.bookingId,
        {
          terminalId: "REC-GATE-01",
          notes: "Checked out via Reception Terminal",
        },
      );

      setLastActionNotice(
        `✓ Check-Out Recorded: Departure logged for ${res.booking.customerName}. Internet remains active until scheduled end time.`,
      );

      await handleVerifyPass(verificationResult.booking.bookingId);
      fetchTelemetry();
    } catch (err: any) {
      alert(`Check-out failed: ${err?.message || "Internal error"}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Clear verification
  const handleClearVerification = () => {
    setVerificationResult(null);
    setLastActionNotice(null);
    if (activeMode === "HARDWARE" && hardwareInputRef.current) {
      hardwareInputRef.current.focus();
    }
  };

  // Loading / Resolving Session Gate
  if (!mounted || isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9ff] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EBE7F5] text-[#23055c] flex items-center justify-center shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin text-[#23055c]" />
          </div>
          <span className="text-xs font-bold text-slate-500 tracking-tight">
            Loading Reception Terminal...
          </span>
        </div>
      </div>
    );
  }

  // Unauthenticated Gate Screen
  if (!user) {
    return (
      <div className="bg-[#ebeef3] min-h-screen flex items-center justify-center p-4 md:p-8 font-sans antialiased text-[#181c20] relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-30">
          <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#392271]/20 to-transparent absolute blur-[100px] -top-[150px] -right-[150px]" />
          <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#bfa9fe]/30 to-transparent absolute blur-[80px] -bottom-[100px] -left-[100px]" />
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl border border-[#EBE7F5] shadow-[0px_12px_32px_rgba(57,34,113,0.08)] overflow-hidden text-center p-8 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#EBE7F5] border border-purple-200 text-[#23055c] flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[#181c20]">
              Terminal Locked
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Sign in with authorized staff credentials to unlock hardware
              scanner terminal.
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-3.5 bg-[#392271] hover:bg-[#23055c] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sign In to Unlock Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans antialiased">
      {/* Top App Header */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 border-b border-[#EBE7F5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/images/logo.png"
              alt="DAIH Workspace Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="font-extrabold text-base sm:text-lg text-[#23055c] tracking-tight">
              DAIH Reception
            </span>
          </Link>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EBE7F5] text-[#23055c] text-[11px] font-bold border border-purple-200 uppercase tracking-wide">
              Gate Terminal
            </span>
            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
              <span>•</span>
              <span
                className="font-semibold text-slate-700"
                suppressHydrationWarning
              >
                {user
                  ? `${user.firstName} ${user.lastName}`
                  : "Officer on Duty"}
              </span>
              <span>•</span>
              <span
                className="font-mono text-[#23055c] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-[11px]"
                suppressHydrationWarning
              >
                {currentTime || "--:--:--"}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          {/* Mode Tabs */}
          <div className="flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setActiveMode("CAMERA")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "CAMERA"
                  ? "bg-[#23055c] text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-[#23055c] hover:bg-slate-200/50"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
            <button
              onClick={() => setActiveMode("HARDWARE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "HARDWARE"
                  ? "bg-[#23055c] text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-[#23055c] hover:bg-slate-200/50"
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>USB Scanner</span>
            </button>
            <button
              onClick={() => setActiveMode("MANUAL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === "MANUAL"
                  ? "bg-[#23055c] text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-[#23055c] hover:bg-slate-200/50"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Manual Search</span>
            </button>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => logout()}
            title="Sign Out Officer"
            className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner / Input Controls */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Active Mode Scanner Box */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#23055c]">
                  {activeMode === "CAMERA"
                    ? "Camera QR Code Scanner"
                    : activeMode === "HARDWARE"
                      ? "Hardware 2D Barcode Reader"
                      : "Manual Member Lookup"}
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {activeMode === "CAMERA"
                  ? "Sensor Active"
                  : activeMode === "HARDWARE"
                    ? "Wedge Auto-Submit Ready"
                    : "Instant Lookup"}
              </span>
            </div>

            {/* Mode 1: Live Camera Viewport */}
            {activeMode === "CAMERA" && (
              <div className="space-y-4">
                <div className="relative w-full aspect-video sm:aspect-square max-h-72 bg-slate-900 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner">
                  <div
                    id={scannerContainerId}
                    className="w-full h-full object-cover"
                  />
                  {cameraError && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
                      <CameraOff className="w-10 h-10 text-rose-500 mb-2" />
                      <p className="text-xs text-rose-700 font-semibold mb-3 max-w-xs">
                        {cameraError}
                      </p>
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 bg-[#23055c] hover:bg-[#392271] text-xs font-bold text-white rounded-lg transition shadow-xs cursor-pointer"
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}
                </div>

                {availableCameras.length > 1 && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">Camera source:</span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#23055c]"
                    >
                      {availableCameras.map((cam) => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Hold member QR code steadily in front of the lens.
                  </p>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileScan}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-[#23055c] hover:text-[#392271] font-bold underline underline-offset-2 cursor-pointer"
                    >
                      Scan Image File
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Hardware USB Scanner */}
            {activeMode === "HARDWARE" && (
              <div className="space-y-5 py-2">
                <div className="h-44 bg-[#F8F9FA] rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center">
                  <QrCode className="h-12 w-12 text-[#23055c] mb-2 animate-pulse" />
                  <p className="text-xs font-bold text-[#181c20]">
                    Ready for Hardware Scan
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                    Aim USB/Bluetooth scanner gun at member pass. Scans decode &
                    validate automatically on Enter.
                  </p>
                </div>

                <form onSubmit={handleHardwareSubmit} className="flex gap-2">
                  <input
                    ref={hardwareInputRef}
                    type="text"
                    placeholder="Scan pass or enter DAIH-BK-..."
                    value={hardwareInput}
                    onChange={(e) => setHardwareInput(e.target.value)}
                    autoFocus
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isVerifying || !hardwareInput.trim()}
                    className="px-6 py-3 bg-[#23055c] hover:bg-[#392271] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                  >
                    {isVerifying ? "Verifying..." : "Validate"}
                  </button>
                </form>
              </div>
            )}

            {/* Mode 3: Manual Search */}
            {activeMode === "MANUAL" && (
              <div className="space-y-4 py-2">
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by name, reference, email, client ID..."
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !manualQuery.trim()}
                    className="px-5 py-2.5 bg-[#23055c] hover:bg-[#392271] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </form>

                {searchResults.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {searchResults.map((b) => (
                      <div
                        key={b.bookingId}
                        onClick={() => handleVerifyPass(b.bookingId)}
                        className="p-3 bg-[#F8F9FA] hover:bg-[#EBE7F5]/50 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#181c20]">
                            {b.customerName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {b.resourceName} ·{" "}
                            <span className="font-mono text-[#23055c] font-semibold">
                              {b.reference}
                            </span>
                          </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                          {b.state}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center py-6">
                    Type a customer keyword to look up reservations.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Real-Time Occupancy & Shift Telemetry Widget */}
          {occupancy && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#23055c]" />
                  <span>Live Shift Telemetry &amp; Occupancy</span>
                </h3>
                <span className="text-xs font-bold text-[#23055c]">
                  {occupancy.totalCheckedIn} / {occupancy.totalCapacity} In Hub
                  ({occupancy.overallOccupancyRate}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 mb-3">
                <div
                  className="bg-gradient-to-r from-[#23055c] to-[#65519f] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, occupancy.overallOccupancyRate)}%`,
                  }}
                />
              </div>

              {/* Shift Key Performance Indicators */}
              {shiftMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-purple-50/60 rounded-xl border border-purple-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#23055c]">
                      Shift Check-Ins
                    </p>
                    <p className="text-sm font-extrabold text-[#23055c] mt-0.5">
                      {shiftMetrics.todayCheckedInCount}
                    </p>
                  </div>
                  <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      On-Site
                    </p>
                    <p className="text-sm font-extrabold text-emerald-800 mt-0.5">
                      {shiftMetrics.currentlyOnSiteCount}
                    </p>
                  </div>
                  <div className="p-2 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Departures
                    </p>
                    <p className="text-sm font-extrabold text-amber-800 mt-0.5">
                      {shiftMetrics.todayDeparturesCount}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      Expected
                    </p>
                    <p className="text-sm font-extrabold text-blue-800 mt-0.5">
                      {shiftMetrics.expectedArrivalsRemaining}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {occupancy.resources.slice(0, 4).map((r) => (
                  <div
                    key={r.resourceId}
                    className="p-2.5 bg-[#F8F9FA] rounded-xl border border-slate-200 text-center"
                  >
                    <p className="text-[10px] font-semibold text-slate-500 truncate">
                      {r.resourceName}
                    </p>
                    <p className="text-xs font-bold text-[#181c20] mt-0.5">
                      {r.currentOccupancy}/{r.capacity}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Verification Diagnostic & Action Hub */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Action notification banner */}
          {lastActionNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
              <span>{lastActionNotice}</span>
              <button
                onClick={() => setLastActionNotice(null)}
                className="text-emerald-600 hover:text-emerald-950 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Scenario 1: Active Verified Pass */}
          {verificationResult?.valid && verificationResult.booking ? (
            <div className="bg-white border border-emerald-300 rounded-2xl p-6 shadow-sm space-y-5">
              {/* Pass Validity Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-800">
                      Valid Access Pass
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {verificationResult.isReEntry
                        ? "Member Returning (Same-Day Re-Entry)"
                        : "Ready for Terminal Action"}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    verificationResult.booking.state === BookingState.CHECKED_IN
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : verificationResult.booking.state ===
                          BookingState.CHECKED_OUT
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-purple-100 text-[#23055c] border border-purple-200"
                  }`}
                >
                  {verificationResult.booking.state}
                </span>
              </div>

              {/* Member & Reservation Summary */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Member Name
                    </p>
                    <p className="text-base font-extrabold text-[#181c20] mt-0.5">
                      {verificationResult.booking.customerName}
                    </p>
                    {verificationResult.booking.clientId && (
                      <p className="text-xs text-[#23055c] font-mono font-semibold">
                        {verificationResult.booking.clientId}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Booking Reference
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                      {verificationResult.booking.reference}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#F8F9FA] rounded-xl space-y-2.5 border border-slate-200 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Workspace Resource:</span>
                    <span className="font-bold text-[#181c20]">
                      {verificationResult.booking.resourceName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled Time Slot:</span>
                    <span className="font-medium text-slate-800">
                      {new Date(
                        verificationResult.booking.startTime,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      —{" "}
                      {new Date(
                        verificationResult.booking.endTime,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {verificationResult.booking.checkedInAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">First Check-In:</span>
                      <span className="text-emerald-700 font-mono font-bold">
                        {new Date(
                          verificationResult.booking.checkedInAt,
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {verificationResult.booking.checkedOutAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Departure:</span>
                      <span className="text-amber-700 font-mono font-bold">
                        {new Date(
                          verificationResult.booking.checkedOutAt,
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Wi-Fi Credential Card */}
                {verificationResult.booking.wifiCredentials && (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Wifi className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-900">
                          {verificationResult.booking.wifiCredentials.ssid}
                        </p>
                        <p className="text-[11px] text-slate-600 font-mono">
                          User:{" "}
                          <span className="text-slate-900 font-semibold">
                            {
                              verificationResult.booking.wifiCredentials
                                .username
                            }
                          </span>{" "}
                          · PIN:{" "}
                          <span className="text-amber-700 font-bold">
                            {verificationResult.booking.wifiCredentials.pin}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Active
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {verificationResult.canCheckIn && (
                  <button
                    onClick={handleProcessCheckIn}
                    disabled={isActionLoading}
                    className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {verificationResult.isReEntry
                        ? "Process Re-Check In (Member Return)"
                        : "Confirm Member Check-In"}
                    </span>
                  </button>
                )}

                {verificationResult.canCheckOut && (
                  <button
                    onClick={handleProcessCheckOut}
                    disabled={isActionLoading}
                    className="flex-1 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Process Midday Check-Out</span>
                  </button>
                )}

                <button
                  onClick={handleClearVerification}
                  className="px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : verificationResult && !verificationResult.valid ? (
            /* Scenario 2: Explicit Rejection Diagnostics Matrix */
            <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold flex-shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-700">
                    {verificationResult.rejectionTitle ||
                      "Access Pass Rejected"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reason:{" "}
                    <span className="font-mono text-rose-700 font-bold">
                      {verificationResult.rejectionReason}
                    </span>
                  </p>
                </div>
              </div>

              {/* Explanatory Message */}
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 text-xs">
                <p className="text-rose-900 leading-relaxed font-medium">
                  {verificationResult.rejectionMessage}
                </p>

                {/* Detailed Diagnostic Sub-Card */}
                {verificationResult.rejectionReason ===
                  AccessRejectionReason.TOO_EARLY &&
                  verificationResult.rejectionDetails && (
                    <div className="p-3 bg-white rounded-lg border border-rose-100 space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">
                          Scheduled Start Time:
                        </span>
                        <span className="text-amber-700 font-bold">
                          {new Date(
                            verificationResult.rejectionDetails
                              .scheduledStartTime || "",
                          ).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-500 pt-1">
                        {verificationResult.rejectionDetails.policyNotice}
                      </p>
                    </div>
                  )}

                {verificationResult.rejectionReason ===
                  AccessRejectionReason.NO_SHOW &&
                  verificationResult.rejectionDetails?.auditProof && (
                    <div className="p-3 bg-white rounded-lg border border-rose-200 space-y-2 text-[11px]">
                      <p className="font-bold text-rose-700 uppercase tracking-wider text-[10px]">
                        Tamper-Proof Audit Proof
                      </p>
                      <div className="space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span>Ref:</span>
                          <span className="font-mono text-slate-900 font-bold">
                            {
                              verificationResult.rejectionDetails.auditProof
                                .bookingReference
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Scheduled Window:</span>
                          <span className="text-slate-800">
                            {
                              verificationResult.rejectionDetails.auditProof
                                .unredeemedWindow
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Terminal Scan:</span>
                          <span className="text-slate-800">
                            {new Date(
                              verificationResult.rejectionDetails.auditProof
                                .scannedAt,
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-500 text-[10px] pt-1 border-t border-slate-100">
                        {verificationResult.rejectionDetails.policyNotice}
                      </p>
                    </div>
                  )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleClearVerification}
                  className="w-full py-3.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  Dismiss & Scan Next Pass
                </button>
              </div>
            </div>
          ) : (
            /* Scenario 3: Idle / Ready State */
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-slate-500 flex flex-col items-center justify-center min-h-[320px] shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-[#EBE7F5] border border-purple-200 text-[#23055c] flex items-center justify-center mb-4 shadow-xs">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-[#181c20]">
                Awaiting Access Pass Scan
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Point camera at customer QR code, scan with USB reader, or
                search by reference. Validations and actions will appear here
                instantly.
              </p>
            </div>
          )}

          {/* Shift Activity Log */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex-1">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#23055c]" />
                <span>Recent Shift Activity</span>
              </h3>
              <button
                onClick={() => fetchTelemetry(true)}
                disabled={isTelemetryLoading}
                className="text-slate-400 hover:text-[#23055c] transition text-xs p-1 cursor-pointer"
                title="Refresh logs"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isTelemetryLoading ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>

            {activity.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activity.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 bg-[#F8F9FA] hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                          rec.action === "CHECK_IN"
                            ? "bg-emerald-100 text-emerald-800"
                            : rec.action === "CHECK_OUT"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-purple-100 text-[#23055c]"
                        }`}
                      >
                        {rec.action === "CHECK_IN"
                          ? "IN"
                          : rec.action === "CHECK_OUT"
                            ? "OUT"
                            : "RE"}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">
                          {rec.customerName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {rec.resourceName} ·{" "}
                          <span className="font-mono text-slate-700">
                            {rec.bookingReference}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono font-medium">
                      {new Date(rec.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">
                No shift activity recorded yet today.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Shared Platform Footer */}
      <footer className="bg-[#23055c] text-white w-full px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 mt-auto border-t border-[#392271] text-xs">
        <div className="font-bold tracking-tight text-sm">DAIH Workspace</div>
        <nav className="flex flex-wrap justify-center gap-4 sm:gap-6 text-slate-300 text-xs">
          <span>Reception Gate Terminal</span>
          <span>•</span>
          <span>Hardware Scanner Wedge Active</span>
          <span>•</span>
          <span>Access Telemetry Sync</span>
        </nav>
        <div className="text-slate-400 text-xs">
          © 2026 DAIH Hub. Authorized Terminal Access.
        </div>
      </footer>
    </div>
  );
}
