"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, useAuth } from "@daih/api-client";
import { PolicyDocument, PolicyType, UserRole } from "@daih/types";
import { useToast } from "@daih/ui";
import {
  Shield,
  FileText,
  Save,
  Check,
  Eye,
  Edit3,
  Loader2,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import { RichPolicyRenderer } from "../../../components/legal/RichPolicyRenderer";
import { VisualWysiwygEditor } from "../../../components/legal/VisualWysiwygEditor";

export default function PolicyEditorPage() {
  const { user } = useAuth();
  const toast = useToast();

  const isAuthorized =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.OPERATIONS_ADMIN ||
    (user?.role as any) === "SUPER_ADMIN" ||
    (user?.role as any) === "OPERATIONS_ADMIN";

  const [activeType, setActiveType] = useState<PolicyType>("TERMS_OF_SERVICE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"edit" | "preview" | "split">(
    "split",
  );

  // Form State
  const [policy, setPolicy] = useState<PolicyDocument | null>(null);
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [content, setContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");

  const hasUnsavedChanges = content !== lastSavedContent;

  const loadPolicy = async (type: PolicyType) => {
    setLoading(true);
    try {
      const doc = await api.policies.get(type);
      setPolicy(doc);
      setTitle(doc.title);
      setVersion(doc.version);
      setContent(doc.content);
      setLastSavedContent(doc.content);
    } catch (err: any) {
      console.error("Failed to load policy:", err);
      toast.error("Could not fetch policy document.", { title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy(activeType);
  }, [activeType]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.warning("Policy content cannot be empty.", {
        title: "Validation Error",
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await api.policies.update(activeType, {
        title,
        content,
        version,
      });

      setPolicy(updated);
      setLastSavedContent(updated.content);
      toast.success(
        `${updated.title} (v${updated.version}) is now live for all members.`,
        {
          title: "Policy Published",
        },
      );
    } catch (err: any) {
      console.error("Failed to update policy:", err);
      toast.error(err?.message || "Failed to update legal policy.", {
        title: "Save Failed",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#23055c] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Settings</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Terms &amp; Privacy Policy Rich Text Editor
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Official hub legal documentation, user agreements &amp; NDPR /
                NDPA 2023 compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadPolicy(activeType)}
            disabled={loading || saving}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || !isAuthorized}
            className="px-5 py-2 rounded-xl bg-[#23055c] hover:bg-[#34117c] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Publish Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Role Notice */}
      {!isAuthorized && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            You are viewing this policy in read-only mode. Only{" "}
            <strong>Operations Administrators</strong> and{" "}
            <strong>Super Administrators</strong> can modify legal terms.
          </span>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Document Type Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveType("TERMS_OF_SERVICE")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeType === "TERMS_OF_SERVICE"
                ? "bg-white text-[#23055c] shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveType("PRIVACY_POLICY")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeType === "PRIVACY_POLICY"
                ? "bg-white text-[#23055c] shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy &amp; NDPR</span>
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveView("edit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === "edit"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("split")}
            className={`hidden md:flex px-3 py-1.5 rounded-lg text-xs font-bold transition-all items-center gap-1.5 cursor-pointer ${
              activeView === "split"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("preview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === "preview"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Rich Preview</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center gap-3 text-slate-400 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#23055c]" />
          <p className="text-xs font-semibold">Loading legal policy draft...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metadata Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Title Input */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isAuthorized}
                placeholder="e.g. DAIH Terms of Service"
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#23055c] focus:bg-white"
              />
            </div>

            {/* Version Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Version Tag
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  disabled={!isAuthorized}
                  placeholder="e.g. 1.0"
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#23055c] focus:bg-white"
                />
                {hasUnsavedChanges && (
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Unsaved
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Editor & Preview Pane */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* Non-Technical Visual WYSIWYG Editor */}
            {(activeView === "edit" || activeView === "split") && (
              <div
                className={`flex flex-col h-full overflow-hidden ${activeView === "edit" ? "lg:col-span-2" : ""}`}
              >
                <VisualWysiwygEditor
                  value={content}
                  onChange={setContent}
                  disabled={!isAuthorized}
                  minHeight="540px"
                />
              </div>
            )}

            {/* Live Document Preview */}
            {(activeView === "preview" || activeView === "split") && (
              <div
                className={`bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden ${activeView === "preview" ? "lg:col-span-2" : ""}`}
              >
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-bold shrink-0">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Member Live Rich Preview</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Formatted exactly as seen by members on Web &amp; PWA
                  </span>
                </div>
                <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
                  <div className="border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-xl font-black text-slate-900">
                      {title || "Document Title"}
                    </h2>
                    <span className="text-xs text-slate-400 font-mono">
                      v{version || "1.0"}
                    </span>
                  </div>
                  <RichPolicyRenderer content={content} />
                </div>
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Last Modified:{" "}
                <strong className="text-slate-700">
                  {policy?.updatedAt
                    ? new Date(policy.updatedAt).toLocaleString()
                    : "Default"}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Authorized Editors:{" "}
                <strong className="text-slate-700">
                  Super Admin & Operations Admin
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
