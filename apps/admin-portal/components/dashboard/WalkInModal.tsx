"use client";

import React, { useState } from "react";
import { Modal, Button, useToast } from "@daih/ui";
import { UserPlus, CheckCircle2, Armchair } from "lucide-react";

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    plan: "Hot Desk - Full Day Pass (₦3,500)",
    paymentMethod: "POS Terminal (Cashier Desk)",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(
        "Walk-in day pass issued successfully to " +
          (formData.fullName || "Guest") +
          ". Sequential Client ID generated.",
        { title: "Access Pass Issued" },
      );
      onClose();
    }, 600);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Walk-In Access Pass">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
          <Armchair className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            This will create a temporary visitor badge and assign sequential
            Client ID for the day.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface mb-1">
            Full Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Babatunde Lawal"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-accent-soft bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="guest@company.ng"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-accent-soft bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              required
              placeholder="+234 800 000 0000"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-accent-soft bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Access Package
            </label>
            <select
              value={formData.plan}
              onChange={(e) =>
                setFormData({ ...formData, plan: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-accent-soft bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option>Hot Desk - Full Day Pass (₦3,500)</option>
              <option>Hot Desk - Half Day Pass (₦2,000)</option>
              <option>Dedicated Desk - 1 Week Pass (₦15,000)</option>
              <option>Training Room - 2 Hours (₦25,000)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Payment Method
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) =>
                setFormData({ ...formData, paymentMethod: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-accent-soft bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option>POS Terminal (Cashier Desk)</option>
              <option>Paystack Online Transfer</option>
              <option>Direct Bank Transfer</option>
              <option>Corporate Prepaid Account</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-accent-soft">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-container text-on-primary flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSubmitting ? "Issuing Badge..." : "Confirm & Issue Badge"}
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
