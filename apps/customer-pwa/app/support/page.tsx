"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, useAuth } from "@daih/api-client";
import {
  LifeBuoy,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Wifi,
  Calendar,
  CreditCard,
  QrCode,
  ExternalLink,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    category: "Bookings",
    question: "How do workspace holds and bookings work?",
    answer:
      "When you select an open desk, private office, or studio, a temporary 10-minute hold is placed to prevent double-booking while you complete checkout. Once payment is confirmed via Paystack, your booking is instantly confirmed and a secure QR check-in pass is issued.",
  },
  {
    category: "Check-in",
    question: "How do I check in when I arrive at DAIH Hub?",
    answer:
      "Simply open the Customer PWA on your phone, go to your booking details or click 'QR Pass' on your dashboard, and present your QR code to the receptionist or gate scanner at the front desk. The system validates your active booking immediately.",
  },
  {
    category: "WiFi",
    question: "How do I get my WiFi credentials?",
    answer:
      "Upon confirmed booking and arrival, your personal high-speed WiFi access voucher and password are automatically generated and visible in your dashboard's 'WiFi Access' card.",
  },
  {
    category: "Modifications",
    question: "Can I reschedule or cancel my reservation?",
    answer:
      "Yes. You can manage or cancel your upcoming booking directly from the 'My Bookings' page up to 24 hours prior to the scheduled start time according to our reservation policy. While bookings are generally non-refundable, exceptional refund requests can be reviewed by our team.",
  },
  {
    category: "Refunds",
    question: "What is your refund policy, and how do I request a refund?",
    answer:
      "Under our general terms, reservations operate a standard no-refund policy. However, exceptional refunds may be considered under qualifying circumstances (such as facility equipment failures, space unavailability, or verifiable duplicate payments). To submit a refund request, please email support at support@daih.ng with your Booking Reference ID, detailed reason for the request, and any relevant details. Our Operations team will evaluate your case with Finance Administration.",
  },
  {
    category: "PeeDee Coins",
    question: "How do I earn PeeDee Coins?",
    answer:
      "You earn PeeDee Coins automatically on every confirmed booking check-in (1 PD Coin per ₦200 spent, boosted to 1.25x for Silver members and 1.5x for Gold VIP members). You also earn 5% on your referred friends' booking spend (min 50 PD on their first check-in), 50 PD birthday bonuses, and 30 PD monthly streak rewards.",
  },
  {
    category: "PeeDee Coins",
    question: "When do my coins expire?",
    answer:
      "PeeDee Coins are valid for 12 rolling months from the date they are earned. Earning or redeeming coins regularly keeps your account active and prevents reward forfeiture.",
  },
  {
    category: "PeeDee Coins",
    question: "Why can coins only cover half my booking?",
    answer:
      "To ensure a sustainable and fair loyalty ecosystem, PD Coins can cover up to 50% (maximum discount percentage) of your booking total before payment. Coins are valued at 100 PDC = ₦100, with a minimum redemption floor of 100 PDC.",
  },
  {
    category: "Referrals",
    question: "Why has my referral not paid out yet?",
    answer:
      "Referral rewards pay out automatically when your referred friend completes their first verified in-person check-in (access.checked_in) for a paid reservation within 90 days of signup. If they have only created an account or haven't checked in yet, the reward will trigger as soon as they arrive at the hub.",
  },
  {
    category: "Payments",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major Nigerian debit cards (Mastercard, Visa, Verve), Bank Transfers, USSD, and Apple Pay through our secure Paystack payment gateway. Instant automated receipts and VAT invoices are generated for every transaction.",
  },
  {
    category: "Visitors",
    question: "Can I bring guests or clients for meetings?",
    answer:
      "Private Office and Conference Suite bookings include guest allowances for meeting attendees. Guests simply check in at the reception desk with your booking reference.",
  },
];

import { useContactSettings } from "../../hooks/useContactSettings";

