"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Table,
  Quote,
  Undo2,
  Redo2,
  Sparkles,
  AlertTriangle,
  Info,
  ShieldAlert,
  ChevronDown,
  X,
  Check,
} from "lucide-react";

interface VisualWysiwygEditorProps {
  value: string;
  onChange: (htmlContent: string) => void;
  disabled?: boolean;
  minHeight?: string;
}

// Convert legacy Markdown to clean HTML for visual editing
function markdownToHtml(md: string): string {
  if (!md) return "<p><br></p>";
  if (
    /<\/?(p|h[1-6]|ul|ol|li|blockquote|table|strong|em|a|hr|br)[^>]*>/i.test(md)
  ) {
    return md; // Already HTML
  }

  const lines = md.split("\n");
  const htmlBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (/^---|\*\*\*$/.test(trimmed)) {
      htmlBlocks.push("<hr />");
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      htmlBlocks.push(`<h1>${formatInline(trimmed.slice(2))}</h1>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      htmlBlocks.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      htmlBlocks.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
      i++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const qLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        qLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      htmlBlocks.push(
        `<blockquote><p>${qLines.map(formatInline).join("<br />")}</p></blockquote>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(
          `<li>${formatInline(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`,
        );
        i++;
      }
      htmlBlocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(
          `<li>${formatInline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`,
        );
        i++;
      }
      htmlBlocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Paragraph
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      pLines.push(lines[i].trim());
      i++;
    }
    if (pLines.length > 0) {
      htmlBlocks.push(`<p>${pLines.map(formatInline).join(" ")}</p>`);
    }
  }

  return htmlBlocks.join("");
}

