"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  Clock,
  CreditCard,
  User,
  Users,
  Cake,
  Maximize2,
} from "lucide-react";
import { MemberRecord } from "./MemberDirectoryTable";
import { UserPhotoModal } from "../common/UserPhotoModal";

export interface MemberDetailModalProps {
  isOpen: boolean;
  member: MemberRecord | null;
  onClose: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  isOpen,
  member,
  onClose,
}) => {
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#EBE7F5] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Member Details
              </h2>
              <p className="text-xs text-slate-500 font-mono font-semibold text-[#23055c]">
                {member.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Main Info */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            {member.avatarUrl ? (
              <button
                type="button"
                onClick={() => setIsPhotoOpen(true)}
                className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 hover:ring-2 hover:ring-[#23055c] transition-all cursor-pointer group/avatar relative"
                title={`Click to view ${member.name}'s photo`}
              >
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </button>
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#23055c] to-[#65519f] text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-base font-bold text-slate-900">
                {member.name}
              </div>
              <div className="text-slate-500 mt-0.5">{member.email}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-[#23055c] font-bold text-[10px]">
                  {member.tier}
                </span>
                {member.status === "Active" && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Verified
                  </span>
                )}
                {member.status === "Pending" && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                    Unverified
                  </span>
                )}
                {member.status === "Inactive" && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                    Dormant
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-[#23055c]" /> Phone
              </div>
              <div className="font-semibold text-slate-900">
                {member.phone || "+234 (Not provided)"}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <Cake className="w-3.5 h-3.5 text-[#23055c]" /> Date of Birth
              </div>
              <div className="font-semibold text-slate-900">
                {member.dateOfBirth || member.birthday || "Not provided"}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#23055c]" /> Last Checked In
              </div>
              <div className="font-semibold text-slate-900">
                {member.lastVisit}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#23055c]" /> Joined Date
              </div>
              <div className="font-semibold text-slate-900">
                {member.joinedDate || "August 2026"}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-[#23055c]" /> Referrals
              </div>
              <div className="font-semibold text-slate-900">
                {member.referralCode
                  ? `${member.referralCode} (${member.referralCount ?? 0} referred)`
                  : `${member.referralCount ?? 0} referred`}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Policy
                Consent
              </div>
              <div className="font-semibold text-emerald-700">
                Captured (v1.0)
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EBE7F5] bg-[#F8F9FA] flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* Full Size Member Photo Modal */}
      <UserPhotoModal
        isOpen={isPhotoOpen}
        onClose={() => setIsPhotoOpen(false)}
        photoUrl={member.avatarUrl}
        userName={member.name}
        userEmail={member.email}
        userRole={member.tier}
      />
    </div>
  );
};