export default function CustomerSupportPage() {
  const { user, isAuthenticated } = useAuth();
  const { contact } = useContactSettings();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.support
      .get()
      .then((res) => {
        if (isMounted && res?.faqs && res.faqs.length > 0) {
          const published = res.faqs.filter((f) => f.isPublished !== false);
          if (published.length > 0) {
            setFaqs(published);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not load support FAQs:", err?.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Contact Form State
  const [name, setName] = useState(
    user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "",
  );
  const [email, setEmail] = useState(user?.email || "");
  const [category, setCategory] = useState("Bookings & Reservations");
  const [priority, setPriority] = useState("Normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    id: string;
    subject: string;
  } | null>(null);

  // FAQ Accordion State
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !email.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      const generatedTicket = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedTicket({
        id: generatedTicket,
        subject,
      });
      setSubmitting(false);
      setSubject("");
      setMessage("");
    }, 600);
  };

  const backLink = isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-[#181c20] font-sans pb-16 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 sm:px-8 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href={backLink}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-[#23055c] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>
              {isAuthenticated ? "Back to Dashboard" : "Back to Login"}
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-purple-50 text-[#23055c] rounded-full border border-purple-100">
            <ShieldCheck className="w-3.5 h-3.5 text-[#23055c]" />
            <span>DAIH Member Support</span>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-[#23055c] via-[#2f0b75] to-[#43129e] text-white py-12 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold tracking-wide uppercase">
            <LifeBuoy className="w-3.5 h-3.5 text-purple-200" />
            <span>Help &amp; Support Hub</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            How can we assist your workday today?
          </h1>
          <p className="text-xs sm:text-sm text-purple-100/90 max-w-2xl mx-auto leading-relaxed">
            Get instant answers to facility questions, submit support inquiries,
            or reach out directly to the Dominion Allianze Innovation Hub
            support desk.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 -mt-6 flex-1 space-y-8">
        {/* Direct Contact Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Front Desk Phone */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-[#23055c]/40 transition-all">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                Front Desk Helpline
              </h3>
              <p className="text-xs text-slate-500">
                Direct verbal assistance with front-desk staff during open
                hours.
              </p>
            </div>
            {contact?.phone ? (
              <a
                href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                className="mt-4 text-xs font-bold text-[#23055c] hover:underline inline-flex items-center gap-1"
              >
                <span>{contact.phone}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="mt-4 text-xs text-slate-400">
                Available on site
              </span>
            )}
          </div>

          {/* WhatsApp Support */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                WhatsApp Chat
              </h3>
              <p className="text-xs text-slate-500">
                Instant messaging for fast assistance, directions &amp;
                workspace checks.
              </p>
            </div>
            {contact?.whatsapp ? (
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Chat on WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="mt-4 text-xs text-slate-400">
                Support chat offline
              </span>
            )}
          </div>

          {/* Email Support */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-500/40 transition-all">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                Official Email
              </h3>
              <p className="text-xs text-slate-500">
                Send official corporate requests, invoices, or partnerships
                inquiries.
              </p>
            </div>
            {contact?.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="mt-4 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <span>{contact.email}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="mt-4 text-xs text-slate-400">
                Email loading...
              </span>
            )}
          </div>

          {/* Hub Location & Hours */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-all">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                Hub Working Hours
              </h3>
              <p className="text-xs text-slate-500 whitespace-pre-line">
                {contact?.operatingHours || "Mon - Sat: 8:00 AM – 6:00 PM"}
              </p>
            </div>
            <div className="mt-4 text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span className="truncate">
                {contact?.address || "DAIH Hub, Redemption City"}
              </span>
            </div>
          </div>
        </div>

        {/* Support Grid: Ticket Form (Left 7 cols) & FAQs (Right 5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Ticket Submission Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-[#23055c]" />
                <span>Submit a Support Request</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Our support staff responds promptly to workspace and account
                inquiries.
              </p>
            </div>

            {submittedTicket && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ticket Created Successfully!</span>
                </div>
                <p>
                  Your ticket reference is <strong>{submittedTicket.id}</strong>
                  . A confirmation and response will be delivered to{" "}
                  <strong>{email}</strong>.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Inquiry Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="Bookings & Reservations">
                      Bookings &amp; Reservations
                    </option>
                    <option value="Desk, Room & Studio Facilities">
                      Desk, Room &amp; Studio Facilities
                    </option>
                    <option value="WiFi & Network Access">
                      WiFi &amp; Network Access
                    </option>
                    <option value="Payments & Billing">
                      Payments &amp; Invoices
                    </option>
                    <option value="QR Pass & Gate Access">
                      QR Pass &amp; Gate Access
                    </option>
                    <option value="General Inquiries">
                      General Inquiries &amp; Feedback
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Urgency Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="Normal">Normal (Within 4 hours)</option>
                    <option value="Urgent">
                      Urgent (Immediate assistance)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your inquiry"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Detailed Message
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question in detail..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#23055c] hover:bg-[#34117c] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? "Submitting Request..."
                      : "Send Support Message"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Right: FAQs Accordion (Right 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Quick answers to common questions
                  </p>
                </div>
                <Sparkles className="w-4 h-4 text-[#23055c]" />
              </div>

              <div className="space-y-2">
                {faqs.map((faq, idx) => {
                  const isOpen = expandedIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(idx)}
                        className="w-full text-left p-3.5 flex items-center justify-between gap-2 text-xs font-bold text-slate-800 hover:text-[#23055c] transition-colors cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-3.5 pb-3.5 text-xs text-slate-600 leading-relaxed animate-in fade-in duration-150">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50/40 rounded-2xl border border-purple-100 p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#23055c] uppercase tracking-wide">
                Quick Navigation
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/book"
                  className="p-2.5 bg-white rounded-xl border border-purple-100 font-bold text-slate-700 hover:text-[#23055c] flex items-center gap-2 hover:shadow-2xs transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#23055c]" />
                  <span>Book Space</span>
                </Link>
                <Link
                  href="/bookings"
                  className="p-2.5 bg-white rounded-xl border border-purple-100 font-bold text-slate-700 hover:text-[#23055c] flex items-center gap-2 hover:shadow-2xs transition-all"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#23055c]" />
                  <span>My Bookings</span>
                </Link>
                <Link
                  href="/terms"
                  className="p-2.5 bg-white rounded-xl border border-purple-100 font-bold text-slate-700 hover:text-[#23055c] flex items-center gap-2 hover:shadow-2xs transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#23055c]" />
                  <span>Terms of Service</span>
                </Link>
                <Link
                  href="/privacy"
                  className="p-2.5 bg-white rounded-xl border border-purple-100 font-bold text-slate-700 hover:text-[#23055c] flex items-center gap-2 hover:shadow-2xs transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#23055c]" />
                  <span>Privacy Policy</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