function formatInline(str: string): string {
  return str
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export const VisualWysiwygEditor: React.FC<VisualWysiwygEditorProps> = ({
  value,
  onChange,
  disabled = false,
  minHeight = "480px",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentBlock, setCurrentBlock] = useState("P");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [showClausesMenu, setShowClausesMenu] = useState(false);
  const [showCalloutsMenu, setShowCalloutsMenu] = useState(false);

  // Initialize editor content once
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const initialHtml = markdownToHtml(value);
    if (!currentHtml || currentHtml === "<p><br></p>") {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onChange(html);
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    if (disabled) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleFormatBlock = (tag: string) => {
    setCurrentBlock(tag);
    exec("formatBlock", `<${tag}>`);
  };

  // Open Link Modal with selected text
  const openLinkModal = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedSelection(sel.getRangeAt(0));
      setLinkText(sel.toString() || "");
    }
    setLinkUrl("");
    setIsLinkModalOpen(true);
  };

  // Insert Link from Modal
  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;

    if (savedSelection) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection);
    }

    const textToInsert = linkText || linkUrl;
    const anchorHtml = `<a href="${linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`}" target="_blank" rel="noopener noreferrer" style="color: #23055c; text-decoration: underline; font-weight: bold;">${textToInsert}</a>`;
    document.execCommand("insertHTML", false, anchorHtml);

    setIsLinkModalOpen(false);
    setLinkText("");
    setLinkUrl("");
    setSavedSelection(null);
    handleInput();
  };

  // Insert Callout Box
  const handleInsertCallout = (type: "note" | "warning" | "alert") => {
    setShowCalloutsMenu(false);
    let border = "#23055c";
    let bg = "#faf5ff";
    let text = "#371b76";
    let title = "Important Note";

    if (type === "warning") {
      border = "#f59e0b";
      bg = "#fffbeb";
      text = "#92400e";
      title = "Important Notice";
    } else if (type === "alert") {
      border = "#ef4444";
      bg = "#fef2f2";
      text = "#991b1b";
      title = "Strict Rule / Restriction";
    }

    const html = `
      <blockquote style="margin: 1rem 0; padding: 0.85rem 1.15rem; border-left: 4px solid ${border}; background-color: ${bg}; color: ${text}; border-radius: 0 0.75rem 0.75rem 0;">
        <strong style="display: block; margin-bottom: 0.25rem;">${title}</strong>
        <p style="margin: 0;">Enter clause details or specific member guidelines here...</p>
      </blockquote><p><br></p>
    `;
    document.execCommand("insertHTML", false, html);
    handleInput();
  };

  // Insert Table
  const handleInsertTable = () => {
    const tableHtml = `
      <div style="overflow-x: auto; margin: 1rem 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 8px 12px; font-weight: bold;">Item / Feature</th>
              <th style="padding: 8px 12px; font-weight: bold;">Standard Terms</th>
              <th style="padding: 8px 12px; font-weight: bold;">Applies To</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 12px;">Access Hours</td>
              <td style="padding: 8px 12px;">8:00 AM – 8:00 PM</td>
              <td style="padding: 8px 12px;">All Members</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 12px;">WiFi Connection</td>
              <td style="padding: 8px 12px;">High-Speed Fiber Voucher</td>
              <td style="padding: 8px 12px;">Active Bookings</td>
            </tr>
          </tbody>
        </table>
      </div><p><br></p>
    `;
    document.execCommand("insertHTML", false, tableHtml);
    handleInput();
  };

  // Insert Standard Legal Clauses
  const handleInsertClause = (clauseType: string) => {
    setShowClausesMenu(false);
    let clauseHtml = "";

    switch (clauseType) {
      case "cancellation":
        clauseHtml = `
          <h2>Reservation and Cancellation Policy</h2>
          <p>DAIH operates under a strict <strong>No-Refund Policy</strong> across all workspace bookings and subscriptions. Members may cancel an upcoming reservation up to 24 hours prior to the scheduled start time to release capacity for the community. For unredeemed reservations, discretionary rescheduling may be granted at the sole discretion of Hub Operations.</p>
        `;
        break;
      case "ndpa":
        clauseHtml = `
          <h2>Data Protection & NDPA Compliance</h2>
          <p>Dominion Allianze Innovation Hub (DAIH) operates in full compliance with the <strong>Nigeria Data Protection Act (NDPA) 2023</strong> and guidelines issued by the NDPC. We prioritize your privacy: personal data, access credentials, and transaction logs are encrypted at rest and never shared with unauthorized third parties.</p>
        `;
        break;
      case "conduct":
        clauseHtml = `
          <h2>Workspace Code of Conduct</h2>
          <p>All members, corporate teams, and invited guests agree to uphold a professional, respectful, and safe community environment. Please utilize designated soundproof telephone booths for calls exceeding 5 minutes. Harassment, willful property damage, or violation of security rules will result in immediate pass revocation.</p>
        `;
        break;
      case "liability":
        clauseHtml = `
          <h2>Limitation of Liability</h2>
          <p>DAIH shall not be liable for any indirect, incidental, or consequential damages resulting from utility supply interruptions, force majeure events, or loss of personal possessions left unattended within workspace common areas.</p>
        `;
        break;
      case "wifi":
        clauseHtml = `
          <h2>WiFi and Digital Network Acceptable Use</h2>
          <p>High-speed internet access is provided strictly for legitimate professional, research, and business purposes. Network scanning, bandwidth abuse, torrenting, or accessing prohibited material over hub Wi-Fi networks is prohibited and logged.</p>
        `;
        break;
      default:
        return;
    }

    document.execCommand("insertHTML", false, `${clauseHtml}<p><br></p>`);
    handleInput();
  };

  // Clean paste handler (strips proprietary Word XML tags)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    handleInput();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden h-full">
      {/* Visual Word-Style Toolbar */}
      <div className="p-2.5 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 select-none sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Document Heading Dropdown */}
          <div className="relative">
            <select
              value={currentBlock}
              onChange={(e) => handleFormatBlock(e.target.value)}
              disabled={disabled}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-purple-300 focus:outline-none focus:ring-1 focus:ring-[#23055c] cursor-pointer shadow-2xs"
            >
              <option value="P">Normal Text (Paragraph)</option>
              <option value="H1">Heading 1 (Main Title)</option>
              <option value="H2">Heading 2 (Section Title)</option>
              <option value="H3">Heading 3 (Sub-clause)</option>
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200 mx-0.5" />

          {/* Inline Styles */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => exec("bold")}
              disabled={disabled}
              title="Bold (Ctrl+B)"
              className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec("italic")}
              disabled={disabled}
              title="Italic (Ctrl+I)"
              className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec("underline")}
              disabled={disabled}
              title="Underline (Ctrl+U)"
              className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec("strikeThrough")}
              disabled={disabled}
              title="Strikethrough"
              className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => exec("insertUnorderedList")}
              disabled={disabled}
              title="Bulleted List"
              className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => exec("insertOrderedList")}
              disabled={disabled}
              title="Numbered List"
              className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Callout Box Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCalloutsMenu(!showCalloutsMenu)}
              disabled={disabled}
              className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Insert Notice Box"
            >
              <Quote className="w-3.5 h-3.5 text-[#23055c]" />
              <span>Notice Box</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showCalloutsMenu && (
              <div className="absolute left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-20 space-y-1">
                <button
                  type="button"
                  onClick={() => handleInsertCallout("note")}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-purple-900 hover:bg-purple-50 rounded-lg flex items-center gap-2 font-medium"
                >
                  <Info className="w-3.5 h-3.5 text-[#23055c]" />
                  <span>Informational Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertCallout("warning")}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-amber-900 hover:bg-amber-50 rounded-lg flex items-center gap-2 font-medium"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Important Notice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertCallout("alert")}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-rose-900 hover:bg-rose-50 rounded-lg flex items-center gap-2 font-medium"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Strict Restriction</span>
                </button>
              </div>
            )}
          </div>

          {/* Insert Tools: Link & Table */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={openLinkModal}
              disabled={disabled}
              title="Insert Web Link"
              className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer flex items-center gap-1 text-xs px-2"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="font-bold">Link</span>
            </button>
            <button
              type="button"
              onClick={handleInsertTable}
              disabled={disabled}
              title="Insert Grid Table"
              className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer flex items-center gap-1 text-xs px-2"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="font-bold">Table</span>
            </button>
          </div>

          {/* Legal Clause Presets */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowClausesMenu(!showClausesMenu)}
              disabled={disabled}
              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#23055c] border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#23055c]" />
              <span>Standard Clauses</span>
              <ChevronDown className="w-3 h-3 text-[#23055c]" />
            </button>

            {showClausesMenu && (
              <div className="absolute left-0 mt-1 w-60 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-20 space-y-1">
                <button
                  type="button"
                  onClick={() => handleInsertClause("cancellation")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#23055c] rounded-lg font-medium"
                >
                  + Reservation &amp; Cancellation Policy
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause("ndpa")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#23055c] rounded-lg font-medium"
                >
                  + NDPA 2023 Data Privacy Notice
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause("conduct")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#23055c] rounded-lg font-medium"
                >
                  + Workspace Code of Conduct
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause("liability")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#23055c] rounded-lg font-medium"
                >
                  + Limitation of Liability Clause
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertClause("wifi")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#23055c] rounded-lg font-medium"
                >
                  + WiFi &amp; Network Acceptable Use
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => exec("undo")}
            disabled={disabled}
            title="Undo"
            className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec("redo")}
            disabled={disabled}
            title="Redo"
            className="p-1.5 text-slate-600 hover:text-[#23055c] hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Document Canvas */}
      <div className="p-6 sm:p-10 bg-slate-50/50 overflow-y-auto flex-1">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onPaste={handlePaste}
          style={{ minHeight }}
          className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-8 sm:p-12 outline-none focus:ring-2 focus:ring-[#23055c]/20 prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h1:text-2xl sm:prose-h1:text-3xl prose-h2:text-xl prose-h3:text-base prose-p:text-xs sm:prose-p:text-sm prose-p:leading-relaxed prose-li:text-xs sm:prose-li:text-sm"
        />
      </div>

      {/* Simple Link Insertion Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#23055c]" />
                <span>Insert Web Link</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInsertLink} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Text to Display
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Read our NDPA Policy"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#23055c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Web Address (URL)
                </label>
                <input
                  type="text"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#23055c]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#23055c] hover:bg-[#34117c] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Insert Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
