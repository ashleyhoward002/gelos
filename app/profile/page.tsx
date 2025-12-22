"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import {
  updateProfile,
  updateContactInfo,
  addFamilyMember,
  deleteFamilyMember,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase";
import { Logo } from "@/components/ui/logo";

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  birthday: string;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [shareBirthday, setShareBirthday] = useState(true);

  // Contact & Social state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [instagramHandle, setInstagramHandle] = useState("");
  const [showInstagram, setShowInstagram] = useState(false);
  const [snapchatHandle, setSnapchatHandle] = useState("");
  const [showSnapchat, setShowSnapchat] = useState(false);

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRelationship, setNewMemberRelationship] = useState("");
  const [newMemberBirthday, setNewMemberBirthday] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setDisplayName(profile.display_name || "");
        setEmail(profile.email || "");
        setBirthday(profile.birthday || "");
        setShareBirthday(profile.share_birthday ?? true);
        // Contact info
        setPhoneNumber(profile.phone_number || "");
        setShowPhone(profile.show_phone ?? false);
        setWhatsappNumber(profile.whatsapp_number || "");
        setShowWhatsapp(profile.show_whatsapp ?? false);
        setWhatsappSameAsPhone(profile.whatsapp_same_as_phone ?? true);
        setShowEmail(profile.show_email ?? false);
        setInstagramHandle(profile.instagram_handle || "");
        setShowInstagram(profile.show_instagram ?? false);
        setSnapchatHandle(profile.snapchat_handle || "");
        setShowSnapchat(profile.show_snapchat ?? false);
      }

      const { data: members } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      setFamilyMembers(members || []);
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("displayName", displayName);
    formData.set("birthday", birthday);
    formData.set("shareBirthday", shareBirthday.toString());

    const result = await updateProfile(formData);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Profile updated!" });
    }
    setSaving(false);
  }

  async function handleSaveContactInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingContact(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("phoneNumber", phoneNumber);
    formData.set("showPhone", showPhone.toString());
    formData.set("whatsappNumber", whatsappNumber);
    formData.set("showWhatsapp", showWhatsapp.toString());
    formData.set("whatsappSameAsPhone", whatsappSameAsPhone.toString());
    formData.set("showEmail", showEmail.toString());
    formData.set("instagramHandle", instagramHandle);
    formData.set("showInstagram", showInstagram.toString());
    formData.set("snapchatHandle", snapchatHandle);
    formData.set("showSnapchat", showSnapchat.toString());

    const result = await updateContactInfo(formData);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Contact info updated!" });
    }
    setSavingContact(false);
  }

  async function handleAddFamilyMember(e: React.FormEvent) {
    e.preventDefault();

    const formData = new FormData();
    formData.set("name", newMemberName);
    formData.set("relationship", newMemberRelationship);
    formData.set("birthday", newMemberBirthday);

    const result = await addFamilyMember(formData);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      // Refresh family members
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: members } = await supabase
          .from("family_members")
          .select("*")
          .eq("user_id", user.id)
          .order("name");
        setFamilyMembers(members || []);
      }

      setNewMemberName("");
      setNewMemberRelationship("");
      setNewMemberBirthday("");
      setShowAddFamily(false);
      setMessage({ type: "success", text: "Family member added!" });
    }
  }

  async function handleDeleteFamilyMember(memberId: string) {
    const result = await deleteFamilyMember(memberId);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setFamilyMembers((prev) => prev.filter((m) => m.id !== memberId));
      setMessage({ type: "success", text: "Family member removed." });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white flex items-center justify-center">
        <p className="text-slate-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bright-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-slate-medium hover:text-electric-cyan transition-colors mr-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <Logo size="md" linkTo="/dashboard" />
            </div>
            <form action={signOut}>
              <button type="submit" className="text-slate-medium hover:text-neon-purple transition-colors font-medium">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-heading font-semibold text-slate-dark mb-8">Profile Settings</h2>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-cosmic-green/10 border border-cosmic-green text-cosmic-green"
                : "bg-error/10 border border-error text-error"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 mb-8">
          <h3 className="font-heading font-semibold text-lg text-slate-dark mb-4">Personal Info</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="input bg-gray-100 cursor-not-allowed opacity-60"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="label">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="displayName" className="label">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="Jane"
              />
              <p className="text-xs text-slate-medium mt-1">
                This is what other group members will see.
              </p>
            </div>

            <div>
              <label htmlFor="birthday" className="label">Birthday</label>
              <input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="input"
              />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-electric-cyan/50 transition-colors">
              <input
                type="checkbox"
                checked={shareBirthday}
                onChange={(e) => setShareBirthday(e.target.checked)}
                className="w-4 h-4 text-electric-cyan bg-white border-gray-300 rounded focus:ring-electric-cyan"
              />
              <div>
                <p className="font-medium text-slate-dark">Share my birthday with groups</p>
                <p className="text-sm text-slate-medium">
                  Your birthday will appear on group calendars
                </p>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary mt-6 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Contact & Social */}
        <form onSubmit={handleSaveContactInfo} className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 mb-8">
          <h3 className="font-heading font-semibold text-lg text-slate-dark mb-4">Contact & Social</h3>
          <p className="text-sm text-slate-medium mb-4">
            Choose which contact methods to share with group members.
          </p>

          <div className="space-y-5">
            {/* Phone */}
            <div className="p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">📱</span>
                <label htmlFor="phoneNumber" className="font-medium text-slate-dark">Phone</label>
              </div>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="input mb-2"
                placeholder="(555) 123-4567"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPhone}
                  onChange={(e) => setShowPhone(e.target.checked)}
                  className="w-4 h-4 text-electric-cyan bg-white border-gray-300 rounded focus:ring-electric-cyan"
                />
                <span className="text-sm text-slate-medium">Show to group members</span>
              </label>
            </div>

            {/* WhatsApp */}
            <div className="p-4 rounded-lg border transition-colors" style={{ borderColor: showWhatsapp ? '#25D366' : '#E2E8F0' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">💬</span>
                <label htmlFor="whatsappNumber" className="font-medium text-slate-dark">WhatsApp</label>
              </div>
              <input
                id="whatsappNumber"
                type="tel"
                value={whatsappSameAsPhone ? phoneNumber : whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                disabled={whatsappSameAsPhone}
                className={`input mb-2 ${whatsappSameAsPhone ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                placeholder="+1 555 123 4567"
              />
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWhatsapp}
                    onChange={(e) => setShowWhatsapp(e.target.checked)}
                    className="w-4 h-4 text-electric-cyan bg-white border-gray-300 rounded focus:ring-electric-cyan"
                  />
                  <span className="text-sm text-slate-medium">Show to group members</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappSameAsPhone}
                    onChange={(e) => setWhatsappSameAsPhone(e.target.checked)}
                    className="w-4 h-4 text-electric-cyan bg-white border-gray-300 rounded focus:ring-electric-cyan"
                  />
                  <span className="text-sm text-slate-medium">Same as phone number</span>
                </label>
              </div>
            </div>

            {/* Email */}
            <div className="p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">📧</span>
                <label className="font-medium text-slate-dark">Email</label>
              </div>
              <input
                type="email"
                value={email}
                disabled
                className="input bg-gray-100 cursor-not-allowed opacity-60 mb-2"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEmail}
                  onChange={(e) => setShowEmail(e.target.checked)}
                  className="w-4 h-4 text-electric-cyan bg-white border-gray-300 rounded focus:ring-electric-cyan"
                />
                <span className="text-sm text-slate-medium">Show to group members</span>
              </label>
            </div>

            {/* Instagram */}
            <div className="p-4 rounded-lg border transition-colors" style={{ borderColor: showInstagram ? '#E4405F' : '#E2E8F0' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">📸</span>
                <label htmlFor="instagramHandle" className="font-medium text-slate-dark">Instagram</label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-medium">@</span>
                <input
                  id="instagramHandle"
                  type="text"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ''))}
                  className="input pl-7 mb-2"
                  placeholder="yourhandle"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInstagram}
                  onChange={(e) => setShowInstagram(e.target.checked)}
                  className="w-4 h-4 text-electric-cyan bg-white border-gray-300 rounded focus:ring-electric-cyan"
                />
                <span className="text-sm text-slate-medium">Show to group members</span>
              </label>
            </div>

            {/* Snapchat */}
            <div className="p-4 rounded-lg border transition-colors" style={{ borderColor: showSnapchat ? '#FFFC00' : '#E2E8F0' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">👻</span>
                <label htmlFor="snapchatHandle" className="font-medium text-slate-dark">Snapchat</label>
              </div>
              <input
                id="snapchatHandle"
                type="text"
                value={snapchatHandle}
                onChange={(e) => setSnapchatHandle(e.target.value)}
                className="input mb-2"
                placeholder="yourusername"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSnapchat}
                  onChange={(e) => setShowSnapchat(e.target.checked)}
                  className="w-4 h-4 text-electric-cyan bg-white border-gray-300 rounded focus:ring-electric-cyan"
                />
                <span className="text-sm text-slate-medium">Show to group members</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingContact}
            className="btn-primary mt-6 disabled:opacity-50"
          >
            {savingContact ? "Saving..." : "Save Contact Info"}
          </button>
        </form>

        {/* Family Members */}
        <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-lg text-slate-dark">Family Birthdays</h3>
            <button
              type="button"
              onClick={() => setShowAddFamily(!showAddFamily)}
              className="text-electric-cyan hover:text-electric-cyan-600 font-medium text-sm"
            >
              {showAddFamily ? "Cancel" : "+ Add Family Member"}
            </button>
          </div>

          <p className="text-sm text-slate-medium mb-4">
            Add family members&apos; birthdays to track them on group calendars.
          </p>

          {showAddFamily && (
            <form onSubmit={handleAddFamilyMember} className="p-4 bg-soft-lavender rounded-lg mb-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="memberName" className="label">Name</label>
                  <input
                    id="memberName"
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    required
                    className="input"
                    placeholder="Mom"
                  />
                </div>
                <div>
                  <label htmlFor="memberRelationship" className="label">Relationship</label>
                  <input
                    id="memberRelationship"
                    type="text"
                    value={newMemberRelationship}
                    onChange={(e) => setNewMemberRelationship(e.target.value)}
                    required
                    className="input"
                    placeholder="Mother"
                  />
                </div>
                <div>
                  <label htmlFor="memberBirthday" className="label">Birthday</label>
                  <input
                    id="memberBirthday"
                    type="date"
                    value={newMemberBirthday}
                    onChange={(e) => setNewMemberBirthday(e.target.value)}
                    required
                    className="input"
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary mt-3 text-sm py-2">
                Add
              </button>
            </form>
          )}

          {familyMembers.length === 0 ? (
            <p className="text-slate-medium text-center py-4">
              No family members added yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {familyMembers.map((member) => (
                <li key={member.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-dark">{member.name}</p>
                    <p className="text-sm text-slate-medium">
                      {member.relationship} &bull;{" "}
                      {new Date(member.birthday + "T00:00:00").toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteFamilyMember(member.id)}
                    className="text-slate-medium hover:text-error p-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
