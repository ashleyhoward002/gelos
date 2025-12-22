"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
  getOuting,
  updateOuting,
  uploadCoverImage,
  removeCoverImage,
  Outing,
  getTripAttendees,
  updateAttendance,
  getTripBudgetSummary,
  getTripExpenses,
  getTripPolls,
  getTripEvents,
  getTripIdeas,
  getTripSavingsSummary,
  getTripMemberProgress,
  getTripPayments,
  addTripPayment,
  getTripFlights,
  saveTripFlight,
  deleteTripFlight,
  getTripAccommodations,
  saveTripAccommodation,
  deleteTripAccommodation,
  getTripActivities,
  saveTripActivity,
  getTripItinerary,
  saveTripItineraryItem,
  deleteTripItineraryItem,
  getTripTasks,
  getTripPackingItems,
  TripAttendee,
  TripBudgetSummary,
  TripSavingsSummary,
  TripMemberProgress,
  TripPayment,
  TripFlight,
  FlightType,
  TripAccommodation,
  AccommodationType,
  TripActivity,
  TripItineraryItem,
  TripTask,
  TripPackingItem,
  PackingCategory,
} from "@/lib/outings";
import {
  getPhotos,
  uploadPhotos,
  toggleFavorite,
  deletePhoto,
  Photo,
} from "@/lib/photos";
import { Expense } from "@/lib/expenses";
import { Poll } from "@/lib/polls";
import { Idea } from "@/lib/ideas";
import Header from "@/components/Header";
import KanbanBoard, { TaskDetailModal } from "@/components/ui/kanban-board";
import {
  getTasksByColumn,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  KanbanTask,
  KanbanColumn,
} from "@/lib/tasks";
import {
  TaskColumnId,
  TaskLabel,
  COLUMN_CONFIG,
} from "@/lib/task-constants";
import ItineraryBuilder from "@/components/ui/itinerary-builder";
import ItineraryItemModal, { ItineraryItemFormData } from "@/components/ui/itinerary-item-modal";
import ActivitiesTab from "@/components/ui/activities-tab";
import PackingTab from "@/components/ui/packing-tab";
import FamilyGroupDisplay from "@/components/ui/family-group-display";
import BringListDisplay from "@/components/ui/bring-list-display";
import { CreateBringList } from "@/components/ui/create-bring-list";
import { BringList, getBringList } from "@/lib/bring-list";
import {
  reorderItineraryItems,
  updateItineraryParticipation,
  duplicateItineraryItem,
  ItineraryParticipantStatus,
} from "@/lib/outings";

type TabType = "overview" | "travel" | "accommodations" | "activities" | "itinerary" | "tasks" | "packing" | "bring" | "savings" | "budget" | "polls" | "photos" | "ideas";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
}

