"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import {
  getStudySessions,
  createStudySession,
  deleteStudySession,
  updateRSVP,
  StudySession,
} from "@/lib/study-sessions";

export default function StudySessionsPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [locationType, setLocationType] = useState<"in_person" | "online" | "hybrid">("in_person");
  const [meetingLink, setMeetingLink] = useState("");

  useEffect(() => {
    loadSessions();
  }, [groupId]);

  async function loadSessions() {
    setLoading(true);
    const data = await getStudySessions(groupId);
    setSessions(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!title.trim() || !sessionDate) return;

    setCreating(true);
    const result = await createStudySession(groupId, {
      title: title.trim(),
      description: description.trim() || undefined,
      subject: subject.trim() || undefined,
      session_date: sessionDate,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      location: location.trim() || undefined,
      location_type: locationType,
      meeting_link: meetingLink.trim() || undefined,
    });

    if (result.success) {
      setShowCreateModal(false);
      resetForm();
      loadSessions();
    }
    setCreating(false);
  }

  async function handleDelete(sessionId: string) {
    await deleteStudySession(sessionId, groupId);
    setDeleteConfirm(null);
    loadSessions();
  }

  async function handleRSVP(sessionId: string, status: "going" | "maybe" | "not_going") {
    await updateRSVP(sessionId, groupId, status);
    loadSessions();
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setSubject("");
    setSessionDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setLocationType("in_person");
    setMeetingLink("");
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) {
      return "Today";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(time: string | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  // Separate upcoming and past sessions
  const today = new Date().toISOString().split("T")[0];
  const upcomingSessions = sessions.filter((s) => s.session_date >= today);
  const pastSessions = sessions.filter((s) => s.session_date < today);

  return (
    <div className="min-h-screen bg-bright-white">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/groups/${groupId}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-slate-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-heading font-semibold text-slate-dark">Study Sessions</h1>
              <p className="text-slate-medium">Schedule and join group study sessions</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Schedule Session
          </button>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-neon-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-dark mb-2">No study sessions yet</h3>
            <p className="text-slate-medium mb-6">Schedule your first study session to get started</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              Schedule First Session
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Sessions */}
            {upcomingSessions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-dark mb-4">Upcoming</h2>
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onRSVP={(status) => handleRSVP(session.id, status)}
                      onDelete={() => setDeleteConfirm(session.id)}
                      formatDate={formatDate}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Sessions */}
            {pastSessions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-medium mb-4">Past Sessions</h2>
                <div className="space-y-4 opacity-60">
                  {pastSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onRSVP={(status) => handleRSVP(session.id, status)}
                      onDelete={() => setDeleteConfirm(session.id)}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      isPast
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Session Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-heading font-semibold text-slate-dark">Schedule Study Session</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Calculus Review Session"
                      className="input w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-dark mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-dark mb-1">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Math"
                        className="input w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-dark mb-1">Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-dark mb-1">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="input w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">Location Type</label>
                    <div className="flex gap-2">
                      {(["in_person", "online", "hybrid"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setLocationType(type)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            locationType === type
                              ? "bg-electric-cyan text-white"
                              : "bg-gray-100 text-slate-medium hover:bg-gray-200"
                          }`}
                        >
                          {type === "in_person" ? "In Person" : type === "online" ? "Online" : "Hybrid"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(locationType === "in_person" || locationType === "hybrid") && (
                    <div>
                      <label className="block text-sm font-medium text-slate-dark mb-1">Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Library Room 204"
                        className="input w-full"
                      />
                    </div>
                  )}

                  {(locationType === "online" || locationType === "hybrid") && (
                    <div>
                      <label className="block text-sm font-medium text-slate-dark mb-1">Meeting Link</label>
                      <input
                        type="url"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        className="input w-full"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What will we cover?"
                      className="input w-full resize-none"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!title.trim() || !sessionDate || creating}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Schedule Session"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-dark mb-2">Cancel Session?</h3>
                <p className="text-slate-medium mb-6">This will remove the study session for everyone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="btn-outline flex-1">
                    Keep
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                  >
                    Cancel Session
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Session Card Component
function SessionCard({
  session,
  onRSVP,
  onDelete,
  formatDate,
  formatTime,
  isPast = false,
}: {
  session: StudySession;
  onRSVP: (status: "going" | "maybe" | "not_going") => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
  formatTime: (time: string | null) => string;
  isPast?: boolean;
}) {
  const userStatus = session.user_rsvp?.status;

  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-gray-200 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {session.subject && (
              <span className="px-2 py-0.5 bg-neon-purple/10 text-neon-purple text-xs font-medium rounded-full">
                {session.subject}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-lg text-slate-dark">{session.title}</h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-medium">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(session.session_date)}
            </span>

            {session.start_time && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(session.start_time)}
                {session.end_time && ` - ${formatTime(session.end_time)}`}
              </span>
            )}

            {session.location && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {session.location}
              </span>
            )}

            {session.meeting_link && (
              <a
                href={session.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-electric-cyan hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Join Meeting
              </a>
            )}
          </div>

          {session.description && (
            <p className="mt-2 text-sm text-slate-medium">{session.description}</p>
          )}

          {/* RSVP Summary */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            {session.rsvp_counts && session.rsvp_counts.going > 0 && (
              <span className="text-green-600">{session.rsvp_counts.going} going</span>
            )}
            {session.rsvp_counts && session.rsvp_counts.maybe > 0 && (
              <span className="text-amber-600">{session.rsvp_counts.maybe} maybe</span>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="p-2 text-slate-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* RSVP Buttons */}
      {!isPast && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => onRSVP("going")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              userStatus === "going"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-slate-medium hover:bg-green-50 hover:text-green-600"
            }`}
          >
            Going
          </button>
          <button
            onClick={() => onRSVP("maybe")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              userStatus === "maybe"
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-slate-medium hover:bg-amber-50 hover:text-amber-600"
            }`}
          >
            Maybe
          </button>
          <button
            onClick={() => onRSVP("not_going")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              userStatus === "not_going"
                ? "bg-gray-500 text-white"
                : "bg-gray-100 text-slate-medium hover:bg-gray-200"
            }`}
          >
            Can&apos;t Go
          </button>
        </div>
      )}
    </div>
  );
}
