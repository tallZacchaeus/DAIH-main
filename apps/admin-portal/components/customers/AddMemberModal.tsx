"use client";

import React, { useState } from "react";
import { X, UserPlus, Mail, Phone, Lock, Loader2 } from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import { CustomerRecord } from "@daih/types";

export interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded?: (newMember: CustomerRecord) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onMemberAdded,
}) => {
  const toast = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [tier, setTier] = useState("Hot Desk Monthly");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.warning("Please enter both first and last names.", {
        title: "Name Required",
      });
      return;
    }

    if (!email.trim()) {
      toast.warning("Please enter a valid email address.", {
        title: "Email Required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const newMember = await api.customers.createCustomer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        tier,
      });

      if (onMemberAdded) {
        onMemberAdded(newMember);
      }

      toast.success(
        `Member ${newMember.name} added with Client ID ${newMember.id}`,
        {
          title: "Member Added",
        },
      );

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhoneNumber("");
      setDateOfBirth("");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create customer record", {
        title: "Creation Failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#EBE7F5] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold text-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Add New Member
              </h2>
              <p className="text-xs text-slate-500">
                Create a community member record in database
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

        {/* Form */}
        <form
          noValidate
          onSubmit={handleSubmit}
          className="p-6 space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Tunde"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Adeleke"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@company.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+234 810 000 0000"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700">
              Date of Birth (Optional)
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700">
              Plan / Membership Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20 cursor-pointer"
            >
              <option value="Enterprise">Enterprise Suite</option>
              <option value="Professional">Professional Plan</option>
              <option value="Creator">Creator Hot Desk</option>
              <option value="Dedicated Desk">Dedicated Desk</option>
              <option value="Hot Desk Monthly">Hot Desk Monthly</option>
            </select>
          </div>

          <div className="p-4 border-t border-[#EBE7F5] bg-[#F8F9FA] -mx-6 -mb-6 mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-[#23055c] hover:bg-[#392271] text-white rounded-xl font-bold text-xs transition-colors shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Adding to Database...
                </>
              ) : (
                "Add Member"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