export default function OutingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const outingId = params.outingId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [outing, setOuting] = useState<Outing | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Trip-specific state
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [attendees, setAttendees] = useState<TripAttendee[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<TripBudgetSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [userAttendance, setUserAttendance] = useState<string | null>(null);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);

  // Savings state
  const [savingsSummary, setSavingsSummary] = useState<TripSavingsSummary | null>(null);
  const [memberProgress, setMemberProgress] = useState<TripMemberProgress[]>([]);
  const [payments, setPayments] = useState<TripPayment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUserId, setPaymentUserId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  // Flights state
  const [flights, setFlights] = useState<TripFlight[]>([]);
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [editingFlight, setEditingFlight] = useState<TripFlight | null>(null);
  const [flightType, setFlightType] = useState<FlightType>("departure");
  const [flightAirline, setFlightAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDepartureCity, setFlightDepartureCity] = useState("");
  const [flightDepartureTime, setFlightDepartureTime] = useState("");
  const [flightArrivalTime, setFlightArrivalTime] = useState("");
  const [flightConfirmation, setFlightConfirmation] = useState("");
  const [flightNotes, setFlightNotes] = useState("");
  const [savingFlight, setSavingFlight] = useState(false);

  // Accommodations state
  const [accommodations, setAccommodations] = useState<TripAccommodation[]>([]);
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState<TripAccommodation | null>(null);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<AccommodationType>("hotel");
  const [accAddress, setAccAddress] = useState("");
  const [accCheckInDate, setAccCheckInDate] = useState("");
  const [accCheckInTime, setAccCheckInTime] = useState("");
  const [accCheckOutDate, setAccCheckOutDate] = useState("");
  const [accCheckOutTime, setAccCheckOutTime] = useState("");
  const [accConfirmation, setAccConfirmation] = useState("");
  const [accBookingReference, setAccBookingReference] = useState("");
  const [accAccessCode, setAccAccessCode] = useState("");
  const [accAccessInstructions, setAccAccessInstructions] = useState("");
  const [accPhone, setAccPhone] = useState("");
  const [accEmail, setAccEmail] = useState("");
  const [accMapLink, setAccMapLink] = useState("");
  const [accNotes, setAccNotes] = useState("");
  const [accTotalCost, setAccTotalCost] = useState("");
  const [accPaidBy, setAccPaidBy] = useState("");
  const [savingAccommodation, setSavingAccommodation] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedAccommodation, setSelectedAccommodation] = useState<TripAccommodation | null>(null);

  // Activities state
  const [activities, setActivities] = useState<TripActivity[]>([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<TripActivity | null>(null);
  const [activityName, setActivityName] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [activityStartTime, setActivityStartTime] = useState("");
  const [activityEndTime, setActivityEndTime] = useState("");
  const [activityLocation, setActivityLocation] = useState("");
  const [activityCost, setActivityCost] = useState("");
  const [activityIsGroup, setActivityIsGroup] = useState(false);
  const [activityNotes, setActivityNotes] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);

  // Itinerary state
  const [itinerary, setItinerary] = useState<TripItineraryItem[]>([]);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [editingItineraryItem, setEditingItineraryItem] = useState<TripItineraryItem | null>(null);
  const [itineraryDefaultDate, setItineraryDefaultDate] = useState("");

  // Tasks state (Kanban)
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [showKanbanTaskModal, setShowKanbanTaskModal] = useState(false);
  const [savingKanbanTask, setSavingKanbanTask] = useState(false);
  const [taskFilter, setTaskFilter] = useState<"all" | "mine" | "overdue">("all");

  // Legacy tasks state (keeping for backwards compatibility)
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TripTask | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [savingTask, setSavingTask] = useState(false);
  const [tasks, setTasks] = useState<TripTask[]>([]);

  // Packing state
  const [sharedPackingItems, setSharedPackingItems] = useState<TripPackingItem[]>([]);
  const [personalPackingItems, setPersonalPackingItems] = useState<TripPackingItem[]>([]);
  const [newPackingItem, setNewPackingItem] = useState("");
  const [newPackingCategory, setNewPackingCategory] = useState<PackingCategory>("misc");
  const [isSharedPackingItem, setIsSharedPackingItem] = useState(true);

  // Bring list state
  const [bringList, setBringList] = useState<BringList | null>(null);
  const [bringListLoading, setBringListLoading] = useState(true);
  const [showCreateBringList, setShowCreateBringList] = useState(false);

  // Cover image state
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetGoal, setBudgetGoal] = useState("");
  const [budgetDeadline, setBudgetDeadline] = useState("");
  const [status, setStatus] = useState<"upcoming" | "completed">("upcoming");

  // Upload form state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");

  const isTrip = outing?.outing_type === "trip";

  useEffect(() => {
    loadData();
  }, [groupId, outingId]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }

    const outingData = await getOuting(outingId);

    if (!outingData) {
      router.push(`/groups/${groupId}/outings`);
      return;
    }

    setOuting(outingData);

    // Set edit form defaults
    setTitle(outingData.title);
    setDescription(outingData.description || "");
    setLocation(outingData.location || "");
    setEventDate(outingData.event_date || "");
    setEndDate(outingData.end_date || "");
    setBudgetGoal(outingData.budget_goal?.toString() || "");
    setBudgetDeadline(outingData.budget_deadline || "");
    setStatus(outingData.status);

    // Load photos
    const photosData = await getPhotos(groupId, outingId);
    setPhotos(photosData);

    // Load trip-specific data
    if (outingData.outing_type === "trip") {
      const [
        attendeesData,
        budgetData,
        expensesData,
        pollsData,
        eventsData,
        ideasData,
        savingsData,
        progressData,
        paymentsData,
        flightsData,
        accommodationsData,
        activitiesData,
        itineraryData,
        tasksData,
        packingData,
        kanbanData,
        bringListData,
      ] = await Promise.all([
        getTripAttendees(outingId),
        getTripBudgetSummary(outingId),
        getTripExpenses(outingId),
        getTripPolls(outingId),
        getTripEvents(outingId),
        getTripIdeas(outingId),
        getTripSavingsSummary(outingId),
        getTripMemberProgress(outingId),
        getTripPayments(outingId),
        getTripFlights(outingId),
        getTripAccommodations(outingId),
        getTripActivities(outingId),
        getTripItinerary(outingId),
        getTripTasks(outingId),
        getTripPackingItems(outingId),
        getTasksByColumn(outingId),
        getBringList({ outingId }),
      ]);

      setAttendees(attendeesData);
      setBudgetSummary(budgetData);
      setExpenses(expensesData);
      setPolls(pollsData);
      setEvents(eventsData as CalendarEvent[]);
      setIdeas(ideasData);
      setSavingsSummary(savingsData);
      setMemberProgress(progressData);
      setPayments(paymentsData);
      setFlights(flightsData);
      setAccommodations(accommodationsData);
      setActivities(activitiesData);
      setItinerary(itineraryData);
      setTasks(tasksData);
      setSharedPackingItems(packingData.shared);
      setPersonalPackingItems(packingData.personal);
      setKanbanColumns(kanbanData);
      setBringList(bringListData);
      setBringListLoading(false);

      // Find current user's attendance
      if (user) {
        const userAttendee = attendeesData.find((a) => a.user_id === user.id);
        setUserAttendance(userAttendee?.status || null);
        // Set default payment user to current user
        setPaymentUserId(user.id);
      }
    } else {
      // For non-trip outings, just load the bring list
      const bringListData = await getBringList({ outingId });
      setBringList(bringListData);
      setBringListLoading(false);
    }

    setLoading(false);
  }

  async function handleAttendanceUpdate(status: "going" | "maybe" | "not_going") {
    setUpdatingAttendance(true);
    const result = await updateAttendance(outingId, groupId, status);
    if (result.success) {
      setUserAttendance(status);
      // Reload attendees
      const attendeesData = await getTripAttendees(outingId);
      setAttendees(attendeesData);
    }
    setUpdatingAttendance(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);

    const updateData: {
      title?: string;
      description?: string;
      location?: string;
      event_date?: string;
      end_date?: string;
      budget_goal?: number;
      budget_deadline?: string;
      status?: "upcoming" | "completed";
    } = {
      title,
      description,
      location,
      event_date: eventDate,
      status,
    };

    if (isTrip) {
      updateData.end_date = endDate;
      updateData.budget_goal = budgetGoal ? parseFloat(budgetGoal) : undefined;
      updateData.budget_deadline = budgetDeadline;
    }

    const result = await updateOuting(outingId, groupId, updateData);

    if (result.error) {
      alert(result.error);
    } else {
      setShowEditModal(false);
      loadData();
    }

    setSaving(false);
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentAmount || !paymentUserId) return;

    setAddingPayment(true);

    const result = await addTripPayment(outingId, groupId, {
      user_id: paymentUserId,
      amount: parseFloat(paymentAmount),
      payment_date: paymentDate,
      notes: paymentNotes,
    });

    if (result.error) {
      alert(result.error);
    } else {
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNotes("");
      // Reload savings data
      const [savingsData, progressData, paymentsData] = await Promise.all([
        getTripSavingsSummary(outingId),
        getTripMemberProgress(outingId),
        getTripPayments(outingId),
      ]);
      setSavingsSummary(savingsData);
      setMemberProgress(progressData);
      setPayments(paymentsData);
    }

    setAddingPayment(false);
  }

  function openFlightModal(flight?: TripFlight) {
    if (flight) {
      setEditingFlight(flight);
      setFlightType(flight.flight_type);
      setFlightAirline(flight.airline || "");
      setFlightNumber(flight.flight_number || "");
      setFlightDepartureCity(flight.departure_city || "");
      setFlightDepartureTime(flight.departure_time?.slice(0, 16) || "");
      setFlightArrivalTime(flight.arrival_time?.slice(0, 16) || "");
      setFlightConfirmation(flight.confirmation_number || "");
      setFlightNotes(flight.notes || "");
    } else {
      setEditingFlight(null);
      setFlightType("departure");
      setFlightAirline("");
      setFlightNumber("");
      setFlightDepartureCity("");
      setFlightDepartureTime("");
      setFlightArrivalTime("");
      setFlightConfirmation("");
      setFlightNotes("");
    }
    setShowFlightModal(true);
  }

  function closeFlightModal() {
    setShowFlightModal(false);
    setEditingFlight(null);
    setFlightType("departure");
    setFlightAirline("");
    setFlightNumber("");
    setFlightDepartureCity("");
    setFlightDepartureTime("");
    setFlightArrivalTime("");
    setFlightConfirmation("");
    setFlightNotes("");
  }

  async function handleSaveFlight(e: React.FormEvent) {
    e.preventDefault();
    setSavingFlight(true);

    const result = await saveTripFlight(outingId, groupId, {
      id: editingFlight?.id,
      flight_type: flightType,
      airline: flightAirline,
      flight_number: flightNumber,
      departure_city: flightDepartureCity,
      departure_time: flightDepartureTime,
      arrival_time: flightArrivalTime,
      confirmation_number: flightConfirmation,
      notes: flightNotes,
    });

    if (result.error) {
      alert(result.error);
    } else {
      closeFlightModal();
      const flightsData = await getTripFlights(outingId);
      setFlights(flightsData);
    }

    setSavingFlight(false);
  }

  async function handleDeleteFlight(flightId: string) {
    if (!confirm("Are you sure you want to delete this flight?")) return;

    const result = await deleteTripFlight(flightId, groupId, outingId);
    if (result.error) {
      alert(result.error);
    } else {
      setFlights((prev) => prev.filter((f) => f.id !== flightId));
    }
  }

  // Get user's flights
  function getUserFlights(userId: string) {
    return {
      departure: flights.find((f) => f.user_id === userId && f.flight_type === "departure"),
      return: flights.find((f) => f.user_id === userId && f.flight_type === "return"),
    };
  }

  // Group flights by arrival date for timeline
  function getFlightsByDate() {
    const grouped: Record<string, TripFlight[]> = {};

    flights.forEach((flight) => {
      if (flight.arrival_time) {
        const date = flight.arrival_time.split("T")[0];
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(flight);
      }
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dateFlights]) => ({
        date,
        flights: dateFlights.sort((a, b) =>
          (a.arrival_time || "").localeCompare(b.arrival_time || "")
        ),
      }));
  }

  function formatFlightTime(dateTimeStr: string | null) {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatFlightDate(dateTimeStr: string | null) {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // ============ COVER IMAGE HANDLERS ============
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadCoverImage(outingId, groupId, formData);

    if (result.error) {
      alert(result.error);
    } else if (result.cover_image_url) {
      setOuting((prev) => prev ? { ...prev, cover_image_url: result.cover_image_url! } : null);
      setShowCoverModal(false);
    }
    setUploadingCover(false);
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  }

  async function handleRemoveCover() {
    if (!confirm("Remove the cover image?")) return;

    const result = await removeCoverImage(outingId, groupId);

    if (result.error) {
      alert(result.error);
    } else {
      setOuting((prev) => prev ? { ...prev, cover_image_url: null } : null);
      setShowCoverModal(false);
    }
  }

  // ============ ACCOMMODATION HANDLERS ============
  function openAccommodationModal(acc?: TripAccommodation) {
    if (acc) {
      setEditingAccommodation(acc);
      setAccName(acc.name);
      setAccType(acc.accommodation_type);
      setAccAddress(acc.address || "");
      setAccCheckInDate(acc.check_in_date || "");
      setAccCheckInTime(acc.check_in_time || "");
      setAccCheckOutDate(acc.check_out_date || "");
      setAccCheckOutTime(acc.check_out_time || "");
      setAccConfirmation(acc.confirmation_number || "");
      setAccBookingReference(acc.booking_reference || "");
      setAccAccessCode(acc.access_code || "");
      setAccAccessInstructions(acc.access_instructions || "");
      setAccPhone(acc.contact_phone || "");
      setAccEmail(acc.contact_email || "");
      setAccMapLink(acc.map_link || "");
      setAccNotes(acc.notes || "");
      setAccTotalCost(acc.total_cost?.toString() || "");
      setAccPaidBy(acc.paid_by || "");
    } else {
      setEditingAccommodation(null);
      setAccName("");
      setAccType("hotel");
      setAccAddress("");
      setAccCheckInDate(outing?.event_date || "");
      setAccCheckInTime("");
      setAccCheckOutDate(outing?.end_date || "");
      setAccCheckOutTime("");
      setAccConfirmation("");
      setAccBookingReference("");
      setAccAccessCode("");
      setAccAccessInstructions("");
      setAccPhone("");
      setAccEmail("");
      setAccMapLink("");
      setAccNotes("");
      setAccTotalCost("");
      setAccPaidBy("");
    }
    setShowAccommodationModal(true);
  }

  async function handleSaveAccommodation(e: React.FormEvent) {
    e.preventDefault();
    if (!accName.trim()) return;
    setSavingAccommodation(true);

    const result = await saveTripAccommodation(outingId, groupId, {
      id: editingAccommodation?.id,
      name: accName,
      accommodation_type: accType,
      address: accAddress,
      check_in_date: accCheckInDate,
      check_in_time: accCheckInTime,
      check_out_date: accCheckOutDate,
      check_out_time: accCheckOutTime,
      confirmation_number: accConfirmation,
      booking_reference: accBookingReference,
      access_code: accAccessCode,
      access_instructions: accAccessInstructions,
      contact_phone: accPhone,
      contact_email: accEmail,
      map_link: accMapLink,
      notes: accNotes,
      total_cost: accTotalCost ? parseFloat(accTotalCost) : undefined,
      paid_by: accPaidBy || undefined,
    });

    if (result.error) {
      alert(result.error);
    } else {
      setShowAccommodationModal(false);
      const data = await getTripAccommodations(outingId);
      setAccommodations(data);
    }
    setSavingAccommodation(false);
  }

  async function handleDeleteAccommodation(accId: string) {
    if (!confirm("Delete this accommodation?")) return;
    const result = await deleteTripAccommodation(accId, groupId, outingId);
    if (result.error) {
      alert(result.error);
    } else {
      setAccommodations((prev) => prev.filter((a) => a.id !== accId));
    }
  }

  // ============ ACTIVITY HANDLERS ============

  async function handleSaveActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityName.trim()) return;
    setSavingActivity(true);

    const result = await saveTripActivity(outingId, groupId, {
      id: editingActivity?.id,
      name: activityName,
      description: activityDescription,
      activity_date: activityDate,
      start_time: activityStartTime,
      end_time: activityEndTime,
      location: activityLocation,
      cost_per_person: activityCost ? parseFloat(activityCost) : undefined,
      is_group_activity: activityIsGroup,
      notes: activityNotes,
    });

    if (result.error) {
      alert(result.error);
    } else {
      setShowActivityModal(false);
      const data = await getTripActivities(outingId);
      setActivities(data);
    }
    setSavingActivity(false);
  }

  // ============ ITINERARY HANDLERS ============
  function openItineraryModal(item?: TripItineraryItem, defaultDate?: string) {
    setEditingItineraryItem(item || null);
    setItineraryDefaultDate(defaultDate || outing?.event_date || "");
    setShowItineraryModal(true);
  }

  async function handleSaveItinerary(data: ItineraryItemFormData) {
    const result = await saveTripItineraryItem(outingId, groupId, {
      id: data.id,
      item_date: data.item_date,
      start_time: data.start_time,
      end_time: data.end_time,
      title: data.title,
      location: data.location,
      address: data.address,
      notes: data.notes,
      item_type: data.item_type,
      status: data.status,
      cost: data.cost,
      estimated_cost: data.estimated_cost,
      confirmation_number: data.confirmation_number,
      booking_url: data.booking_url,
    });

    if (result.error) {
      alert(result.error);
      throw new Error(result.error);
    } else {
      setShowItineraryModal(false);
      const items = await getTripItinerary(outingId);
      setItinerary(items);
    }
  }

  async function handleDeleteItinerary(itemId: string) {
    if (!confirm("Delete this item?")) return;
    const result = await deleteTripItineraryItem(itemId, groupId, outingId);
    if (result.error) {
      alert(result.error);
    } else {
      setItinerary((prev) => prev.filter((i) => i.id !== itemId));
    }
  }

  async function handleReorderItinerary(date: string, itemIds: string[]) {
    const result = await reorderItineraryItems(outingId, groupId, date, itemIds);
    if (result.error) {
      console.error(result.error);
    } else {
      // Optimistically update the order
      setItinerary((prev) => {
        const itemsForDate = prev.filter((i) => i.item_date === date);
        const otherItems = prev.filter((i) => i.item_date !== date);
        const reorderedItems = itemIds.map((id, index) => {
          const item = itemsForDate.find((i) => i.id === id);
          return item ? { ...item, sort_order: index } : null;
        }).filter((item): item is TripItineraryItem => item !== null);
        return [...otherItems, ...reorderedItems].sort((a, b) => {
          if (a.item_date !== b.item_date) return a.item_date.localeCompare(b.item_date);
          return a.sort_order - b.sort_order;
        });
      });
    }
  }

  async function handleItineraryParticipation(itemId: string, status: ItineraryParticipantStatus) {
    const result = await updateItineraryParticipation(itemId, groupId, outingId, status);
    if (result.error) {
      alert(result.error);
    } else {
      // Refresh itinerary to get updated participants
      const items = await getTripItinerary(outingId);
      setItinerary(items);
    }
  }

  async function handleDuplicateItinerary(itemId: string, targetDate?: string) {
    const result = await duplicateItineraryItem(itemId, groupId, outingId, targetDate);
    if (result.error) {
      alert(result.error);
    } else {
      const items = await getTripItinerary(outingId);
      setItinerary(items);
    }
  }

  // ============ LEGACY TASK HANDLERS ============
  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setSavingTask(true);

    // Note: This is legacy code, might need to use saveTripTask from lib/outings
    setShowTaskModal(false);
    setSavingTask(false);
  }

  // ============ KANBAN TASK HANDLERS ============
  async function handleKanbanTaskMove(
    taskId: string,
    fromColumnId: TaskColumnId,
    toColumnId: TaskColumnId,
    newIndex: number
  ) {
    // Optimistic update
    setKanbanColumns((prev) => {
      const newColumns = [...prev];
      const fromCol = newColumns.find((c) => c.id === fromColumnId);
      const toCol = newColumns.find((c) => c.id === toColumnId);

      if (!fromCol || !toCol) return prev;

      const taskIndex = fromCol.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return prev;

      const [task] = fromCol.tasks.splice(taskIndex, 1);
      task.column_id = toColumnId;
      toCol.tasks.splice(newIndex, 0, task);

      return newColumns;
    });

    // Persist to database
    const result = await moveTask(taskId, groupId, outingId, toColumnId, newIndex);
    if (result.error) {
      alert(result.error);
      // Reload on error
      const data = await getTasksByColumn(outingId);
      setKanbanColumns(data);
    }
  }

  async function handleKanbanTaskAdd(columnId: TaskColumnId, title: string) {
    const result = await createTask(outingId, groupId, {
      title,
      column_id: columnId,
    });

    if (result.error) {
      alert(result.error);
    } else if (result.task) {
      setKanbanColumns((prev) => {
        const newColumns = [...prev];
        const col = newColumns.find((c) => c.id === columnId);
        if (col) {
          col.tasks.push(result.task!);
        }
        return newColumns;
      });
    }
  }

  async function handleKanbanTaskUpdate(updates: {
    title?: string;
    description?: string;
    column_id?: TaskColumnId;
    assigned_to?: string | null;
    due_date?: string | null;
    labels?: TaskLabel[];
  }) {
    if (!selectedTask) return;
    setSavingKanbanTask(true);

    const result = await updateTask(selectedTask.id, groupId, outingId, updates);

    if (result.error) {
      alert(result.error);
    } else {
      // Reload columns
      const data = await getTasksByColumn(outingId);
      setKanbanColumns(data);
      setShowKanbanTaskModal(false);
      setSelectedTask(null);
    }
    setSavingKanbanTask(false);
  }

  async function handleKanbanTaskDelete() {
    if (!selectedTask) return;
    if (!confirm("Delete this task?")) return;

    const result = await deleteTask(selectedTask.id, groupId, outingId);

    if (result.error) {
      alert(result.error);
    } else {
      setKanbanColumns((prev) => {
        const newColumns = [...prev];
        const col = newColumns.find((c) => c.id === selectedTask.column_id);
        if (col) {
          col.tasks = col.tasks.filter((t) => t.id !== selectedTask.id);
        }
        return newColumns;
      });
      setShowKanbanTaskModal(false);
      setSelectedTask(null);
    }
  }

  // Get filtered Kanban columns based on filter
  function getFilteredKanbanColumns(): KanbanColumn[] {
    if (taskFilter === "all") return kanbanColumns;

    return kanbanColumns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((task) => {
        if (taskFilter === "mine") {
          return task.assigned_to === currentUserId;
        }
        if (taskFilter === "overdue") {
          return task.due_date && new Date(task.due_date) < new Date();
        }
        return true;
      }),
    }));
  }

  // Get task counts
  function getTaskCounts() {
    let total = 0;
    const counts: Record<TaskColumnId, number> = {
      "todo": 0,
      "in-progress": 0,
      "booked": 0,
      "confirmed": 0,
    };

    kanbanColumns.forEach((col) => {
      counts[col.id] = col.tasks.length;
      total += col.tasks.length;
    });

    return { total, ...counts };
  }

  function getSavingsStatus() {
    if (!savingsSummary || !outing?.budget_deadline) return null;

    const daysRemaining = savingsSummary.days_until_deadline || 0;
    const percentFunded = savingsSummary.percent_funded;

    // Calculate expected progress based on time elapsed
    const totalDays = Math.max(
      (new Date(outing.budget_deadline).getTime() - new Date(outing.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
      1
    );
    const daysElapsed = totalDays - daysRemaining;
    const expectedPercent = Math.min((daysElapsed / totalDays) * 100, 100);

    if (percentFunded >= 100) {
      return { status: "complete", label: "Fully Funded!", icon: "🎉", color: "text-green-600" };
    } else if (percentFunded >= expectedPercent * 1.1) {
      return { status: "ahead", label: "Ahead of Schedule!", icon: "🎉", color: "text-green-600" };
    } else if (percentFunded >= expectedPercent * 0.9) {
      return { status: "on_track", label: "On Track", icon: "✓", color: "text-green-600" };
    } else {
      return { status: "behind", label: "Behind Schedule", icon: "⚠️", color: "text-golden-sun" };
    }
  }

  function getStatusColor(status: TripMemberProgress["status"]) {
    switch (status) {
      case "paid_in_full":
        return "bg-green-500";
      case "on_track":
        return "bg-green-400";
      case "slightly_behind":
        return "bg-golden-sun";
      case "behind":
        return "bg-electric-cyan";
      default:
        return "bg-gray-200";
    }
  }

  function getStatusLabel(status: TripMemberProgress["status"]) {
    switch (status) {
      case "paid_in_full":
        return "Paid in Full";
      case "on_track":
        return "On Track";
      case "slightly_behind":
        return "Slightly Behind";
      case "behind":
        return "Behind";
      default:
        return "";
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });
    if (caption) formData.append("caption", caption);
    formData.append("outingId", outingId);

    const result = await uploadPhotos(groupId, formData);

    if (result.error) {
      alert(result.error);
    } else {
      setShowUploadModal(false);
      setSelectedFiles([]);
      setCaption("");
      loadData();
    }

    setUploading(false);
  }

  async function handleToggleFavorite(photoId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const result = await toggleFavorite(photoId, groupId);
    if (result.success) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, is_favorite: result.is_favorite! } : p
        )
      );
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto((prev) =>
          prev ? { ...prev, is_favorite: result.is_favorite! } : null
        );
      }
    }
  }

  async function handleDelete(photoId: string) {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    const result = await deletePhoto(photoId, groupId);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setSelectedPhoto(null);
    } else {
      alert(result.error);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "No date set";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateRange(start: string | null, end: string | null) {
    if (!start) return "No dates set";
    const startDate = new Date(start + "T00:00:00");
    if (!end || start === end) {
      return startDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    const endDate = new Date(end + "T00:00:00");
    const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
    const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });

    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
    }
    return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${startDate.getFullYear()}`;
  }

  function formatCurrency(amount: number, currency: string = "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function getDaysBetween(start: string, end: string): string[] {
    const days: string[] = [];
    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T00:00:00");

    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white">
        <Header showBack backHref={`/groups/${groupId}/outings`} title="..." />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
        </div>
      </div>
    );
  }

  if (!outing) return null;

  const tripTabs: { id: TabType; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📋" },
    { id: "travel", label: "Travel", icon: "✈️" },
    { id: "accommodations", label: "Stay", icon: "🏨" },
    { id: "itinerary", label: "Itinerary", icon: "📅" },
    { id: "activities", label: "Activities", icon: "🎯" },
    { id: "tasks", label: "Tasks", icon: "✅" },
    { id: "packing", label: "Packing", icon: "🎒" },
    { id: "bring", label: "What to Bring", icon: "🍽️" },
    { id: "savings", label: "Savings", icon: "💵" },
    { id: "budget", label: "Expenses", icon: "💰" },
    { id: "polls", label: "Polls", icon: "📊" },
    { id: "photos", label: "Photos", icon: "📸" },
    { id: "ideas", label: "Ideas", icon: "💡" },
  ];

  const outingTabs: { id: TabType; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📋" },
    { id: "bring", label: "What to Bring", icon: "🍽️" },
    { id: "photos", label: "Photos", icon: "📸" },
  ];

  const tabs = isTrip ? tripTabs : outingTabs;

  const goingCount = attendees.filter((a) => a.status === "going").length;
  const maybeCount = attendees.filter((a) => a.status === "maybe").length;

  return (
    <div className="min-h-screen bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}/outings`}
        title={outing.title}
        subtitle={outing.location || undefined}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cover Image */}
        {outing.cover_image_url && (
          <div className="relative mb-6 rounded-2xl overflow-hidden h-48 sm:h-64 lg:h-80 group">
            <img
              src={outing.cover_image_url}
              alt={outing.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white drop-shadow-lg">
                {outing.title}
              </h2>
              {outing.location && (
                <p className="text-white/90 mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {outing.location}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCoverModal(true)}
              className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Change cover"
            >
              <svg className="w-5 h-5 text-slate-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        )}

        {/* Header Card */}
        <div className="card mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{isTrip ? "✈️" : "🎉"}</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    outing.status === "upcoming"
                      ? "bg-electric-cyan/20 text-electric-cyan"
                      : "bg-gray-200 text-slate-dark"
                  }`}
                >
                  {outing.status === "upcoming" ? "Upcoming" : "Completed"}
                </span>
                {isTrip && (
                  <span className="text-sm text-slate-medium">
                    {goingCount} going{maybeCount > 0 ? ` · ${maybeCount} maybe` : ""}
                  </span>
                )}
                {!outing.cover_image_url && (
                  <button
                    onClick={() => setShowCoverModal(true)}
                    className="ml-auto text-sm text-electric-cyan hover:underline flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add Cover
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-slate-medium mb-3">
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {isTrip
                    ? formatDateRange(outing.event_date, outing.end_date || null)
                    : formatDate(outing.event_date)}
                </span>
                {outing.location && (
                  <span className="flex items-center gap-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {outing.location}
                  </span>
                )}
              </div>

              {outing.description && (
                <p className="text-slate-dark">{outing.description}</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {/* RSVP Buttons for trips */}
              {isTrip && outing.status === "upcoming" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAttendanceUpdate("going")}
                    disabled={updatingAttendance}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userAttendance === "going"
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-slate-dark hover:bg-green-100"
                    }`}
                  >
                    ✓ Going
                  </button>
                  <button
                    onClick={() => handleAttendanceUpdate("maybe")}
                    disabled={updatingAttendance}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userAttendance === "maybe"
                        ? "bg-golden-sun text-slate-dark"
                        : "bg-gray-100 text-slate-dark hover:bg-golden-sunen-sun/30"
                    }`}
                  >
                    ? Maybe
                  </button>
                  <button
                    onClick={() => handleAttendanceUpdate("not_going")}
                    disabled={updatingAttendance}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userAttendance === "not_going"
                        ? "bg-gray-300 text-white"
                        : "bg-gray-100 text-slate-dark hover:bg-gray-200"
                    }`}
                  >
                    ✗ Can&apos;t Go
                  </button>
                </div>
              )}

              {outing.created_by === currentUserId && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn-secondary text-sm"
                >
                  Edit {isTrip ? "Trip" : "Outing"}
                </button>
              )}
            </div>
          </div>

          {/* Budget Progress for trips */}
          {isTrip && budgetSummary && outing.budget_goal && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-medium">Trip Budget</span>
                <span className="text-sm font-medium">
                  {formatCurrency(budgetSummary.total_spent, outing.budget_currency || "USD")} /{" "}
                  {formatCurrency(outing.budget_goal, outing.budget_currency || "USD")}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    budgetSummary.total_spent > outing.budget_goal
                      ? "bg-red-500"
                      : "bg-electric-cyan"
                  }`}
                  style={{
                    width: `${Math.min((budgetSummary.total_spent / outing.budget_goal) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-electric-cyan text-white"
                  : "bg-white text-slate-dark hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Family Units - Who's Coming */}
            {isTrip && attendees.length > 0 && (
              <div className="card">
                <FamilyGroupDisplay
                  tripId={outingId}
                  groupId={groupId}
                  currentUserId={currentUserId}
                  members={attendees
                    .filter((a) => a.status === "going")
                    .map((a) => ({
                      id: a.user_id,
                      display_name: a.user?.display_name || null,
                      full_name: a.user?.full_name || null,
                      avatar_url: a.user?.avatar_url || null,
                    }))}
                />

                {maybeCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Maybe ({maybeCount})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {attendees
                        .filter((a) => a.status === "maybe")
                        .map((attendee) => (
                          <span
                            key={attendee.user_id}
                            className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                          >
                            {attendee.user?.display_name || attendee.user?.full_name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Stats */}
            {isTrip && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card text-center">
                  <div className="text-2xl mb-1">📸</div>
                  <div className="text-2xl font-bold text-electric-cyan">{photos.length}</div>
                  <div className="text-sm text-slate-medium">Photos</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl mb-1">💰</div>
                  <div className="text-2xl font-bold text-electric-cyan">{expenses.length}</div>
                  <div className="text-sm text-slate-medium">Expenses</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-2xl font-bold text-electric-cyan">{polls.length}</div>
                  <div className="text-sm text-slate-medium">Polls</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl mb-1">💡</div>
                  <div className="text-2xl font-bold text-electric-cyan">{ideas.length}</div>
                  <div className="text-sm text-slate-medium">Ideas</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "travel" && isTrip && (
          <div className="space-y-6">
            {/* Your Travel Info */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-lg">Your Travel Info</h3>
                <button
                  onClick={() => openFlightModal()}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Flight
                </button>
              </div>

              {(() => {
                const myFlights = getUserFlights(currentUserId);
                const hasDeparture = !!myFlights.departure;
                const hasReturn = !!myFlights.return;

                if (!hasDeparture && !hasReturn) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">✈️</div>
                      <p className="text-slate-medium mb-4">
                        Add your flight information so everyone knows when you&apos;re arriving!
                      </p>
                      <button onClick={() => openFlightModal()} className="btn-secondary">
                        Add Your Flights
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Departure Flight */}
                    <div className={`p-4 rounded-lg border-2 ${hasDeparture ? "border-electric-cyan/30 bg-electric-cyan/5" : "border-dashed border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-medium">Outbound Flight</span>
                        {hasDeparture ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => openFlightModal(myFlights.departure)}
                              className="p-1 text-slate-medium hover:text-electric-cyan"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteFlight(myFlights.departure!.id)}
                              className="p-1 text-slate-medium hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setFlightType("departure");
                              openFlightModal();
                            }}
                            className="text-sm text-electric-cyan hover:underline"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                      {hasDeparture ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🛫</span>
                            <span className="font-semibold">
                              {myFlights.departure!.airline} {myFlights.departure!.flight_number}
                            </span>
                          </div>
                          {myFlights.departure!.departure_city && (
                            <p className="text-sm text-slate-medium mb-1">
                              From: {myFlights.departure!.departure_city}
                            </p>
                          )}
                          {myFlights.departure!.departure_time && (
                            <p className="text-sm mb-1">
                              <span className="text-slate-medium">Departs:</span>{" "}
                              {formatFlightDate(myFlights.departure!.departure_time)} at{" "}
                              {formatFlightTime(myFlights.departure!.departure_time)}
                            </p>
                          )}
                          {myFlights.departure!.arrival_time && (
                            <p className="text-sm mb-1">
                              <span className="text-slate-medium">Arrives:</span>{" "}
                              {formatFlightDate(myFlights.departure!.arrival_time)} at{" "}
                              {formatFlightTime(myFlights.departure!.arrival_time)}
                            </p>
                          )}
                          {myFlights.departure!.confirmation_number && (
                            <p className="text-xs text-slate-medium mt-2">
                              Confirmation: {myFlights.departure!.confirmation_number}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-medium">No outbound flight added</p>
                      )}
                    </div>

                    {/* Return Flight */}
                    <div className={`p-4 rounded-lg border-2 ${hasReturn ? "border-green-300 bg-green-50" : "border-dashed border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-medium">Return Flight</span>
                        {hasReturn ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => openFlightModal(myFlights.return)}
                              className="p-1 text-slate-medium hover:text-electric-cyan"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteFlight(myFlights.return!.id)}
                              className="p-1 text-slate-medium hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setFlightType("return");
                              openFlightModal();
                            }}
                            className="text-sm text-electric-cyan hover:underline"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                      {hasReturn ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🛬</span>
                            <span className="font-semibold">
                              {myFlights.return!.airline} {myFlights.return!.flight_number}
                            </span>
                          </div>
                          {myFlights.return!.departure_city && (
                            <p className="text-sm text-slate-medium mb-1">
                              From: {myFlights.return!.departure_city}
                            </p>
                          )}
                          {myFlights.return!.departure_time && (
                            <p className="text-sm mb-1">
                              <span className="text-slate-medium">Departs:</span>{" "}
                              {formatFlightDate(myFlights.return!.departure_time)} at{" "}
                              {formatFlightTime(myFlights.return!.departure_time)}
                            </p>
                          )}
                          {myFlights.return!.arrival_time && (
                            <p className="text-sm mb-1">
                              <span className="text-slate-medium">Arrives:</span>{" "}
                              {formatFlightDate(myFlights.return!.arrival_time)} at{" "}
                              {formatFlightTime(myFlights.return!.arrival_time)}
                            </p>
                          )}
                          {myFlights.return!.confirmation_number && (
                            <p className="text-xs text-slate-medium mt-2">
                              Confirmation: {myFlights.return!.confirmation_number}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-medium">No return flight added</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Arrivals Timeline */}
            <div className="card">
              <h3 className="font-heading font-semibold text-lg mb-4">Arrival Timeline</h3>
              {flights.filter((f) => f.flight_type === "departure").length === 0 ? (
                <p className="text-slate-medium text-center py-4">
                  No arrivals scheduled yet. Add your flight to appear on the timeline!
                </p>
              ) : (
                <div className="space-y-6">
                  {getFlightsByDate()
                    .filter(({ flights }) => flights.some((f) => f.flight_type === "departure"))
                    .map(({ date, flights: dateFlights }) => {
                      const departureFlights = dateFlights.filter((f) => f.flight_type === "departure");
                      if (departureFlights.length === 0) return null;

                      const dateObj = new Date(date + "T00:00:00");
                      return (
                        <div key={date} className="relative">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-16 text-center">
                              <div className="w-14 h-14 bg-electric-cyan/10 rounded-lg flex flex-col items-center justify-center mx-auto">
                                <span className="text-xs text-electric-cyan font-medium">
                                  {dateObj.toLocaleDateString("en-US", { weekday: "short" })}
                                </span>
                                <span className="text-lg font-bold text-electric-cyan">
                                  {dateObj.getDate()}
                                </span>
                              </div>
                              <span className="text-xs text-slate-medium mt-1 block">
                                {dateObj.toLocaleDateString("en-US", { month: "short" })}
                              </span>
                            </div>
                            <div className="flex-1 space-y-3">
                              {departureFlights.map((flight) => (
                                <div
                                  key={flight.id}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                >
                                  <div className="w-10 h-10 rounded-full bg-soft-lavender/30 flex items-center justify-center">
                                    {flight.user?.avatar_url ? (
                                      <img
                                        src={flight.user.avatar_url}
                                        alt=""
                                        className="w-10 h-10 rounded-full object-cover"
                                      />
                                    ) : (
                                      <span className="font-medium text-slate-dark">
                                        {(flight.user?.display_name || flight.user?.full_name || "?").charAt(0)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {flight.user?.display_name || flight.user?.full_name}
                                      {flight.user_id === currentUserId && (
                                        <span className="text-xs text-slate-medium ml-1">(You)</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-slate-medium">
                                      {flight.airline} {flight.flight_number}
                                      {flight.departure_city && ` from ${flight.departure_city}`}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-electric-cyan">
                                      {formatFlightTime(flight.arrival_time)}
                                    </div>
                                    <div className="text-xs text-slate-medium">arrives</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Everyone's Flights */}
            <div className="card">
              <h3 className="font-heading font-semibold text-lg mb-4">Everyone&apos;s Flights</h3>
              {attendees.filter((a) => a.status === "going").length === 0 ? (
                <p className="text-slate-medium text-center py-4">No attendees yet</p>
              ) : (
                <div className="space-y-4">
                  {attendees
                    .filter((a) => a.status === "going")
                    .map((attendee) => {
                      const userFlights = getUserFlights(attendee.user_id);
                      const hasFlight = userFlights.departure || userFlights.return;

                      return (
                        <div
                          key={attendee.user_id}
                          className="p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-soft-lavender/30 flex items-center justify-center">
                              {attendee.user?.avatar_url ? (
                                <img
                                  src={attendee.user.avatar_url}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <span className="font-medium text-slate-dark">
                                  {(attendee.user?.display_name || attendee.user?.full_name || "?").charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">
                                {attendee.user?.display_name || attendee.user?.full_name}
                                {attendee.user_id === currentUserId && (
                                  <span className="text-xs text-slate-medium ml-1">(You)</span>
                                )}
                              </div>
                              {!hasFlight && (
                                <span className="text-xs text-slate-medium">No flights added yet</span>
                              )}
                            </div>
                            {!hasFlight && (
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs text-slate-medium">
                                Pending
                              </span>
                            )}
                          </div>

                          {hasFlight && (
                            <div className="grid sm:grid-cols-2 gap-3 pl-13">
                              {userFlights.departure && (
                                <div className="text-sm">
                                  <span className="text-lg mr-1">🛫</span>
                                  <span className="font-medium">
                                    {userFlights.departure.airline} {userFlights.departure.flight_number}
                                  </span>
                                  {userFlights.departure.arrival_time && (
                                    <span className="text-slate-medium ml-2">
                                      Arrives {formatFlightDate(userFlights.departure.arrival_time)}{" "}
                                      {formatFlightTime(userFlights.departure.arrival_time)}
                                    </span>
                                  )}
                                </div>
                              )}
                              {userFlights.return && (
                                <div className="text-sm">
                                  <span className="text-lg mr-1">🛬</span>
                                  <span className="font-medium">
                                    {userFlights.return.airline} {userFlights.return.flight_number}
                                  </span>
                                  {userFlights.return.departure_time && (
                                    <span className="text-slate-medium ml-2">
                                      Departs {formatFlightDate(userFlights.return.departure_time)}{" "}
                                      {formatFlightTime(userFlights.return.departure_time)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "accommodations" && isTrip && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-lg">Accommodations</h3>
                <button onClick={() => openAccommodationModal()} className="btn-primary text-sm">
                  + Add Accommodation
                </button>
              </div>

              {accommodations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏨</div>
                  <p className="text-slate-medium mb-4">No accommodations added yet</p>
                  <button onClick={() => openAccommodationModal()} className="btn-secondary">
                    Add Your First Accommodation
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {accommodations.map((acc) => (
                    <div key={acc.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-3xl">
                            {acc.accommodation_type === "hotel" ? "🏨" :
                             acc.accommodation_type === "airbnb" ? "🏠" :
                             acc.accommodation_type === "house" ? "🏡" : "🏢"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-lg">{acc.name}</h4>
                              {acc.total_cost && (
                                <span className="text-sm font-medium text-electric-cyan whitespace-nowrap">
                                  ${acc.total_cost.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {acc.address && (
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-slate-medium">{acc.address}</p>
                                {acc.map_link && (
                                  <a
                                    href={acc.map_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-electric-cyan hover:underline text-sm flex items-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Map
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Check-in/out times */}
                            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm">
                              {acc.check_in_date && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                  </svg>
                                  <span className="text-slate-medium">In:</span>{" "}
                                  {new Date(acc.check_in_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                  {acc.check_in_time && <span className="text-slate-medium"> at {acc.check_in_time}</span>}
                                </span>
                              )}
                              {acc.check_out_date && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                  </svg>
                                  <span className="text-slate-medium">Out:</span>{" "}
                                  {new Date(acc.check_out_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                  {acc.check_out_time && <span className="text-slate-medium"> at {acc.check_out_time}</span>}
                                </span>
                              )}
                            </div>

                            {/* Booking details */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-medium">
                              {acc.confirmation_number && (
                                <span>Confirmation: <span className="font-mono font-medium text-slate-dark">{acc.confirmation_number}</span></span>
                              )}
                              {acc.booking_reference && (
                                <span>Booking Ref: <span className="font-mono font-medium text-slate-dark">{acc.booking_reference}</span></span>
                              )}
                            </div>

                            {/* Contact info */}
                            {(acc.contact_phone || acc.contact_email) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                                {acc.contact_phone && (
                                  <a href={`tel:${acc.contact_phone}`} className="text-electric-cyan hover:underline flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    {acc.contact_phone}
                                  </a>
                                )}
                                {acc.contact_email && (
                                  <a href={`mailto:${acc.contact_email}`} className="text-electric-cyan hover:underline flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {acc.contact_email}
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Access info */}
                            {(acc.access_code || acc.access_instructions) && (
                              <div className="mt-3 p-2 bg-gray-50 rounded-lg text-sm">
                                {acc.access_code && (
                                  <p className="flex items-center gap-2">
                                    <span className="text-slate-medium">Access Code:</span>
                                    <span className="font-mono font-semibold bg-white px-2 py-0.5 rounded">{acc.access_code}</span>
                                  </p>
                                )}
                                {acc.access_instructions && (
                                  <p className="text-slate-medium mt-1 text-xs">{acc.access_instructions}</p>
                                )}
                              </div>
                            )}

                            {/* Paid by */}
                            {acc.payer && (
                              <p className="text-xs text-slate-medium mt-2">
                                Paid by <span className="font-medium text-slate-dark">{acc.payer.display_name || acc.payer.full_name}</span>
                              </p>
                            )}

                            {/* Notes */}
                            {acc.notes && (
                              <p className="text-sm text-slate-medium mt-2 italic">{acc.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          <button
                            onClick={() => openAccommodationModal(acc)}
                            className="p-2 text-slate-medium hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAccommodation(acc);
                              setShowRoomModal(true);
                            }}
                            className="p-2 text-slate-medium hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-colors"
                            title="Manage Rooms"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAccommodation(acc.id)}
                            className="p-2 text-slate-medium hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Room Assignments */}
                      {acc.rooms && acc.rooms.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Room Assignments</p>
                            <button
                              onClick={() => {
                                setSelectedAccommodation(acc);
                                setShowRoomModal(true);
                              }}
                              className="text-xs text-electric-cyan hover:underline"
                            >
                              Edit Rooms
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {acc.rooms.map((room) => (
                              <div key={room.id} className="bg-gray-50 px-3 py-2 rounded-lg text-sm">
                                <span className="font-medium">{room.room_name}:</span>{" "}
                                {room.users?.map((u) => u.display_name || u.full_name).join(", ") || "Unassigned"}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "itinerary" && isTrip && (
          <div className="space-y-6">
            <div className="card">
              {!outing?.event_date || !outing?.end_date ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="text-muted-foreground mb-3">Set trip dates to build your itinerary</p>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="btn-primary text-sm"
                  >
                    Set Trip Dates
                  </button>
                </div>
              ) : (
                <ItineraryBuilder
                  items={itinerary}
                  tripStartDate={outing.event_date}
                  tripEndDate={outing.end_date}
                  currentUserId={currentUserId}
                  currency={outing.budget_currency || "USD"}
                  onAddItem={(date) => openItineraryModal(undefined, date)}
                  onEditItem={(item) => openItineraryModal(item)}
                  onDeleteItem={handleDeleteItinerary}
                  onReorderItems={handleReorderItinerary}
                  onUpdateParticipation={handleItineraryParticipation}
                  onDuplicateItem={handleDuplicateItinerary}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === "activities" && isTrip && (
          <div className="card">
            <ActivitiesTab
              groupId={groupId}
              tripId={outingId}
              tripStartDate={outing?.event_date}
              tripEndDate={outing?.end_date}
              currency={outing?.budget_currency || "USD"}
              currentUserId={currentUserId}
            />
          </div>
        )}

        {activeTab === "tasks" && isTrip && (
          <div className="space-y-6">
            {/* Task Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold text-xl">Task Board</h3>
                {(() => {
                  const counts = getTaskCounts();
                  return (
                    <p className="text-sm text-slate-medium mt-1">
                      {counts.total} tasks ({counts.todo} to do, {counts["in-progress"]} in progress, {counts.booked} booked, {counts.confirmed} confirmed)
                    </p>
                  );
                })()}
              </div>
              <div className="flex gap-2">
                <select
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value as "all" | "mine" | "overdue")}
                  className="input text-sm"
                >
                  <option value="all">All Tasks</option>
                  <option value="mine">My Tasks</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Kanban Board */}
            {kanbanColumns.length === 0 || kanbanColumns.every(c => c.tasks.length === 0) ? (
              <div className="card text-center py-12">
                <div className="text-5xl mb-4">📋</div>
                <h4 className="font-heading font-bold text-lg mb-2">No tasks yet</h4>
                <p className="text-slate-medium mb-6">
                  Start organizing your trip by adding tasks to the board
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {COLUMN_CONFIG.map((col) => (
                    <span
                      key={col.id}
                      className="px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: col.color + "30", color: col.color }}
                    >
                      {col.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <KanbanBoard
                columns={getFilteredKanbanColumns()}
                onTaskMove={handleKanbanTaskMove}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setShowKanbanTaskModal(true);
                }}
                onTaskAdd={handleKanbanTaskAdd}
                currentUserId={currentUserId}
              />
            )}

            {/* Quick Add Section */}
            <div className="card bg-gray-50">
              <h4 className="font-medium text-sm text-slate-medium mb-3">Quick Add Ideas</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Book flights", column: "todo" as TaskColumnId, labels: ["flights"] },
                  { label: "Reserve hotel", column: "todo" as TaskColumnId, labels: ["hotel"] },
                  { label: "Plan activities", column: "todo" as TaskColumnId, labels: ["activities"] },
                  { label: "Rent car", column: "todo" as TaskColumnId, labels: ["transport"] },
                  { label: "Make reservations", column: "todo" as TaskColumnId, labels: ["food"] },
                ].map((suggestion) => (
                  <button
                    key={suggestion.label}
                    onClick={async () => {
                      const result = await createTask(outingId, groupId, {
                        title: suggestion.label,
                        column_id: suggestion.column,
                        labels: suggestion.labels as TaskLabel[],
                      });
                      if (result.task) {
                        const data = await getTasksByColumn(outingId);
                        setKanbanColumns(data);
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-electric-cyan hover:text-electric-cyan transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "packing" && isTrip && (
          <div className="card">
            <PackingTab
              groupId={groupId}
              tripId={outingId}
              tripType="beach" // TODO: Get from outing type
            />
          </div>
        )}

        {/* What to Bring Tab */}
        {activeTab === "bring" && (
          <div className="card">
            {bringListLoading ? (
              <div className="space-y-4">
                <div className="h-20 bg-muted animate-pulse rounded-xl" />
                <div className="h-40 bg-muted animate-pulse rounded-xl" />
              </div>
            ) : bringList ? (
              <BringListDisplay
                outingId={outingId}
                groupId={groupId}
                currentUserId={currentUserId}
              />
            ) : showCreateBringList ? (
              <CreateBringList
                outingId={outingId}
                groupId={groupId}
                eventTitle={outing.title}
                onCreated={(newList) => {
                  setBringList(newList);
                  setShowCreateBringList(false);
                }}
                onCancel={() => setShowCreateBringList(false)}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🍽️</div>
                <h3 className="font-heading font-semibold text-lg mb-2">
                  What to Bring
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create a sign-up list so guests can volunteer to bring food, drinks, or supplies.
                </p>
                {outing.created_by === currentUserId ? (
                  <button
                    onClick={() => setShowCreateBringList(true)}
                    className="btn-primary bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    Create Sign-Up List
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    The host hasn&apos;t created a sign-up list yet.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "savings" && isTrip && (
          <div className="space-y-6">
            {/* Savings Progress Dashboard */}
            {savingsSummary && outing.budget_goal && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-lg">Trip Savings Progress</h3>
                  {getSavingsStatus() && (
                    <span className={`flex items-center gap-1 font-medium ${getSavingsStatus()?.color}`}>
                      {getSavingsStatus()?.icon} {getSavingsStatus()?.label}
                    </span>
                  )}
                </div>

                {/* Main Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-medium">
                      {savingsSummary.percent_funded.toFixed(0)}% funded
                    </span>
                    <span className="font-medium">
                      {formatCurrency(savingsSummary.total_contributed, outing.budget_currency || "USD")} of{" "}
                      {formatCurrency(savingsSummary.budget_goal, outing.budget_currency || "USD")}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-4 rounded-full transition-all ${
                        savingsSummary.percent_funded >= 100 ? "bg-green-500" : "bg-electric-cyan"
                      }`}
                      style={{ width: `${Math.min(savingsSummary.percent_funded, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-electric-cyan/10 rounded-lg text-center">
                    <div className="text-2xl font-bold text-electric-cyan">
                      {savingsSummary.attendee_count}
                    </div>
                    <div className="text-xs text-slate-medium">People</div>
                  </div>
                  <div className="p-3 bg-soft-lavender/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-dark">
                      {formatCurrency(savingsSummary.per_person_share, outing.budget_currency || "USD")}
                    </div>
                    <div className="text-xs text-slate-medium">Per Person</div>
                  </div>
                  {savingsSummary.days_until_deadline !== null && (
                    <div className="p-3 bg-golden-sunen-sun/30 rounded-lg text-center">
                      <div className="text-2xl font-bold text-slate-dark">
                        {savingsSummary.days_until_deadline}
                      </div>
                      <div className="text-xs text-slate-medium">Days Left</div>
                    </div>
                  )}
                  {savingsSummary.monthly_payment_needed > 0 && (
                    <div className="p-3 bg-gray-200 rounded-lg text-center">
                      <div className="text-2xl font-bold text-slate-dark">
                        {formatCurrency(savingsSummary.monthly_payment_needed, outing.budget_currency || "USD")}
                      </div>
                      <div className="text-xs text-slate-medium">/mo to goal</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Contribute */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-lg">Log Payment</h3>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Payment
                </button>
              </div>
              <p className="text-sm text-slate-medium">
                Track contributions toward your trip budget. Log payments when members contribute their share.
              </p>
            </div>

            {/* Per-Person Progress */}
            {memberProgress.length > 0 && (
              <div className="card">
                <h3 className="font-heading font-semibold text-lg mb-4">
                  Individual Progress
                </h3>
                <div className="space-y-4">
                  {memberProgress.map((member) => (
                    <div key={member.user_id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-soft-lavender/30 flex items-center justify-center">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="font-medium text-slate-dark">
                                {(member.display_name || member.full_name || "?").charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {member.display_name || member.full_name}
                              {member.user_id === currentUserId && (
                                <span className="text-xs text-slate-medium ml-1">(You)</span>
                              )}
                            </div>
                            <div className="text-sm text-slate-medium">
                              {formatCurrency(member.total_paid, outing.budget_currency || "USD")} of{" "}
                              {formatCurrency(member.share_amount, outing.budget_currency || "USD")}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              member.status === "paid_in_full"
                                ? "bg-green-100 text-green-700"
                                : member.status === "on_track"
                                ? "bg-green-50 text-green-600"
                                : member.status === "slightly_behind"
                                ? "bg-golden-sunen-sun/30 text-golden-sun"
                                : "bg-electric-cyan/20 text-electric-cyan"
                            }`}
                          >
                            {getStatusLabel(member.status)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getStatusColor(member.status)}`}
                          style={{ width: `${Math.min(member.percent_paid, 100)}%` }}
                        />
                      </div>
                      {member.remaining > 0 && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-medium">
                            {member.percent_paid.toFixed(0)}% paid
                          </span>
                          <span className="text-xs text-slate-medium">
                            {formatCurrency(member.remaining, outing.budget_currency || "USD")} remaining
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Payments */}
            {payments.length > 0 && (
              <div className="card">
                <h3 className="font-heading font-semibold text-lg mb-4">
                  Recent Payments
                </h3>
                <div className="space-y-3">
                  {payments.slice(0, 10).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {payment.user?.display_name || payment.user?.full_name}
                          </div>
                          <div className="text-xs text-slate-medium">
                            {new Date(payment.payment_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            {payment.notes && ` — ${payment.notes}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-green-600 font-bold">
                        +{formatCurrency(payment.amount, outing.budget_currency || "USD")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No budget goal set */}
            {!outing.budget_goal && (
              <div className="card text-center py-8">
                <div className="text-4xl mb-2">🎯</div>
                <h3 className="font-heading font-semibold text-lg mb-2">Set a Budget Goal</h3>
                <p className="text-slate-medium mb-4">
                  Add a budget goal and deadline to start tracking savings for this trip.
                </p>
                <button onClick={() => setShowEditModal(true)} className="btn-primary">
                  Edit Trip Details
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "budget" && isTrip && (
          <div className="space-y-6">
            {/* Budget Summary */}
            {budgetSummary && (
              <div className="card">
                <h3 className="font-heading font-semibold text-lg mb-4">Budget Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-electric-cyan/10 rounded-lg text-center">
                    <div className="text-sm text-slate-medium mb-1">Total Spent</div>
                    <div className="text-2xl font-bold text-electric-cyan">
                      {formatCurrency(budgetSummary.total_spent, outing.budget_currency || "USD")}
                    </div>
                  </div>
                  <div className="p-4 bg-soft-lavender/20 rounded-lg text-center">
                    <div className="text-sm text-slate-medium mb-1">Your Share</div>
                    <div className="text-2xl font-bold text-slate-dark">
                      {formatCurrency(budgetSummary.your_share, outing.budget_currency || "USD")}
                    </div>
                  </div>
                  <div className="p-4 bg-golden-sunen-sun/30 rounded-lg text-center">
                    <div className="text-sm text-slate-medium mb-1">You Paid</div>
                    <div className="text-2xl font-bold text-slate-dark">
                      {formatCurrency(budgetSummary.your_paid, outing.budget_currency || "USD")}
                    </div>
                  </div>
                </div>

                {/* Your Balance */}
                <div
                  className={`p-4 rounded-lg text-center ${
                    budgetSummary.your_balance >= 0 ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div className="text-sm text-slate-medium mb-1">Your Balance</div>
                  <div
                    className={`text-2xl font-bold ${
                      budgetSummary.your_balance >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {budgetSummary.your_balance >= 0 ? "+" : ""}
                    {formatCurrency(budgetSummary.your_balance, outing.budget_currency || "USD")}
                  </div>
                  <div className="text-sm text-slate-medium mt-1">
                    {budgetSummary.your_balance >= 0
                      ? "You are owed this amount"
                      : "You owe this amount"}
                  </div>
                </div>
              </div>
            )}

            {/* Expenses List */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-lg">
                  Trip Expenses ({expenses.length})
                </h3>
                <Link
                  href={`/groups/${groupId}/expenses?trip=${outingId}`}
                  className="btn-primary text-sm"
                >
                  + Add Expense
                </Link>
              </div>

              {expenses.length === 0 ? (
                <p className="text-slate-medium text-center py-8">
                  No expenses recorded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/groups/${groupId}/expenses/${expense.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        <div className="text-sm text-slate-medium">
                          Paid by {expense.paid_by_user?.display_name || expense.paid_by_user?.full_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-electric-cyan">
                          {formatCurrency(expense.amount, expense.currency)}
                        </div>
                        <div className="text-xs text-slate-medium">
                          {expense.expense_date}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "itinerary" && isTrip && outing.event_date && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg">Itinerary</h3>
              <Link
                href={`/groups/${groupId}/calendar?trip=${outingId}`}
                className="btn-secondary text-sm"
              >
                + Add Event
              </Link>
            </div>

            {getDaysBetween(outing.event_date, outing.end_date || outing.event_date).map(
              (day) => {
                const dayEvents = events.filter((e) => e.event_date === day);
                const dayDate = new Date(day + "T00:00:00");

                return (
                  <div key={day} className="card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-electric-cyan/10 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-xs text-electric-cyan font-medium">
                          {dayDate.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="text-lg font-bold text-electric-cyan">
                          {dayDate.getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {dayDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-sm text-slate-medium">
                          {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    {dayEvents.length === 0 ? (
                      <p className="text-slate-medium text-sm pl-15">
                        No events planned
                      </p>
                    ) : (
                      <div className="space-y-2 pl-15">
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                          >
                            {event.event_time && (
                              <span className="text-sm font-medium text-electric-cyan">
                                {event.event_time}
                              </span>
                            )}
                            <span className="font-medium">{event.title}</span>
                            {event.location && (
                              <span className="text-sm text-slate-medium">
                                @ {event.location}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        {activeTab === "polls" && isTrip && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg">
                Trip Polls ({polls.length})
              </h3>
              <Link
                href={`/groups/${groupId}/polls?trip=${outingId}`}
                className="btn-primary text-sm"
              >
                + Create Poll
              </Link>
            </div>

            {polls.length === 0 ? (
              <div className="card text-center py-8">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-slate-medium">No polls for this trip yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {polls.map((poll) => (
                  <Link
                    key={poll.id}
                    href={`/groups/${groupId}/polls/${poll.id}`}
                    className="card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{poll.title}</h4>
                        <p className="text-sm text-slate-medium mt-1">
                          {poll.options?.length || 0} options · {poll.vote_count || 0} votes
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          !poll.is_closed
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-slate-dark"
                        }`}
                      >
                        {poll.is_closed ? "Closed" : "Active"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "photos" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-semibold text-lg">
                Photos ({photos.length})
              </h3>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Photos
              </button>
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-12 card">
                <div className="w-16 h-16 bg-electric-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">No photos yet</h3>
                <p className="text-slate-medium mb-4">
                  Add photos to capture memories from this {isTrip ? "trip" : "outing"}!
                </p>
                <button onClick={() => setShowUploadModal(true)} className="btn-primary">
                  Upload Photos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={photo.file_url}
                      alt={photo.caption || "Photo"}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={(e) => handleToggleFavorite(photo.id, e)}
                      className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
                        photo.is_favorite
                          ? "bg-electric-cyan text-white"
                          : "bg-white/80 text-slate-medium opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill={photo.is_favorite ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "ideas" && isTrip && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg">
                Trip Ideas ({ideas.length})
              </h3>
              <Link
                href={`/groups/${groupId}/ideas?trip=${outingId}`}
                className="btn-primary text-sm"
              >
                + Add Idea
              </Link>
            </div>

            {ideas.length === 0 ? (
              <div className="card text-center py-8">
                <div className="text-4xl mb-2">💡</div>
                <p className="text-slate-medium">No ideas linked to this trip yet</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {ideas.map((idea) => (
                  <div key={idea.id} className="card">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{idea.category === "food" ? "🍽️" : idea.category === "activities" ? "🎯" : "💡"}</span>
                      <div className="flex-1">
                        <h4 className="font-medium">{idea.title}</h4>
                        {idea.description && (
                          <p className="text-sm text-slate-medium mt-1 line-clamp-2">
                            {idea.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm text-slate-medium">
                          <span>👍 {idea.vote_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">
                Edit {isTrip ? "Trip" : "Outing"}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    {isTrip ? "Start Date" : "Date"}
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="input"
                  />
                </div>
                {isTrip && (
                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input"
                />
              </div>

              {isTrip && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">
                      Budget Goal
                    </label>
                    <input
                      type="number"
                      value={budgetGoal}
                      onChange={(e) => setBudgetGoal(e.target.value)}
                      placeholder="e.g., 2000"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-dark mb-1">
                      Savings Deadline
                    </label>
                    <input
                      type="date"
                      value={budgetDeadline}
                      onChange={(e) => setBudgetDeadline(e.target.value)}
                      className="input"
                    />
                    <p className="text-xs text-slate-medium mt-1">
                      When do you need the trip fully funded?
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "upcoming" | "completed")}
                  className="input"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || saving}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">
                Add Photos
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                  setCaption("");
                }}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-electric-cyan/30 rounded-xl hover:border-electric-cyan/50 transition-colors"
                >
                  {selectedFiles.length > 0 ? (
                    <div className="text-center">
                      <p className="font-medium text-electric-cyan">
                        {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
                      </p>
                      <p className="text-sm text-slate-medium mt-1">
                        Click to change selection
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg
                        className="w-12 h-12 text-electric-cyan/50 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="font-medium text-slate-dark">Click to select photos</p>
                      <p className="text-sm text-slate-medium mt-1">
                        You can select multiple files
                      </p>
                    </div>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Caption (optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="input"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                    setCaption("");
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedFiles.length === 0 || uploading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Log Payment</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount("");
                  setPaymentNotes("");
                }}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Who&apos;s contributing?
                </label>
                <select
                  value={paymentUserId}
                  onChange={(e) => setPaymentUserId(e.target.value)}
                  className="input w-full"
                  required
                >
                  {attendees
                    .filter((a) => a.status === "going")
                    .map((attendee) => (
                      <option key={attendee.user_id} value={attendee.user_id}>
                        {attendee.user?.display_name || attendee.user?.full_name}
                        {attendee.user_id === currentUserId && " (You)"}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="input w-full pl-7"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g., Venmo transfer"
                  className="input w-full"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount("");
                    setPaymentNotes("");
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!paymentAmount || addingPayment}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {addingPayment ? "Adding..." : "Log Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src={selectedPhoto.file_url}
                alt={selectedPhoto.caption || "Photo"}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>

            <div className="bg-white rounded-xl p-4 mt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {selectedPhoto.caption && (
                    <p className="font-medium mb-2">{selectedPhoto.caption}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-6 h-6 bg-soft-lavender/30 rounded-full flex items-center justify-center text-xs font-medium text-slate-dark">
                        {(
                          selectedPhoto.uploader?.display_name ||
                          selectedPhoto.uploader?.full_name ||
                          "?"
                        ).charAt(0)}
                      </span>
                      {selectedPhoto.uploader?.display_name ||
                        selectedPhoto.uploader?.full_name ||
                        "Unknown"}
                    </span>
                    <span>
                      {new Date(selectedPhoto.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleToggleFavorite(selectedPhoto.id, e)}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedPhoto.is_favorite
                        ? "bg-electric-cyan text-white"
                        : "bg-gray-100 text-slate-medium hover:bg-electric-cyan/10 hover:text-electric-cyan"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill={selectedPhoto.is_favorite ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                  {selectedPhoto.uploaded_by === currentUserId && (
                    <button
                      onClick={() => handleDelete(selectedPhoto.id)}
                      className="p-2 rounded-lg bg-gray-100 text-slate-medium hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flight Modal */}
      {showFlightModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">
                {editingFlight ? "Edit Flight" : "Add Flight"}
              </h3>
              <button
                onClick={closeFlightModal}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveFlight} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Flight Type *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="flightType"
                      value="departure"
                      checked={flightType === "departure"}
                      onChange={() => setFlightType("departure")}
                      className="w-4 h-4 text-electric-cyan"
                    />
                    <span className="flex items-center gap-1">
                      <span>🛫</span> Outbound
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="flightType"
                      value="return"
                      checked={flightType === "return"}
                      onChange={() => setFlightType("return")}
                      className="w-4 h-4 text-electric-cyan"
                    />
                    <span className="flex items-center gap-1">
                      <span>🛬</span> Return
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Airline
                  </label>
                  <input
                    type="text"
                    value={flightAirline}
                    onChange={(e) => setFlightAirline(e.target.value)}
                    placeholder="e.g., Delta"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Flight #
                  </label>
                  <input
                    type="text"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="e.g., DL123"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Departing From
                </label>
                <input
                  type="text"
                  value={flightDepartureCity}
                  onChange={(e) => setFlightDepartureCity(e.target.value)}
                  placeholder="e.g., LAX or Los Angeles"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Departure Time
                  </label>
                  <input
                    type="datetime-local"
                    value={flightDepartureTime}
                    onChange={(e) => setFlightDepartureTime(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Arrival Time
                  </label>
                  <input
                    type="datetime-local"
                    value={flightArrivalTime}
                    onChange={(e) => setFlightArrivalTime(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Confirmation #
                </label>
                <input
                  type="text"
                  value={flightConfirmation}
                  onChange={(e) => setFlightConfirmation(e.target.value)}
                  placeholder="Your booking confirmation code"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Notes
                </label>
                <textarea
                  value={flightNotes}
                  onChange={(e) => setFlightNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional info..."
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeFlightModal}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFlight}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {savingFlight ? "Saving..." : editingFlight ? "Update Flight" : "Add Flight"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accommodation Modal */}
      {showAccommodationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">
                {editingAccommodation ? "Edit Accommodation" : "Add Accommodation"}
              </h3>
              <button
                onClick={() => {
                  setShowAccommodationModal(false);
                  setEditingAccommodation(null);
                }}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveAccommodation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Accommodation Type *
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as AccommodationType)}
                  className="input"
                  required
                >
                  <option value="hotel">🏨 Hotel</option>
                  <option value="airbnb">🏠 Airbnb / Vacation Rental</option>
                  <option value="house">🏡 House / Villa</option>
                  <option value="other">🏢 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g., Hilton Garden Inn"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={accAddress}
                  onChange={(e) => setAccAddress(e.target.value)}
                  placeholder="Full address"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Check-in Date *
                  </label>
                  <input
                    type="date"
                    value={accCheckInDate}
                    onChange={(e) => setAccCheckInDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Check-out Date *
                  </label>
                  <input
                    type="date"
                    value={accCheckOutDate}
                    onChange={(e) => setAccCheckOutDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Check-in Time
                  </label>
                  <input
                    type="time"
                    value={accCheckInTime}
                    onChange={(e) => setAccCheckInTime(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Check-out Time
                  </label>
                  <input
                    type="time"
                    value={accCheckOutTime}
                    onChange={(e) => setAccCheckOutTime(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Confirmation #
                  </label>
                  <input
                    type="text"
                    value={accConfirmation}
                    onChange={(e) => setAccConfirmation(e.target.value)}
                    placeholder="Booking confirmation"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Booking Reference
                  </label>
                  <input
                    type="text"
                    value={accBookingReference}
                    onChange={(e) => setAccBookingReference(e.target.value)}
                    placeholder="Airbnb/Booking ref"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Total Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accTotalCost}
                    onChange={(e) => setAccTotalCost(e.target.value)}
                    placeholder="0.00"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Paid By
                  </label>
                  <select
                    value={accPaidBy}
                    onChange={(e) => setAccPaidBy(e.target.value)}
                    className="input"
                  >
                    <option value="">Select who paid</option>
                    {attendees.filter(a => a.status === "going").map((a) => (
                      <option key={a.user_id} value={a.user_id}>
                        {a.user?.display_name || a.user?.full_name || "Unknown"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={accPhone}
                    onChange={(e) => setAccPhone(e.target.value)}
                    placeholder="Property phone"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={accEmail}
                    onChange={(e) => setAccEmail(e.target.value)}
                    placeholder="Property email"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Map Link
                </label>
                <input
                  type="url"
                  value={accMapLink}
                  onChange={(e) => setAccMapLink(e.target.value)}
                  placeholder="Google Maps or other link"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Access Code / Gate Code
                </label>
                <input
                  type="text"
                  value={accAccessCode}
                  onChange={(e) => setAccAccessCode(e.target.value)}
                  placeholder="Door code, gate code, etc."
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Access Instructions
                </label>
                <textarea
                  value={accAccessInstructions}
                  onChange={(e) => setAccAccessInstructions(e.target.value)}
                  rows={2}
                  placeholder="How to get in, parking, etc."
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Notes
                </label>
                <textarea
                  value={accNotes}
                  onChange={(e) => setAccNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional details, amenities, etc."
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccommodationModal(false);
                    setEditingAccommodation(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccommodation}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {savingAccommodation ? "Saving..." : editingAccommodation ? "Update" : "Add Accommodation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">
                {editingActivity ? "Edit Activity" : "Add Activity / Excursion"}
              </h3>
              <button
                onClick={() => {
                  setShowActivityModal(false);
                  setEditingActivity(null);
                }}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Activity Name *
                </label>
                <input
                  type="text"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="e.g., Snorkeling Trip"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Description
                </label>
                <textarea
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  rows={2}
                  placeholder="What's this activity about?"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={activityLocation}
                  onChange={(e) => setActivityLocation(e.target.value)}
                  placeholder="Where does it take place?"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={activityStartTime}
                    onChange={(e) => setActivityStartTime(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-dark mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={activityEndTime}
                    onChange={(e) => setActivityEndTime(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Cost per Person
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={activityCost}
                  onChange={(e) => setActivityCost(e.target.value)}
                  placeholder="0.00"
                  className="input"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activityIsGroup"
                  checked={activityIsGroup}
                  onChange={(e) => setActivityIsGroup(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-200 text-electric-cyan focus:ring-electric-cyan"
                />
                <label htmlFor="activityIsGroup" className="text-sm font-medium text-slate-dark">
                  Group activity (everyone participates)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Notes
                </label>
                <textarea
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  rows={2}
                  placeholder="What to bring, meeting point, etc."
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowActivityModal(false);
                    setEditingActivity(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingActivity}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {savingActivity ? "Saving..." : editingActivity ? "Update" : "Add Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Itinerary Modal */}
      {outing && (
        <ItineraryItemModal
          isOpen={showItineraryModal}
          onClose={() => {
            setShowItineraryModal(false);
            setEditingItineraryItem(null);
          }}
          onSave={handleSaveItinerary}
          editingItem={editingItineraryItem}
          defaultDate={itineraryDefaultDate || outing.event_date || ""}
          tripStartDate={outing.event_date || ""}
          tripEndDate={outing.end_date || ""}
          attendees={attendees}
          currency={outing.budget_currency || "USD"}
        />
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">
                {editingTask ? "Edit Task" : "Add Task"}
              </h3>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }}
                className="text-slate-medium hover:text-slate-dark"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Book restaurant for dinner"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={2}
                  placeholder="Additional details about this task..."
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1">
                  Assign to
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                  {attendees.filter(a => a.status === "going").map((attendee) => (
                    <label key={attendee.user_id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taskAssignees.includes(attendee.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTaskAssignees([...taskAssignees, attendee.user_id]);
                          } else {
                            setTaskAssignees(taskAssignees.filter(id => id !== attendee.user_id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-200 text-electric-cyan focus:ring-electric-cyan"
                      />
                      <span className="text-sm">
                        {attendee.user?.display_name || attendee.user?.full_name || "Unknown"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {savingTask ? "Saving..." : editingTask ? "Update" : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cover Image Modal */}
      {showCoverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-heading font-bold text-slate-dark mb-4">
              {outing?.cover_image_url ? "Change Cover Image" : "Add Cover Image"}
            </h3>

            {outing?.cover_image_url && (
              <div className="mb-4">
                <p className="text-sm text-slate-medium mb-2">Current cover:</p>
                <div className="relative rounded-lg overflow-hidden h-32">
                  <img
                    src={outing.cover_image_url}
                    alt="Current cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-2">
                  Upload new image
                </label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                  className="w-full text-sm text-slate-dark file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-electric-cyan file:text-white hover:file:bg-electric-cyan-dark disabled:opacity-50"
                />
                <p className="text-xs text-slate-medium mt-1">
                  Recommended: 1200x400 pixels or larger
                </p>
              </div>

              {uploadingCover && (
                <div className="flex items-center gap-2 text-slate-medium">
                  <svg className="animate-spin h-5 w-5 text-electric-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Uploading...</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCoverModal(false)}
                  className="btn-secondary flex-1"
                  disabled={uploadingCover}
                >
                  Cancel
                </button>
                {outing?.cover_image_url && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={uploadingCover}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Task Detail Modal */}
      {showKanbanTaskModal && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          attendees={attendees.filter((a) => a.status === "going")}
          onClose={() => {
            setShowKanbanTaskModal(false);
            setSelectedTask(null);
          }}
          onSave={handleKanbanTaskUpdate}
          onDelete={handleKanbanTaskDelete}
          saving={savingKanbanTask}
        />
      )}
    </div>
  );
}
