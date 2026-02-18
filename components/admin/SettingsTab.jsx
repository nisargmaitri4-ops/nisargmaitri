import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getApiUrl, cls } from "./helpers";

/* ── Shared input class ── */
const INP =
  "w-full h-10 px-3 text-[13px] bg-white border border-gray-200 rounded-md outline-none focus:border-[#1A3329]/40 focus:ring-1 focus:ring-[#1A3329]/10 transition placeholder:text-gray-300";

/* ── Section wrapper ── */
const Section = ({ title, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6">
    <h3 className="text-sm font-semibold text-[#1A3329] mb-5">{title}</h3>
    {children}
  </div>
);

const SettingsTab = ({ token, onTokenRefresh, onNameChange }) => {
  /* ── Profile state ── */
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [profileDraft, setProfileDraft] = useState({ name: "", email: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  /* ── Password state ── */
  const [pw, setPw] = useState({ current: "", new: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  /* ── Fetch profile on mount ── */
  const fetchProfile = useCallback(async () => {
    try {
      const r = await axios.get(getApiUrl() + "/api/auth/profile", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = { name: r.data.name || "", email: r.data.email || "" };
      setProfile(data);
      setProfileDraft(data);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ── Profile dirty check ── */
  const profileDirty =
    profileDraft.name !== profile.name ||
    profileDraft.email !== profile.email;

  /* ── Save profile ── */
  const saveProfile = async () => {
    if (!profileDirty) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!profileDraft.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!emailRegex.test(profileDraft.email.trim())) {
      toast.error("Invalid email format");
      return;
    }

    setProfileSaving(true);
    try {
      const r = await axios.put(
        getApiUrl() + "/api/auth/profile",
        { name: profileDraft.name.trim(), email: profileDraft.email.trim() },
        { headers: { Authorization: "Bearer " + token } }
      );

      const updated = { name: r.data.name, email: r.data.email };
      setProfile(updated);
      setProfileDraft(updated);
      toast.success("Profile updated");

      /* Notify parent so header avatar updates immediately */
      if (onNameChange) onNameChange(updated.name);

      /* If the backend returned a fresh token (email changed), save it */
      if (r.data.token && onTokenRefresh) {
        onTokenRefresh(r.data.token);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  /* ── Change password ── */
  const changePassword = async () => {
    if (!pw.current || !pw.new || !pw.confirm) {
      toast.error("All password fields are required");
      return;
    }
    if (pw.new.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (pw.new !== pw.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (pw.current === pw.new) {
      toast.error("New password must be different");
      return;
    }

    setPwSaving(true);
    try {
      await axios.put(
        getApiUrl() + "/api/auth/change-password",
        { currentPassword: pw.current, newPassword: pw.new },
        { headers: { Authorization: "Bearer " + token } }
      );
      toast.success("Password changed");
      setPw({ current: "", new: "", confirm: "" });
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  /* ── Eye toggle button ── */
  const EyeBtn = ({ show, toggle }) => (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"
    >
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-[#1A3329] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[540px] space-y-5">
      {/* ── Profile Section ── */}
      <Section title="Profile">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-600 mb-1">
              Name
            </label>
            <input
              type="text"
              value={profileDraft.name}
              onChange={(e) =>
                setProfileDraft((d) => ({ ...d, name: e.target.value }))
              }
              className={INP}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-600 mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={profileDraft.email}
              onChange={(e) =>
                setProfileDraft((d) => ({ ...d, email: e.target.value }))
              }
              className={INP}
              placeholder="admin@example.com"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={saveProfile}
              disabled={!profileDirty || profileSaving}
              className={cls(
                "h-9 px-5 text-[13px] font-medium rounded-md transition",
                profileDirty
                  ? "bg-[#1A3329] text-white hover:bg-[#2F6844]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {profileSaving ? "Saving…" : "Save changes"}
            </button>
            {profileDirty && (
              <button
                onClick={() => setProfileDraft(profile)}
                className="h-9 px-4 text-[13px] font-medium text-gray-500 hover:text-gray-700 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* ── Change Password Section ── */}
      <Section title="Change Password">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-600 mb-1">
              Current password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                className={cls(INP, "pr-10")}
                placeholder="••••••••"
              />
              <EyeBtn show={showCurrent} toggle={() => setShowCurrent((s) => !s)} />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-600 mb-1">
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={pw.new}
                onChange={(e) => setPw((p) => ({ ...p, new: e.target.value }))}
                className={cls(INP, "pr-10")}
                placeholder="Min 6 characters"
              />
              <EyeBtn show={showNew} toggle={() => setShowNew((s) => !s)} />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-600 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              className={INP}
              placeholder="Re-enter new password"
            />
            {pw.new && pw.confirm && pw.new !== pw.confirm && (
              <p className="text-[11px] text-red-500 mt-1">Passwords don't match</p>
            )}
          </div>

          <button
            onClick={changePassword}
            disabled={pwSaving || !pw.current || !pw.new || !pw.confirm}
            className={cls(
              "h-9 px-5 text-[13px] font-medium rounded-md transition",
              pw.current && pw.new && pw.confirm
                ? "bg-[#1A3329] text-white hover:bg-[#2F6844]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {pwSaving ? "Changing…" : "Change password"}
          </button>
        </div>
      </Section>
    </div>
  );
};

export default SettingsTab;
