"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, useAuth } from "@daih/api-client";
import {
  SupportSettingsRecord,
  SupportContactChannelsDTO,
  FAQItemDTO,
  UserRole,
} from "@daih/types";
import { useToast } from "@daih/ui";
import {
  HelpCircle,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  RotateCcw,
  Loader2,
  Eye,
  EyeOff,
  Search,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Headphones,
  Sparkles,
  X,
  Filter,
} from "lucide-react";

const FAQ_CATEGORIES = [
  "Booking & Reservations",
  "Workspace & Amenities",
  "Access & Gate Entry",
  "Billing & Payments",
  "General Inquiries",
];

export default function SupportManagerPage() {
  const { user } = useAuth();
  const toast = useToast();

  const isAuthorized =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.OPERATIONS_ADMIN ||
    (user?.role as any) === "SUPER_ADMIN" ||
    (user?.role as any) === "OPERATIONS_ADMIN";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"channels" | "faqs">("channels");

  // Contact Channels State
  const [contact, setContact] = useState<SupportContactChannelsDTO>({
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    operatingHours: "",
  });

  // FAQs State
  const [faqs, setFaqs] = useState<FAQItemDTO[]>([]);

  // Baseline state for tracking unsaved changes
  const [baselineContact, setBaselineContact] =
    useState<SupportContactChannelsDTO | null>(null);
  const [baselineFaqs, setBaselineFaqs] = useState<FAQItemDTO[]>([]);

  // FAQ Modal / Editing State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItemDTO | null>(null);
  const [formCategory, setFormCategory] = useState(FAQ_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formPublished, setFormPublished] = useState(true);

  // FAQ Filter and Search
  const [faqSearch, setFaqSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  const hasUnsavedChanges =
    JSON.stringify(contact) !== JSON.stringify(baselineContact) ||
    JSON.stringify(faqs) !== JSON.stringify(baselineFaqs);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.support.get();
      if (res) {
        setContact(res.contact);
        setFaqs(res.faqs || []);
        setBaselineContact(res.contact);
        setBaselineFaqs(res.faqs || []);
      }
    } catch (err: any) {
      console.error("Failed to load support settings:", err);
      toast.error(err?.message || "Could not fetch support settings.", {
        title: "Load Error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveAll = async () => {
    if (!isAuthorized) {
      toast.error(
        "Only Super Admin and Operations Managers are permitted to save changes.",
        { title: "Unauthorized" },
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await api.support.update({
        contact,
        faqs,
      });

      setContact(updated.contact);
      setFaqs(updated.faqs);
      setBaselineContact(updated.contact);
      setBaselineFaqs(updated.faqs);

      toast.success(
        "Support channels and FAQ knowledge base updated successfully.",
        {
          title: "Settings Saved",
        },
      );
    } catch (err: any) {
      console.error("Failed to save support settings:", err);
      toast.error(err?.message || "Failed to update support configuration.", {
        title: "Save Failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (baselineContact) {
      setContact({ ...baselineContact });
    }
    setFaqs([...baselineFaqs]);
    toast.info("Changes reverted to previously saved version.", {
      title: "Reset",
    });
  };

  // FAQ CRUD Handlers
  const handleOpenAddModal = () => {
    setEditingFaq(null);
    setFormCategory(FAQ_CATEGORIES[0]);
    setCustomCategory("");
    setFormQuestion("");
    setFormAnswer("");
    setFormPublished(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (faq: FAQItemDTO) => {
    setEditingFaq(faq);
    if (FAQ_CATEGORIES.includes(faq.category)) {
      setFormCategory(faq.category);
      setCustomCategory("");
    } else {
      setFormCategory("OTHER");
      setCustomCategory(faq.category);
    }
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormPublished(faq.isPublished);
    setIsModalOpen(true);
  };

  const handleSaveModalFaq = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory =
      formCategory === "OTHER" ? customCategory.trim() : formCategory;

    if (!finalCategory) {
      toast.warning("Please specify a category for this FAQ item.", {
        title: "Category Required",
      });
      return;
    }

    if (!formQuestion.trim() || !formAnswer.trim()) {
      toast.warning("Both Question and Answer fields are required.", {
        title: "Validation Error",
      });
      return;
    }

    if (editingFaq) {
      // Update existing
      setFaqs((prev) =>
        prev.map((item) =>
          item.id === editingFaq.id
            ? {
                ...item,
                category: finalCategory,
                question: formQuestion.trim(),
                answer: formAnswer.trim(),
                isPublished: formPublished,
              }
            : item,
        ),
      );
    } else {
      // Add new
      const newItem: FAQItemDTO = {
        id: `faq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: finalCategory,
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        isPublished: formPublished,
        orderIndex: faqs.length + 1,
      };
      setFaqs((prev) => [...prev, newItem]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteFaq = (id: string) => {
    if (confirm("Are you sure you want to delete this FAQ?")) {
      setFaqs((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleTogglePublish = (id: string) => {
    setFaqs((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isPublished: !item.isPublished } : item,
      ),
    );
  };

  const handleMoveFaq = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const newFaqs = [...faqs];
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[targetIndex];
    newFaqs[targetIndex] = temp;

    // re-index
    const reindexed = newFaqs.map((item, idx) => ({
      ...item,
      orderIndex: idx + 1,
    }));
    setFaqs(reindexed);
  };

  // Filtered FAQs
  const filteredFaqs = faqs.filter((item) => {
    const matchesCategory =
      selectedCategoryFilter === "ALL" ||
      item.category.toLowerCase() === selectedCategoryFilter.toLowerCase();

    const matchesSearch =
      faqSearch.trim() === "" ||
      item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(faqSearch.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const allAvailableCategories = Array.from(
    new Set([...FAQ_CATEGORIES, ...faqs.map((f) => f.category)]),
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
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
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Customer Support Channels &amp; FAQs
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Configure live contact links and manage the self-service Help
                Center knowledge base for all members.
              </p>
            </div>
          </div>
        </div>

        {/* Global Save Controls */}
        <div className="flex items-center gap-2.5">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || saving}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard Changes</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={loading || saving || !isAuthorized || !hasUnsavedChanges}
            className="px-5 py-2 rounded-xl bg-[#23055c] hover:bg-[#34117c] text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Live...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Role Alert for Non-Authorized */}
      {!isAuthorized && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            You are viewing support configurations in{" "}
            <strong>read-only mode</strong>. Only{" "}
            <strong>Operations Administrators</strong> and{" "}
            <strong>Super Administrators</strong> can modify contact channels
            and publish FAQs.
          </span>
        </div>
      )}

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-[#23055c] text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-[#23055c]" />
            <span>
              You have unsaved changes. Remember to click{" "}
              <strong>Save All Changes</strong> to update live member
              applications.
            </span>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving || !isAuthorized}
            className="px-3 py-1 bg-[#23055c] text-white rounded-lg text-xs font-bold hover:bg-[#34117c] transition-colors"
          >
            Save Now
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("channels")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "channels"
              ? "bg-[#23055c] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Hub Contact Channels</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faqs")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "faqs"
              ? "bg-[#23055c] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Frequently Asked Questions ({faqs.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Loader2 className="w-8 h-8 text-[#23055c] animate-spin" />
          <p className="text-xs text-slate-500 font-medium">
            Loading support settings...
          </p>
        </div>
      ) : activeTab === "channels" ? (
        /* TAB 1: CONTACT CHANNELS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#EBE7F5] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#23055c]" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Direct Contact Channels
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Live on Customer Support Page
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={contact.phone}
                      onChange={(e) =>
                        setContact({ ...contact, phone: e.target.value })
                      }
                      disabled={!isAuthorized}
                      placeholder="+234 800 324 4482"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] transition-all disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Direct call line for visitors and existing hub subscribers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    WhatsApp Chat Number or Direct Link
                  </label>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={contact.whatsapp}
                      onChange={(e) =>
                        setContact({ ...contact, whatsapp: e.target.value })
                      }
                      disabled={!isAuthorized}
                      placeholder="+2348003244482 or https://wa.me/2348003244482"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] transition-all disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Opens an instant WhatsApp chat when clicked by members on
                    mobile or desktop.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Support Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) =>
                        setContact({ ...contact, email: e.target.value })
                      }
                      disabled={!isAuthorized}
                      placeholder="support@daih.ng"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] transition-all disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Official inbox for support tickets, billing inquiries, and
                    membership correspondence.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#EBE7F5] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#23055c]" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Location &amp; Operating Hours
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Physical Hub Campus Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-rose-500 absolute left-3.5 top-3" />
                    <textarea
                      rows={2}
                      value={contact.address}
                      onChange={(e) =>
                        setContact({ ...contact, address: e.target.value })
                      }
                      disabled={!isAuthorized}
                      placeholder="DAIH Innovation Complex, Redemption City, Ogun State, Nigeria"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] transition-all resize-none disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Operating Schedule &amp; Support Hours
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-blue-500 absolute left-3.5 top-3" />
                    <textarea
                      rows={2}
                      value={contact.operatingHours}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          operatingHours: e.target.value,
                        })
                      }
                      disabled={!isAuthorized}
                      placeholder="Monday – Saturday: 8:00 AM – 8:00 PM WAT. Closed on Sundays."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] transition-all resize-none disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Summarize your desk availability, reception desk hours, and
                    weekend schedule.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Preview Card */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#23055c] to-[#34117c] rounded-2xl p-5 text-white shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Member App Preview
                </span>
              </div>
              <h3 className="text-sm font-black mb-1">How members see this</h3>
              <p className="text-[11px] text-purple-200 mb-4 leading-relaxed">
                Changes saved here immediately update the customer support
                portal and mobile web app.
              </p>

              <div className="space-y-2.5 bg-white/10 backdrop-blur-xs p-3.5 rounded-xl text-xs border border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] text-purple-200">Phone</div>
                    <div className="font-bold truncate">
                      {contact.phone || "Not set"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/30 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] text-purple-200">WhatsApp</div>
                    <div className="font-bold truncate">
                      {contact.whatsapp || "Not set"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-400/30 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-purple-200" />
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] text-purple-200">Email</div>
                    <div className="font-bold truncate">
                      {contact.email || "Not set"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-1 border-t border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-blue-200" />
                  </div>
                  <div>
                    <div className="text-[10px] text-purple-200">
                      Operating Hours
                    </div>
                    <div className="text-[11px] font-medium leading-tight">
                      {contact.operatingHours || "Not specified"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-purple-300">Live Support Page:</span>
                <Link
                  href="/support"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-white font-bold hover:underline"
                >
                  <span>Open Page</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: FAQ MANAGER */
        <div className="space-y-6">
          {/* Controls & Search */}
          <div className="bg-white rounded-2xl p-4 border border-[#EBE7F5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search questions or answers..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] transition-all"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#23055c] cursor-pointer"
              >
                <option value="ALL">All Categories ({faqs.length})</option>
                {allAvailableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({faqs.filter((f) => f.category === cat).length})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              disabled={!isAuthorized}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#23055c] hover:bg-[#34117c] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add FAQ Question</span>
            </button>
          </div>

          {/* FAQs List */}
          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#23055c] mx-auto flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {faqSearch
                  ? "No matching questions found"
                  : "No FAQ items in this category"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {faqSearch
                  ? "Try adjusting your search terms or filter to find what you're looking for."
                  : "Click 'Add FAQ Question' above to create helpful guidance for hub members."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((item, index) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-5 border transition-all shadow-xs ${
                    item.isPublished
                      ? "border-slate-200 hover:border-purple-200"
                      : "border-dashed border-slate-300 bg-slate-50/70 opacity-80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-[#23055c] px-2.5 py-0.5 rounded-full border border-purple-100">
                          {item.category}
                        </span>
                        {item.isPublished ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                            Published
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
                            Draft (Hidden)
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-slate-900 leading-snug">
                        {item.question}
                      </h4>

                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                        {item.answer}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start pt-1">
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        onClick={() => handleMoveFaq(index, "up")}
                        disabled={!isAuthorized || index === 0}
                        title="Move Up"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveFaq(index, "down")}
                        disabled={
                          !isAuthorized || index === filteredFaqs.length - 1
                        }
                        title="Move Down"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle Published */}
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(item.id)}
                        disabled={!isAuthorized}
                        title={
                          item.isPublished ? "Unpublish FAQ" : "Publish FAQ"
                        }
                        className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                          item.isPublished
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {item.isPublished ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        disabled={!isAuthorized}
                        title="Edit FAQ"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 text-slate-700 hover:text-[#23055c] cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(item.id)}
                        disabled={!isAuthorized}
                        title="Delete FAQ"
                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT FAQ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#23055c]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingFaq ? "Edit FAQ Item" : "Create New FAQ Question"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalFaq} className="p-6 space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Knowledge Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#23055c]"
                >
                  {FAQ_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="OTHER">+ Custom Category</option>
                </select>
                {formCategory === "OTHER" && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Type new category name..."
                    className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#23055c]"
                    autoFocus
                  />
                )}
              </div>

              {/* Question */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Frequently Asked Question
                </label>
                <input
                  type="text"
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="e.g., How do I book a private meeting room?"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c]"
                  required
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Clear, User-Friendly Answer
                </label>
                <textarea
                  rows={4}
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  placeholder="Provide complete step-by-step instructions or policy explanation that anyone can easily follow..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] resize-none"
                  required
                />
              </div>

              {/* Published Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Publish Status
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Make this question visible immediately to all members.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formPublished}
                  onChange={(e) => setFormPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#23055c] rounded cursor-pointer"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#23055c] hover:bg-[#34117c] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingFaq ? "Update Question" : "Add to FAQ List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
