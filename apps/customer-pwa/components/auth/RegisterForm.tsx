"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@daih/api-client";
import { useToast } from "@daih/ui";
import {
  User,
  Phone,
  Mail,
  Lock,
  KeyRound,
  AlertCircle,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";

interface RegisterFormProps {
  onSuccess: (email: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
    termsAgreed: false,
    privacyAgreed: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const refParam =
      searchParams.get("ref") || searchParams.get("referralCode");
    if (refParam) {
      setFormData((prev) => ({
        ...prev,
        referralCode: refParam.trim().toUpperCase(),
      }));
    }
  }, [searchParams]);

  const passwordRules = [
    {
      id: "length",
      label: "8+ characters",
      valid: formData.password.length >= 8,
    },
    {
      id: "upper",
      label: "Uppercase letter (A-Z)",
      valid: /[A-Z]/.test(formData.password),
    },
    {
      id: "lower",
      label: "Lowercase letter (a-z)",
      valid: /[a-z]/.test(formData.password),
    },
    {
      id: "number",
      label: "Number (0-9)",
      valid: /[0-9]/.test(formData.password),
    },
    {
      id: "symbol",
      label: "Special character (!@#$%...)",
      valid: /[^A-Za-z0-9]/.test(formData.password),
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      toast.warning("Please enter your first name.", {
        title: "First Name Required",
      });
      return false;
    }

    if (!formData.lastName.trim()) {
      toast.warning("Please enter your last name.", {
        title: "Last Name Required",
      });
      return false;
    }

    if (!formData.email.trim()) {
      toast.warning("Please enter your email address.", {
        title: "Email Required",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.warning(
        "Please enter a valid email address (e.g. name@company.com).",
        {
          title: "Invalid Email Format",
        },
      );
      return false;
    }

    if (!formData.password) {
      toast.warning("Please create a password for your account.", {
        title: "Password Required",
      });
      return false;
    }

    // Comprehensive friendly password character requirement checks
    const missing: string[] = [];
    if (formData.password.length < 8) missing.push("at least 8 characters");
    if (!/[A-Z]/.test(formData.password))
      missing.push("an uppercase letter (A-Z)");
    if (!/[a-z]/.test(formData.password))
      missing.push("a lowercase letter (a-z)");
    if (!/[0-9]/.test(formData.password)) missing.push("a number (0-9)");
    if (!/[^A-Za-z0-9]/.test(formData.password))
      missing.push("a special symbol (!@#$%^&*)");

    if (missing.length > 0) {
      const friendlyMsg = `Your password needs ${missing.join(", ")}.`;
      setErrorMessage(friendlyMsg);
      toast.warning(friendlyMsg, {
        title: "Password Requirements",
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("The passwords you entered do not match. Please verify.", {
        title: "Password Mismatch",
      });
      return false;
    }

    if (!formData.termsAgreed || !formData.privacyAgreed) {
      toast.warning(
        "Please check both the Terms of Service and Privacy Policy boxes to proceed.",
        { title: "Agreement Required" },
      );
      return false;
    }

    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phone.trim() || undefined,
        password: formData.password,
        policyVersion: "1.0-2026",
        consented: Boolean(formData.termsAgreed && formData.privacyAgreed),
        referralCode: formData.referralCode.trim() || undefined,
      });

      toast.success(
        `Account created! A verification link was sent to ${formData.email.trim().toLowerCase()}.`,
        { title: "Welcome to DAIH" },
      );

      onSuccess(formData.email.trim().toLowerCase());
    } catch (err: any) {
      let msg =
        err?.message ||
        "Registration failed. Please check your details and try again.";

      // Translate technical backend validation into user-friendly guidance
      if (
        msg.toLowerCase().includes("password") ||
        msg.toLowerCase().includes("character") ||
        msg.toLowerCase().includes("invalid_string")
      ) {
        msg =
          "Password must be at least 8 characters and include uppercase, lowercase, numbers, and special symbols (!@#$%).";
      }

      setErrorMessage(msg);
      toast.error(msg, { title: "Registration Failed" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23055c] tracking-tight">
          Create your account
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Enter your details to access the DAIH Workspace portal.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-3 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Form with noValidate to disable browser default popups in favor of rich alerts */}
      <form noValidate onSubmit={handleRegister} className="space-y-4">
        {/* First Name & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              className="block text-xs font-bold text-slate-700"
              htmlFor="firstName"
            >
              First Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              className="block text-xs font-bold text-slate-700"
              htmlFor="lastName"
            >
              Last Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label
            className="block text-xs font-bold text-slate-700"
            htmlFor="phone"
          >
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+234 800 000 0000"
              value={formData.phone}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label
            className="block text-xs font-bold text-slate-700"
            htmlFor="email"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="john.doe@company.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Referral Code (Optional) */}
        <div className="space-y-1.5">
          <label
            className="block text-xs font-bold text-slate-700"
            htmlFor="referralCode"
          >
            Referral Code{" "}
            <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Users className="w-4 h-4 text-[#23055c]" />
            </div>
            <input
              id="referralCode"
              name="referralCode"
              type="text"
              placeholder="e.g. REF-8K9M2X"
              value={formData.referralCode}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm font-mono uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Password & Confirm Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              className="block text-xs font-bold text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              className="block text-xs font-bold text-slate-700"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live Password Requirements Checklist */}
        {formData.password.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 animate-in fade-in duration-200">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Password Requirements:
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {passwordRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-1.5 transition-colors ${
                    rule.valid
                      ? "text-emerald-700 font-medium"
                      : "text-slate-400"
                  }`}
                >
                  {rule.valid ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Policy Consent Checkboxes */}
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          <div className="flex items-start">
            <input
              id="termsAgreed"
              name="termsAgreed"
              type="checkbox"
              checked={formData.termsAgreed}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#23055c] focus:ring-[#23055c] cursor-pointer"
            />
            <label
              htmlFor="termsAgreed"
              className="ml-2.5 text-xs text-slate-600 leading-normal cursor-pointer"
            >
              I agree to the{" "}
              <Link
                href="/terms"
                className="text-[#23055c] hover:underline font-semibold"
              >
                Terms of Service
              </Link>
              .
            </label>
          </div>

          <div className="flex items-start">
            <input
              id="privacyAgreed"
              name="privacyAgreed"
              type="checkbox"
              checked={formData.privacyAgreed}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#23055c] focus:ring-[#23055c] cursor-pointer"
            />
            <label
              htmlFor="privacyAgreed"
              className="ml-2.5 text-xs text-slate-600 leading-normal cursor-pointer"
            >
              I consent to the{" "}
              <Link
                href="/privacy"
                className="text-[#23055c] hover:underline font-semibold"
              >
                Privacy Policy & NDPR Compliance
              </Link>
              .
            </label>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 space-y-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
