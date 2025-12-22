"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  Notification,
} from "@/lib/notifications";
import { Logo } from "@/components/ui/logo";

interface HeaderProps {
  showBack?: boolean;
  backHref?: string;
  title?: string;
  subtitle?: string;
}

export default function Header({ showBack, backHref, title, subtitle }: HeaderProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from("users")
        .select("display_name, full_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || profile.full_name || "");
      }

      // Get notifications
      const notifs = await getNotifications();
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
    }

    loadData();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (notification.link) {
      router.push(notification.link);
    }
    setShowNotifications(false);
  }

  async function handleMarkAllRead() {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {showBack && (
              <Link
                href={backHref || "/dashboard"}
                className="text-slate-medium hover:text-electric-cyan transition-colors mr-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            {title ? (
              <div>
                <h1 className="text-xl font-heading font-bold text-slate-dark">{title}</h1>
                {subtitle && <p className="text-sm text-slate-medium">{subtitle}</p>}
              </div>
            ) : (
              <Logo size="md" linkTo="/dashboard" />
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-medium hover:text-electric-cyan hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-neon-purple text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-card-hover border border-gray-200 z-50">
                  <div className="flex items-center justify-between p-3 border-b border-gray-100">
                    <h3 className="font-heading font-semibold text-slate-dark">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-electric-cyan hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-slate-medium text-sm">
                        No notifications yet
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                            !notification.is_read ? "bg-electric-cyan/5" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                              !notification.is_read ? "bg-electric-cyan" : "bg-transparent"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-slate-dark">{notification.title}</p>
                              {notification.message && (
                                <p className="text-sm text-slate-medium truncate">
                                  {notification.message}
                                </p>
                              )}
                              <p className="text-xs text-slate-light mt-1">
                                {formatTime(notification.created_at)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <Link
              href="/profile"
              className="text-slate-medium hover:text-electric-cyan transition-colors font-medium"
            >
              {displayName || "Profile"}
            </Link>

            {/* Sign Out */}
            <form action={signOut}>
              <button
                type="submit"
                className="text-slate-medium hover:text-neon-purple transition-colors font-medium"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
