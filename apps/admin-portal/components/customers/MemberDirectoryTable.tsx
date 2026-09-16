"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Maximize2,
} from "lucide-react";
import { UserPhotoModal } from "../common/UserPhotoModal";

export interface MemberRecord {
  id: string; // Client ID, e.g. DAIH-2026-000042
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  tier: string;
  status: "Active" | "Pending" | "Inactive";
  lastVisit: string;
  joinedDate?: string;
  referralCode?: string;
  referralCount?: number;
  activeReferralCount?: number;
  dateOfBirth?: string | null;
  birthday?: string | null;
}

export interface MemberDirectoryTableProps {
  members: MemberRecord[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewMember: (member: MemberRecord) => void;
  onViewReferrals?: (member: MemberRecord) => void;
}

export const MemberDirectoryTable: React.FC<MemberDirectoryTableProps> = ({
  members,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onViewMember,
  onViewReferrals,
}) => {
  const [previewUserPhoto, setPreviewUserPhoto] = React.useState<{
    name: string;
    email?: string;
    photoUrl: string;
  } | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  const getTierBadgeStyle = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "enterprise":
        return "bg-purple-100/70 text-[#23055c] border border-purple-200";
      case "professional":
        return "bg-amber-100/70 text-amber-900 border border-amber-200";
      case "creator":
        return "bg-slate-100 text-slate-700 border border-slate-200";
      default:
        return "bg-indigo-50 text-[#392271] border border-indigo-100";
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-[0_4px_12px_rgba(33,37,41,0.04)] overflow-hidden flex flex-col">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[880px]">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-[#EBE7F5]">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Member
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Client ID
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Date of Birth
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tier / Plan
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Referrals
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Last Visit
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBE7F5] text-xs text-slate-800">
            {members.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-sm">No members found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Try adjusting your search or filters.
                  </p>
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-[#F8F9FA]/70 transition-colors h-[60px] group"
                >
                  {/* Member Profile */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewUserPhoto({
                              name: member.name,
                              email: member.email,
                              photoUrl: member.avatarUrl!,
                            });
                          }}
                          className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0 hover:ring-2 hover:ring-[#23055c] hover:opacity-95 transition-all cursor-pointer group/avatar relative"
                          title={`Click to view ${member.name}'s photo`}
                        >
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e9ddff] to-[#cfbdff] text-[#23055c] font-bold text-xs flex items-center justify-center shrink-0 border border-purple-200">
                          {getInitials(member.name)}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-900 truncate">
                          {member.name}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Client ID */}
                  <td className="p-4 font-mono font-bold text-[#23055c] text-[11px]">
                    {member.id}
                  </td>

                  {/* Date of Birth */}
                  <td className="p-4 text-slate-700 font-medium text-[11px] whitespace-nowrap">
                    {member.dateOfBirth || member.birthday || (
                      <span className="text-slate-400 italic font-normal">
                        Not provided
                      </span>
                    )}
                  </td>

                  {/* Tier / Plan */}
                  <td className="p-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${getTierBadgeStyle(
                        member.tier,
                      )}`}
                    >
                      {member.tier}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    {member.status === "Active" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] font-semibold text-[11px] border border-[#CEEAD6]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#137333]" />
                        Verified
                      </span>
                    )}
                    {member.status === "Pending" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF7E0] text-[#B06000] font-semibold text-[11px] border border-[#FCE8B2]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B06000]" />
                        Unverified
                      </span>
                    )}
                    {member.status === "Inactive" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Dormant
                      </span>
                    )}
                  </td>

                  {/* Referrals */}
                  <td className="p-4">
                    {(member.referralCount ?? 0) > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewReferrals?.(member);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#23055c] border border-purple-200 font-semibold text-[11px] transition-colors cursor-pointer"
                        title="View Referrals"
                      >
                        <Users className="w-3 h-3 text-[#23055c]" />
                        <span>
                          {member.referralCount} (
                          {member.activeReferralCount ?? 0} active)
                        </span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-medium">
                        0 referrals
                      </span>
                    )}
                  </td>

                  {/* Last Visit */}
                  <td className="p-4 text-slate-600 font-medium text-[11px]">
                    {member.lastVisit}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewReferrals && (
                        <button
                          onClick={() => onViewReferrals(member)}
                          className="p-2 text-slate-500 hover:text-[#23055c] transition-colors rounded-lg hover:bg-purple-50 inline-flex items-center justify-center cursor-pointer"
                          title="View Referrals"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onViewMember(member)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#23055c] bg-purple-50 hover:bg-[#23055c] hover:text-white border border-purple-200 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                        title="View Member Details"
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-[#EBE7F5] flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#F8F9FA] text-xs text-slate-600">
        <span>
          Showing{" "}
          <strong className="text-slate-900">
            {totalCount > 0 ? startRecord : 0}
          </strong>{" "}
          to <strong className="text-slate-900">{endRecord}</strong> of{" "}
          <strong className="text-slate-900">
            {totalCount.toLocaleString()}
          </strong>{" "}
          members
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
            )
            .map((p, idx, arr) => {
              const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;

              return (
                <React.Fragment key={p}>
                  {showEllipsis && (
                    <span className="px-1 text-slate-400">...</span>
                  )}
                  <button
                    onClick={() => onPageChange(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold transition-colors cursor-pointer text-xs ${
                      currentPage === p
                        ? "bg-[#23055c] text-white shadow-xs"
                        : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Member Photo Preview Modal */}
      <UserPhotoModal
        isOpen={Boolean(previewUserPhoto)}
        onClose={() => setPreviewUserPhoto(null)}
        photoUrl={previewUserPhoto?.photoUrl}
        userName={previewUserPhoto?.name || "Member Photo"}
        userEmail={previewUserPhoto?.email}
        userRole="Customer"
      />
    </div>
  );
};
