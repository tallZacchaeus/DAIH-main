"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth, api } from "@daih/api-client";
import { UserRole } from "@daih/types";
import {
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Code2,
  RefreshCw,
  Search,
  Sparkles,
  ArrowLeft,
  Info,
  Check,
  RotateCcw,
} from "lucide-react";

interface EmailTemplateItem {
  type: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  description: string;
  variables: string[];
  isCustomized: boolean;
  isActive: boolean;
  updatedAt?: string;
}

const SAMPLE_VARIABLES: Record<string, string> = {
  name: "Dr. Oluwaseun Adeleke",
  customerName: "Dr. Oluwaseun Adeleke",
  verifyUrl:
    "https://hub.daih.ng/verify-email?token=sample_verification_token_123",
  resetUrl: "https://hub.daih.ng/reset-password?token=sample_reset_token_456",
  setupUrl: "https://admin.daih.ng/setup-account?token=sample_setup_token_789",
  role: "OPERATIONS_ADMIN",
  bookingReference: "DAIH-2026-X9812",
  resourceName: "Dedicated Executive Desk (Floor 2)",
  formattedAmount: "₦ 45,000.00",
  amount: "45000",
  currency: "NGN",
  invoiceNumber: "INV-2026-00412",
  dashboardUrl: "https://hub.daih.ng/bookings",
  passUrl: "https://hub.daih.ng/qr",
  formattedStart: "Sept 1, 2026, 08:00 AM",
  formattedEnd: "Sept 1, 2026, 08:00 PM",
  departureTime: "Sept 1, 2026, 05:42 PM",
  formattedDeparture: "05:42 PM",
  wifiSsid: "DAIH_Member_HighSpeed",
  wifiUsername: "DAIH-MBR-9812",
  wifiPin: "784912",
  reason: "User requested schedule adjustment",
  expiresInHours: "24",
};

