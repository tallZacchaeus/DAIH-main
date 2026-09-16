"use client";

import React, { useState, useEffect } from "react";
import { X, Users, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@daih/api-client";
import { useToast } from "@daih/ui";
import { AdminCustomerReferralsResponse, ReferralItem } from "@daih/types";

export interface CustomerReferralsModalProps {
  isOpen: boolean;
  customerId: string | null;
  customerName?: string;
  onClose: () => void;
  onSelectReferredMember?: (clientIdOrId: string) => void;
}

export const CustomerReferralsModal: React.FC<CustomerReferralsModalProps> = ({
  isOpen,
  customerId,
  customerName,
  onClose,
  onSelectReferredMember,
}) => {
  const toast = useToast();
  const [data, setData] = useState<AdminCustomerReferralsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !customerId) {
      setData(null);
      return;
    }

    const fetchReferrals = async () => {
      setLoading(true);
      try {
        const res = await api.referrals.getCustomerReferrals(customerId);
        setData(res);
      } catch (err: any) {
        toast.error(
          err?.message || "Failed to load customer referral records.",
          { title: "Error Loading Referrals" },
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReferrals();
  }, [isOpen, customerId, toast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#EBE7F5] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold text-sm shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                Referrals by {data?.customerName || customerName || "Member"}
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {data?.customerClientId ? `${data.customerClientId} • ` : ""}
                <span className="text-[#23055c] font-bold">
                  {data?.totalReferred ?? 0} referred
                </span>{" "}
                ({data?.activeReferred ?? 0} active)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#23055c] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">
                Loading referrals...
              </p>
            </div>
          ) : !data?.referredUsers || data.referredUsers.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <Users className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-semibold text-slate-700">
                No referrals found
              </p>
              <p className="text-xs text-slate-400">
                This member has not referred anyone yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.referredUsers.map((member: ReferralItem) => (
                <div
                  key={member.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#23055c] to-[#65519f] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge & Action */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        member.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {member.status}
                    </span>

                    {onSelectReferredMember && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectReferredMember(member.clientId || member.id);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#23055c] hover:text-[#392271] hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="View member details in directory"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EBE7F5] bg-[#F8F9FA] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
