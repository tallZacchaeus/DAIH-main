"use client";

import React, { useState, useEffect } from "react";
import { UserRole } from "@daih/types";
import { X, Save, Edit2, Loader2 } from "lucide-react";
import { AdminUserRecord } from "./UserDirectoryTable";

export interface EditStaffModalProps {
  isOpen: boolean;
  staff: AdminUserRecord | null;
  onClose: () => void;
  onStaffUpdated: (updatedStaff: AdminUserRecord) => Promise<void> | void;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  isOpen,
  staff,
  onClose,
  onStaffUpdated,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.OPERATIONS_ADMIN);
  const [status, setStatus] = useState<"ACTIVE" | "PENDING" | "DEACTIVATED">(
    "ACTIVE",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staff) {
      setName(staff.name);
      setEmail(staff.email);
      setPhone(staff.phone || "");
      setRole(staff.role);
      setStatus(staff.status);
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onStaffUpdated({
        ...staff,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        role,
        status,
      });
      onClose();
    } catch {
      // Error handled by parent toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={isSubmitting ? undefined : onClose}
        className="absolute inset-0 bg-[#1A1D20]/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#EBE7F5] z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EBE7F5] flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-[#23055c]" />
            <h2 className="text-base font-bold text-slate-900">
              Edit Staff Details
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full hover:bg-[#F8F9FA] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#EBE7F5] rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Official Email
            </label>
            <input
              type="email"
              required
              disabled={true} // Email is immutable identity anchor
              value={email}
              className="w-full px-4 py-2.5 bg-slate-100 border border-[#EBE7F5] rounded-xl text-xs sm:text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Phone Number
            </label>
            <input
              type="tel"
              disabled={isSubmitting}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 800 123 4567"
              className="w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#EBE7F5] rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Assigned Operational Role
            </label>
            <select
              value={role}
              disabled={isSubmitting}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-[#EBE7F5] rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#23055c] disabled:opacity-60"
            >
              <option value={UserRole.OPERATIONS_ADMIN}>
                Operations Admin
              </option>
              <option value={UserRole.FINANCE_OFFICER}>Finance Officer</option>
              <option value={UserRole.RECEPTION_OFFICER}>
                Reception Officer
              </option>
              <option value={UserRole.SECURITY_OFFICER}>
                Security Officer
              </option>
              <option value={UserRole.MANAGEMENT_VIEWER}>
                Management Viewer (CEO / Executive)
              </option>
              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Status
            </label>
            <select
              value={status}
              disabled={isSubmitting}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-[#EBE7F5] rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#23055c] disabled:opacity-60"
            >
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending Invitation</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-[#23055c] hover:bg-[#392271] text-white rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