export default function EmailTemplatesManagementPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [selectedType, setSelectedType] = useState<string>("staff_welcome");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"html" | "preview" | "text">(
    "preview",
  );

  // Form edit state
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isSuperAdmin =
    user?.role === UserRole.SUPER_ADMIN ||
    (user?.role as string) === "SUPER_ADMIN" ||
    (user?.role as string) === "ADMIN";

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await api.emailTemplates.listTemplates();
      if (data && Array.isArray(data)) {
        setTemplates(data);
        const current = data.find((t) => t.type === selectedType) || data[0];
        if (current) {
          setSelectedType(current.type);
          setSubject(current.subject);
          setHtmlBody(current.htmlBody);
          setTextBody(current.textBody || "");
        }
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to load email templates", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.type === selectedType);
  }, [templates, selectedType]);

  const handleSelectTemplate = (item: EmailTemplateItem) => {
    setSelectedType(item.type);
    setSubject(item.subject);
    setHtmlBody(item.htmlBody);
    setTextBody(item.textBody || "");
    setActiveTab("preview");
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.type.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [templates, searchQuery]);

  // Preview interpolation
  const previewHtml = useMemo(() => {
    let output = htmlBody;
    for (const [k, v] of Object.entries(SAMPLE_VARIABLES)) {
      output = output.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), v);
    }
    // Simple conditional evaluation for preview
    output = output.replace(
      /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, key, content) => {
        return SAMPLE_VARIABLES[key] ? content : "";
      },
    );
    return output;
  }, [htmlBody]);

  const handleSave = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      showToast("Subject and HTML body cannot be empty", "error");
      return;
    }

    setIsSaving(true);
    try {
      await api.emailTemplates.updateTemplate(selectedType, {
        subject,
        htmlBody,
        textBody: textBody || undefined,
        isActive: true,
      });

      // Update local item
      setTemplates((prev) =>
        prev.map((t) =>
          t.type === selectedType
            ? { ...t, subject, htmlBody, textBody, isCustomized: true }
            : t,
        ),
      );

      showToast("Template updated successfully!");
    } catch (err: any) {
      showToast(err?.message || "Failed to save template", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertVariable = (varName: string) => {
    const placeholder = `{{${varName}}}`;
    setHtmlBody((prev) => `${prev} ${placeholder}`);
    showToast(`Inserted ${placeholder} into template`);
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
        <p className="text-xs text-slate-500">
          Email template customization is restricted strictly to Super
          Administrators.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#23055c] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-2xl text-white shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === "error" ? "bg-rose-700" : "bg-[#23055c]"
          }`}
        >
          {toastMessage.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="text-xs text-slate-400 hover:text-[#23055c] flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Settings
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-[#23055c] px-2 py-0.5 rounded">
              Super Admin Only
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Mail className="w-7 h-7 text-[#23055c]" />
            Transactional Email Templates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Customize subjects, email copy, dynamic variables, and preview
            templates live with zero redeployments.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="bg-[#23055c] hover:bg-[#392271] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save & Invalidate Cache"}</span>
        </button>
      </div>

      {/* Main Grid: Sidebar Templates List + Editor Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Templates List Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EBE7F5] shadow-xs overflow-hidden flex flex-col max-h-[800px]">
          {/* Search Box */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-[#EBE7F5] rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c]"
              />
            </div>
          </div>

          {/* List items */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No templates matched your search.
              </div>
            ) : (
              filteredTemplates.map((item) => {
                const isSelected = item.type === selectedType;
                return (
                  <div
                    key={item.type}
                    onClick={() => handleSelectTemplate(item)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-purple-50/60 border-l-4 border-[#23055c]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? "text-[#23055c]" : "text-slate-800"
                        }`}
                      >
                        {item.type}
                      </span>
                      {item.isCustomized ? (
                        <span className="text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                          Customized
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Editor & Preview Area */}
        <div className="lg:col-span-8 space-y-4">
          {currentTemplate && (
            <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-xs overflow-hidden flex flex-col">
              {/* Top Editor Bar */}
              <div className="p-6 border-b border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Template Type: {currentTemplate.type}
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {currentTemplate.description}
                    </p>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setActiveTab("preview")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTab === "preview"
                          ? "bg-[#23055c] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("html")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTab === "html"
                          ? "bg-[#23055c] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>HTML Source</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("text")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTab === "text"
                          ? "bg-[#23055c] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Plain Text</span>
                    </button>
                  </div>
                </div>

                {/* Subject Line Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#EBE7F5] rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#23055c] font-medium"
                    placeholder="Enter email subject line"
                  />
                </div>

                {/* Available Variables Chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#23055c]" />
                    <span>
                      Available Dynamic Placeholders (Click to insert):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentTemplate.variables.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleInsertVariable(v)}
                        className="text-[11px] font-mono font-bold bg-purple-50 text-[#23055c] hover:bg-[#23055c] hover:text-white px-2.5 py-1 rounded-lg border border-purple-100 transition-all cursor-pointer"
                        title={`Click to insert {{${v}}}`}
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* View / Edit Mode Body */}
              <div className="p-6">
                {activeTab === "html" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      HTML Source Code
                    </label>
                    <textarea
                      rows={20}
                      value={htmlBody}
                      onChange={(e) => setHtmlBody(e.target.value)}
                      className="w-full font-mono text-xs p-4 bg-[#1e1e2e] text-[#f8f8f2] rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#23055c]"
                    />
                  </div>
                )}

                {activeTab === "text" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Plain Text Body Fallback
                    </label>
                    <textarea
                      rows={12}
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      placeholder="Plain text fallback for simple mail clients..."
                      className="w-full font-mono text-xs p-4 bg-[#F8F9FA] text-slate-800 rounded-xl border border-[#EBE7F5] focus:outline-none focus:border-[#23055c]"
                    />
                  </div>
                )}

                {activeTab === "preview" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        Live rendered preview with sample member data
                      </span>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 p-2 sm:p-6 flex justify-center">
                      <div
                        className="w-full max-w-[600px] bg-white rounded-xl shadow-xs overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
