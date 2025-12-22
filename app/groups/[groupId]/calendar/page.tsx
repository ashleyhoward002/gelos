"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
  getCalendarEvents,
  getBirthdays,
  createEvent,
  deleteEvent,
  updateGroupBirthdaySettings,
  CalendarEvent,
  BirthdayEvent,
} from "@/lib/calendar";
import { getBringList, createBringList, BringList } from "@/lib/bring-list";
import BringListDisplay from "@/components/ui/bring-list-display";
import { CreateBringList } from "@/components/ui/create-bring-list";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface DayEvents {
  events: CalendarEvent[];
  birthdays: BirthdayEvent[];
}

export default function CalendarPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [birthdays, setBirthdays] = useState<BirthdayEvent[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [showMemberBirthdays, setShowMemberBirthdays] = useState(true);
  const [showFamilyBirthdays, setShowFamilyBirthdays] = useState(false);

  const [showEventModal, setShowEventModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventEndTime, setNewEventEndTime] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventAddBringList, setNewEventAddBringList] = useState(false);
  const [newEventHostProviding, setNewEventHostProviding] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  // Bring list state for event details
  const [eventBringList, setEventBringList] = useState<BringList | null>(null);
  const [bringListLoading, setBringListLoading] = useState(false);
  const [showCreateBringList, setShowCreateBringList] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = createClient();

      // Get group info
      const { data: group } = await supabase
        .from("groups")
        .select("name, show_member_birthdays, show_family_birthdays")
        .eq("id", groupId)
        .single();

      if (group) {
        setGroupName(group.name);
        setShowMemberBirthdays(group.show_member_birthdays);
        setShowFamilyBirthdays(group.show_family_birthdays);
      }

      // Check if owner
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: membership } = await supabase
          .from("group_members")
          .select("role")
          .eq("group_id", groupId)
          .eq("user_id", user.id)
          .is("left_at", null)
          .single();
        setIsOwner(membership?.role === "owner");
      }

      // Get events and birthdays
      const [eventsData, birthdaysData] = await Promise.all([
        getCalendarEvents(groupId, year, month),
        getBirthdays(groupId, month),
      ]);

      setEvents(eventsData);
      setBirthdays(birthdaysData);
      setLoading(false);
    }

    loadData();
  }, [groupId, year, month]);

  function getDaysInMonth() {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }

  function getEventsForDay(day: number): DayEvents {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayEvents = events.filter((e) => e.event_date === dateStr);
    const dayBirthdays = birthdays.filter((b) => {
      const bday = new Date(b.date + "T00:00:00");
      return bday.getDate() === day;
    });

    return { events: dayEvents, birthdays: dayBirthdays };
  }

  function navigateMonth(delta: number) {
    setCurrentDate(new Date(year, month + delta, 1));
  }

  function openNewEventModal(date?: string) {
    setSelectedEvent(null);
    setNewEventTitle("");
    setNewEventDescription("");
    setNewEventDate(date || `${year}-${String(month + 1).padStart(2, "0")}-01`);
    setNewEventTime("");
    setNewEventEndTime("");
    setNewEventLocation("");
    setShowEventModal(true);
  }

  async function openEventDetails(event: CalendarEvent) {
    setSelectedEvent(event);
    setShowEventModal(true);
    setShowCreateBringList(false);

    // Fetch bring list for this event
    setBringListLoading(true);
    const bringList = await getBringList({ eventId: event.id });
    setEventBringList(bringList);
    setBringListLoading(false);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.set("title", newEventTitle);
    formData.set("description", newEventDescription);
    formData.set("eventDate", newEventDate);
    formData.set("eventTime", newEventTime);
    formData.set("endTime", newEventEndTime);
    formData.set("location", newEventLocation);

    const result = await createEvent(groupId, formData);

    if (result.success && result.event) {
      // Create bring list if option was checked
      if (newEventAddBringList) {
        await createBringList({
          eventId: result.event.id,
          groupId,
          title: `${newEventTitle} - What to Bring`,
          hostProviding: newEventHostProviding || undefined,
        });
      }

      // Reset bring list fields
      setNewEventAddBringList(false);
      setNewEventHostProviding("");

      // Refresh events
      const eventsData = await getCalendarEvents(groupId, year, month);
      setEvents(eventsData);
      setShowEventModal(false);
    }
    setSaving(false);
  }

  async function handleDeleteEvent(eventId: string) {
    await deleteEvent(eventId, groupId);
    const eventsData = await getCalendarEvents(groupId, year, month);
    setEvents(eventsData);
    setShowEventModal(false);
    setSelectedEvent(null);
  }

  async function handleSaveBirthdaySettings() {
    await updateGroupBirthdaySettings(groupId, showMemberBirthdays, showFamilyBirthdays);
    const birthdaysData = await getBirthdays(groupId, month);
    setBirthdays(birthdaysData);
    setShowSettingsModal(false);
  }

  const days = getDaysInMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white flex items-center justify-center">
        <p className="text-slate-medium">Loading calendar...</p>
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
                href={`/groups/${groupId}`}
                className="text-slate-medium hover:text-electric-cyan transition-colors mr-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-heading font-bold text-neon-purple">{groupName}</h1>
                <p className="text-sm text-slate-medium">Calendar</p>
              </div>
            </div>
            <div className="flex gap-2">
              {isOwner && (
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 text-slate-medium hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg"
                  title="Birthday Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => openNewEventModal()}
                className="btn-primary text-sm py-2 px-4"
              >
                + Add Event
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-heading font-semibold text-slate-dark">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-soft-lavender">
            {DAYS.map((day) => (
              <div key={day} className="py-3 text-center text-sm font-medium text-slate-dark">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-[100px] bg-gray-50/50 border-t border-l border-gray-200" />;
              }

              const { events: dayEvents, birthdays: dayBirthdays } = getEventsForDay(day);
              const isToday = isCurrentMonth && today.getDate() === day;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

              return (
                <div
                  key={day}
                  className="min-h-[100px] border-t border-l border-gray-200 p-1 hover:bg-soft-lavender/50 cursor-pointer"
                  onClick={() => openNewEventModal(dateStr)}
                >
                  <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? "bg-electric-cyan text-white" : "text-slate-dark"
                  }`}>
                    {day}
                  </div>

                  <div className="space-y-1">
                    {/* Birthdays */}
                    {dayBirthdays.map((birthday) => (
                      <div
                        key={birthday.id}
                        className="text-xs px-1.5 py-0.5 bg-golden-sun/30 text-golden-sun-700 rounded truncate flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>🎂</span>
                        <span className="truncate">{birthday.name}</span>
                      </div>
                    ))}

                    {/* Events */}
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs px-1.5 py-0.5 bg-electric-cyan/20 text-electric-cyan-700 rounded truncate cursor-pointer hover:bg-electric-cyan/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEventDetails(event);
                        }}
                      >
                        {event.event_time && (
                          <span className="font-medium">
                            {event.event_time.slice(0, 5)}{" "}
                          </span>
                        )}
                        {event.title}
                      </div>
                    ))}

                    {dayEvents.length > 2 && (
                      <div className="text-xs text-slate-medium pl-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-electric-cyan/20 rounded"></div>
            <span className="text-slate-medium">Events</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🎂</span>
            <span className="text-slate-medium">Birthdays</span>
          </div>
        </div>
      </main>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {selectedEvent ? (
                // View Event Details
                <>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-heading font-semibold">{selectedEvent.title}</h3>
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="text-slate-medium hover:text-slate-dark"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {new Date(selectedEvent.event_date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {selectedEvent.event_time && (
                      <div className="flex items-center gap-2 text-slate-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {selectedEvent.event_time.slice(0, 5)}
                          {selectedEvent.end_time && ` - ${selectedEvent.end_time.slice(0, 5)}`}
                        </span>
                      </div>
                    )}

                    {selectedEvent.location && (
                      <div className="flex items-center gap-2 text-slate-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{selectedEvent.location}</span>
                      </div>
                    )}

                    {selectedEvent.description && (
                      <p className="text-slate-dark pt-2">{selectedEvent.description}</p>
                    )}
                  </div>

                  {/* Bring List Section */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {bringListLoading ? (
                      <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                    ) : eventBringList ? (
                      <BringListDisplay
                        eventId={selectedEvent.id}
                        groupId={groupId}
                        currentUserId={currentUserId}
                      />
                    ) : showCreateBringList ? (
                      <CreateBringList
                        eventId={selectedEvent.id}
                        groupId={groupId}
                        eventTitle={selectedEvent.title}
                        onCreated={(newList) => {
                          setEventBringList(newList);
                          setShowCreateBringList(false);
                        }}
                        onCancel={() => setShowCreateBringList(false)}
                      />
                    ) : selectedEvent.created_by === currentUserId ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-slate-medium mb-3">
                          Want guests to bring something?
                        </p>
                        <button
                          onClick={() => setShowCreateBringList(true)}
                          className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all"
                        >
                          🍽️ Add Sign-Up List
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="px-4 py-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                // Create Event Form
                <form onSubmit={handleCreateEvent}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-heading font-semibold">New Event</h3>
                    <button
                      type="button"
                      onClick={() => setShowEventModal(false)}
                      className="text-slate-medium hover:text-slate-dark"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="title" className="label">Title *</label>
                      <input
                        id="title"
                        type="text"
                        required
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        className="input"
                        placeholder="Team dinner"
                      />
                    </div>

                    <div>
                      <label htmlFor="date" className="label">Date *</label>
                      <input
                        id="date"
                        type="date"
                        required
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="input"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="time" className="label">Start Time</label>
                        <input
                          id="time"
                          type="time"
                          value={newEventTime}
                          onChange={(e) => setNewEventTime(e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label htmlFor="endTime" className="label">End Time</label>
                        <input
                          id="endTime"
                          type="time"
                          value={newEventEndTime}
                          onChange={(e) => setNewEventEndTime(e.target.value)}
                          className="input"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="location" className="label">Location</label>
                      <input
                        id="location"
                        type="text"
                        value={newEventLocation}
                        onChange={(e) => setNewEventLocation(e.target.value)}
                        className="input"
                        placeholder="123 Main St"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="label">Description</label>
                      <textarea
                        id="description"
                        rows={3}
                        value={newEventDescription}
                        onChange={(e) => setNewEventDescription(e.target.value)}
                        className="input resize-none"
                        placeholder="Add details..."
                      />
                    </div>

                    {/* Bring List Toggle */}
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newEventAddBringList}
                          onChange={(e) => setNewEventAddBringList(e.target.checked)}
                          className="w-5 h-5 mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-slate-dark flex items-center gap-2">
                            <span>🍽️</span> Add a sign-up list
                          </span>
                          <p className="text-sm text-slate-medium mt-0.5">
                            Let guests sign up to bring food, drinks, or supplies
                          </p>
                        </div>
                      </label>

                      {newEventAddBringList && (
                        <div className="mt-3 pl-8">
                          <label className="block text-sm font-medium text-slate-dark mb-1">
                            What are you providing as host?
                          </label>
                          <input
                            type="text"
                            value={newEventHostProviding}
                            onChange={(e) => setNewEventHostProviding(e.target.value)}
                            placeholder="I'll have burgers, buns, and the grill ready"
                            className="input w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowEventModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      {saving ? "Creating..." : "Create Event"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Birthday Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-heading font-semibold">Birthday Settings</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-slate-medium hover:text-slate-dark"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-slate-medium mb-4">
                Choose which birthdays to display on the group calendar.
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-electric-cyan/50">
                  <input
                    type="checkbox"
                    checked={showMemberBirthdays}
                    onChange={(e) => setShowMemberBirthdays(e.target.checked)}
                    className="w-4 h-4 text-electric-cyan border-gray-300 rounded focus:ring-electric-cyan"
                  />
                  <div>
                    <p className="font-medium text-slate-dark">Show member birthdays</p>
                    <p className="text-sm text-slate-medium">Display birthdays of group members</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-electric-cyan/50">
                  <input
                    type="checkbox"
                    checked={showFamilyBirthdays}
                    onChange={(e) => setShowFamilyBirthdays(e.target.checked)}
                    className="w-4 h-4 text-electric-cyan border-gray-300 rounded focus:ring-electric-cyan"
                  />
                  <div>
                    <p className="font-medium text-slate-dark">Show family birthdays</p>
                    <p className="text-sm text-slate-medium">Display family members&apos; birthdays</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBirthdaySettings}
                  className="btn-primary flex-1"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
