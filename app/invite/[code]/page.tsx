"use client";

import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { getInviteByCode, useInvite, checkMembership, GroupInvite } from "@/lib/invites";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

type InviteState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "requires_auth"; invite: GroupInvite & { member_count: number } }
  | { status: "already_member"; groupId: string }
  | { status: "ready"; invite: GroupInvite & { member_count: number } }
  | { status: "joining" }
  | { status: "joined"; groupId: string }
  | { status: "error"; message: string };

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [state, setState] = useState<InviteState>({ status: "loading" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadInvite();
  }, [resolvedParams.code]);

  const loadInvite = async () => {
    setState({ status: "loading" });

    const invite = await getInviteByCode(resolvedParams.code);

    if (!invite) {
      setState({ status: "invalid" });
      return;
    }

    // Check if invite is expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      setState({ status: "expired" });
      return;
    }

    // Check membership status
    const membership = await checkMembership(invite.group_id);

    if (!membership.isAuthenticated) {
      setState({ status: "requires_auth", invite });
      return;
    }

    if (membership.isMember) {
      setState({ status: "already_member", groupId: invite.group_id });
      return;
    }

    setState({ status: "ready", invite });
  };

  const handleJoin = () => {
    startTransition(async () => {
      setState({ status: "joining" });

      const result = await useInvite(resolvedParams.code);

      if (result.error) {
        if (result.alreadyMember && result.groupId) {
          setState({ status: "already_member", groupId: result.groupId });
        } else if (result.requiresAuth) {
          const invite = await getInviteByCode(resolvedParams.code);
          if (invite) {
            setState({ status: "requires_auth", invite });
          } else {
            setState({ status: "invalid" });
          }
        } else {
          setState({ status: "error", message: result.error });
        }
        return;
      }

      if (result.groupId) {
        setState({ status: "joined", groupId: result.groupId });
        // Redirect to group after short delay
        setTimeout(() => {
          router.push(`/groups/${result.groupId}`);
        }, 1500);
      }
    });
  };

  const handleDecline = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-lavender to-bright-white flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Loading State */}
        {state.status === "loading" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 text-center py-12">
            <div className="w-12 h-12 border-3 border-electric-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-medium">Loading invite...</p>
          </div>
        )}

        {/* Invalid Invite */}
        {state.status === "invalid" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 text-center py-12">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-2xl font-heading font-semibold text-slate-dark mb-2">
              Invite Not Found
            </h1>
            <p className="text-slate-medium mb-6">
              This invite link is no longer valid or doesn&apos;t exist.
            </p>
            <p className="text-sm text-slate-medium mb-6">
              Ask for a new invite link from your friend.
            </p>
            <Link
              href="/dashboard"
              className="btn-primary inline-block"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* Expired Invite */}
        {state.status === "expired" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 text-center py-12">
            <div className="text-5xl mb-4">⏰</div>
            <h1 className="text-2xl font-heading font-semibold text-slate-dark mb-2">
              Invite Expired
            </h1>
            <p className="text-slate-medium mb-6">
              This invite link has expired.
            </p>
            <p className="text-sm text-slate-medium mb-6">
              Ask for a new invite link from your friend.
            </p>
            <Link
              href="/dashboard"
              className="btn-primary inline-block"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* Requires Authentication */}
        {state.status === "requires_auth" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-3xl font-heading font-bold bg-neon-gradient bg-clip-text text-transparent mb-4">
              GELOS
            </h1>
            <p className="text-slate-medium mb-2">You&apos;ve been invited to join</p>
            <h2 className="text-xl font-heading font-semibold text-slate-dark mb-2">
              &quot;{state.invite.group?.name}&quot;
            </h2>
            {state.invite.inviter && (
              <p className="text-slate-medium mb-6">
                by {state.invite.inviter.display_name || state.invite.inviter.full_name}
              </p>
            )}

            <div className="space-y-3">
              <Link
                href={`/register?redirect=/invite/${resolvedParams.code}`}
                className="btn-primary w-full block"
              >
                Sign Up to Join
              </Link>
              <Link
                href={`/login?redirect=/invite/${resolvedParams.code}`}
                className="btn-outline w-full block"
              >
                Log In to Join
              </Link>
            </div>

            <p className="text-sm text-slate-medium mt-6">
              Already have an account? Log in above
            </p>
          </div>
        )}

        {/* Already a Member */}
        {state.status === "already_member" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 text-center py-12">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl font-heading font-semibold text-slate-dark mb-2">
              You&apos;re Already In!
            </h1>
            <p className="text-slate-medium mb-6">
              You&apos;re already a member of this group.
            </p>
            <Link
              href={`/groups/${state.groupId}`}
              className="btn-primary inline-block"
            >
              Go to Group
            </Link>
          </div>
        )}

        {/* Ready to Join */}
        {state.status === "ready" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-3xl font-heading font-bold bg-neon-gradient bg-clip-text text-transparent mb-4">
              GELOS
            </h1>
            <p className="text-slate-medium mb-2">You&apos;ve been invited to join</p>
            <h2 className="text-xl font-heading font-semibold text-slate-dark mb-2">
              &quot;{state.invite.group?.name}&quot;
            </h2>
            {state.invite.inviter && (
              <p className="text-slate-medium mb-1">
                by {state.invite.inviter.display_name || state.invite.inviter.full_name}
              </p>
            )}
            <p className="text-sm text-slate-medium mb-6">
              {state.invite.member_count} member{state.invite.member_count !== 1 ? "s" : ""} •{" "}
              {state.invite.group?.group_type} group
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleJoin}
                disabled={isPending}
                className="btn-primary flex-1"
              >
                {isPending ? "Joining..." : "Join Group"}
              </button>
              <button
                onClick={handleDecline}
                disabled={isPending}
                className="btn-outline flex-1"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Joining State */}
        {state.status === "joining" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 text-center py-12">
            <div className="w-12 h-12 border-3 border-electric-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-medium">Joining group...</p>
          </div>
        )}

        {/* Successfully Joined */}
        {state.status === "joined" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 text-center py-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              className="text-5xl mb-4"
            >
              🎊
            </motion.div>
            <h1 className="text-2xl font-heading font-semibold text-slate-dark mb-2">
              Welcome to the Group!
            </h1>
            <p className="text-slate-medium mb-4">
              You&apos;re now a member. Redirecting...
            </p>
            <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Error State */}
        {state.status === "error" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200 text-center py-12">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-2xl font-heading font-semibold text-slate-dark mb-2">
              Something Went Wrong
            </h1>
            <p className="text-slate-medium mb-6">{state.message}</p>
            <button onClick={loadInvite} className="btn-primary">
              Try Again
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
