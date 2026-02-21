"use client";

import { useState, useCallback, useMemo } from "react";
import { ExpenseGuest } from "@/lib/expenses";

// Receipt item from OCR or manual entry
export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  category: "drink" | "app" | "pizza" | "entree" | "other";
}

// Receipt data structure
export interface ReceiptData {
  restaurant?: string;
  date?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  gratuity: number;
  gratuityPercent?: number;
  total: number;
}

// Person who can be assigned items
export interface SplitPerson {
  id: string;
  name: string;
  color: string;
  isGuest?: boolean;
}

interface Props {
  groupId: string;
  outingId?: string;
  members: { id: string; display_name: string | null; full_name: string | null }[];
  guests: ExpenseGuest[];
  onComplete: (expenseData: {
    description: string;
    amount: number;
    splits: { user_id?: string; guest_id?: string; amount: number }[];
  }) => void;
  onCancel: () => void;
  initialData?: ReceiptData;
}

const CATEGORY_ICONS: Record<string, string> = {
  drink: "🍹",
  app: "🧆",
  pizza: "🍕",
  entree: "🍗",
  other: "📦",
};

const CATEGORY_COLORS: Record<string, string> = {
  drink: "bg-hot-pink/10 text-hot-pink border-hot-pink/20",
  app: "bg-electric-cyan/10 text-electric-cyan border-electric-cyan/20",
  pizza: "bg-golden-sun/10 text-golden-sun-700 border-golden-sun/20",
  entree: "bg-cosmic-green/10 text-cosmic-green border-cosmic-green/20",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

const PERSON_COLORS = [
  "#00D4FF", // electric cyan
  "#A855F7", // neon purple
  "#FF8C42", // vibrant orange
  "#4ADE80", // cosmic green
  "#EC4899", // hot pink
  "#FFD700", // golden sun
  "#06B6D4", // cyan
  "#8B5CF6", // violet
  "#F97316", // orange
  "#22C55E", // green
];

export default function ReceiptSplitter({
  groupId,
  outingId,
  members,
  guests,
  onComplete,
  onCancel,
  initialData,
}: Props) {
  // Steps: -1=enter items, 0=mode, 1=assign items, 2=tip, 3=summary
  const [step, setStep] = useState(initialData?.items.length ? 0 : -1);
  const [splitMode, setSplitMode] = useState<"equal" | "itemize" | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [tipMode, setTipMode] = useState<"proportional" | "equal" | "custom">("proportional");
  const [customTips, setCustomTips] = useState<Record<string, string>>({});
  const [selectAllItem, setSelectAllItem] = useState<string | null>(null);

  // Manual item entry
  const [items, setItems] = useState<ReceiptItem[]>(initialData?.items || []);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<ReceiptItem["category"]>("other");
  const [taxAmount, setTaxAmount] = useState(initialData?.tax?.toString() || "");
  const [tipAmount, setTipAmount] = useState(initialData?.gratuity?.toString() || "");
  const [restaurantName, setRestaurantName] = useState(initialData?.restaurant || "");

  // Guest management
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [localGuests, setLocalGuests] = useState<SplitPerson[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);

  // Build people list from members + guests + local guests
  const people: SplitPerson[] = useMemo(() => {
    const memberPeople = members.map((m, idx) => ({
      id: m.id,
      name: m.display_name || m.full_name || "Unknown",
      color: PERSON_COLORS[idx % PERSON_COLORS.length],
      isGuest: false,
    }));

    const guestPeople = guests.map((g, idx) => ({
      id: g.id,
      name: g.name,
      color: PERSON_COLORS[(members.length + idx) % PERSON_COLORS.length],
      isGuest: true,
    }));

    return [...memberPeople, ...guestPeople, ...localGuests];
  }, [members, guests, localGuests]);

  // Calculate receipt data from items
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = parseFloat(taxAmount) || 0;
  const gratuity = parseFloat(tipAmount) || 0;
  const total = subtotal + tax + gratuity;

  const receiptData: ReceiptData = {
    restaurant: restaurantName || "Receipt",
    date: new Date().toLocaleDateString(),
    items,
    subtotal,
    tax,
    gratuity,
    total,
  };

  const addItem = () => {
    if (!newItemName.trim() || !newItemPrice) return;
    const newItem: ReceiptItem = {
      id: `item_${Date.now()}`,
      name: newItemName.trim(),
      price: parseFloat(newItemPrice) || 0,
      category: newItemCategory,
    };
    setItems((prev) => [...prev, newItem]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemCategory("other");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    // Clean up assignments
    setAssignments((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const addLocalGuest = () => {
    if (!newGuestName.trim()) return;
    const newGuest: SplitPerson = {
      id: `local_${Date.now()}`,
      name: newGuestName.trim(),
      color: PERSON_COLORS[people.length % PERSON_COLORS.length],
      isGuest: true,
    };
    setLocalGuests((prev) => [...prev, newGuest]);
    setNewGuestName("");
    setShowAddGuest(false);
  };

  const removeLocalGuest = (id: string) => {
    setLocalGuests((prev) => prev.filter((g) => g.id !== id));
    // Clean up assignments
    setAssignments((prev) => {
      const updated: Record<string, string[]> = {};
      Object.keys(prev).forEach((itemId) => {
        updated[itemId] = prev[itemId].filter((pid) => pid !== id);
      });
      return updated;
    });
  };

  const toggleAssignment = (itemId: string, personId: string) => {
    setAssignments((prev) => {
      const current = prev[itemId] || [];
      if (current.includes(personId)) {
        return { ...prev, [itemId]: current.filter((id) => id !== personId) };
      }
      return { ...prev, [itemId]: [...current, personId] };
    });
  };

  const assignAllToPerson = (itemId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [itemId]: people.map((p) => p.id),
    }));
    setSelectAllItem(null);
  };

  const clearAssignment = (itemId: string) => {
    setAssignments((prev) => ({ ...prev, [itemId]: [] }));
    setSelectAllItem(null);
  };

  const getPersonSubtotal = useCallback(
    (personId: string) => {
      let total = 0;
      receiptData.items.forEach((item) => {
        const assigned = assignments[item.id] || [];
        if (assigned.includes(personId)) {
          total += item.price / assigned.length;
        }
      });
      return total;
    },
    [assignments, receiptData.items]
  );

  const getPersonTax = useCallback(
    (personId: string) => {
      const sub = getPersonSubtotal(personId);
      if (receiptData.subtotal === 0) return 0;
      return (sub / receiptData.subtotal) * receiptData.tax;
    },
    [getPersonSubtotal, receiptData.subtotal, receiptData.tax]
  );

  const getPersonTip = useCallback(
    (personId: string) => {
      if (tipMode === "equal") return receiptData.gratuity / people.length;
      if (tipMode === "custom") return parseFloat(customTips[personId]) || 0;
      // proportional
      const sub = getPersonSubtotal(personId);
      if (receiptData.subtotal === 0) return 0;
      return (sub / receiptData.subtotal) * receiptData.gratuity;
    },
    [tipMode, customTips, getPersonSubtotal, receiptData.subtotal, receiptData.gratuity, people.length]
  );

  const getPersonTotal = useCallback(
    (personId: string) => {
      return getPersonSubtotal(personId) + getPersonTax(personId) + getPersonTip(personId);
    },
    [getPersonSubtotal, getPersonTax, getPersonTip]
  );

  const allItemsAssigned = receiptData.items.every(
    (item) => (assignments[item.id] || []).length > 0
  );

  const unassignedItems = receiptData.items.filter(
    (item) => (assignments[item.id] || []).length === 0
  );

  const equalPerPerson = receiptData.total / people.length;

  const handleComplete = () => {
    if (splitMode === "equal") {
      const splits = people.map((p) => ({
        [p.isGuest || p.id.startsWith("local_") ? "guest_id" : "user_id"]: p.id,
        amount: Math.round(equalPerPerson * 100) / 100,
      }));
      onComplete({
        description: receiptData.restaurant || "Receipt Split",
        amount: receiptData.total,
        splits,
      });
    } else {
      const splits = people
        .map((p) => {
          const total = getPersonTotal(p.id);
          if (total <= 0) return null;
          return {
            [p.isGuest || p.id.startsWith("local_") ? "guest_id" : "user_id"]: p.id,
            amount: Math.round(total * 100) / 100,
          };
        })
        .filter(Boolean) as { user_id?: string; guest_id?: string; amount: number }[];

      onComplete({
        description: receiptData.restaurant || "Receipt Split",
        amount: receiptData.total,
        splits,
      });
    }
  };

  // Step -1: Enter items manually
  if (step === -1) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center pb-4 border-b border-gray-200">
          <div className="text-4xl mb-2">🧾</div>
          <h2 className="font-heading font-bold text-xl">Enter Receipt Items</h2>
          <p className="text-sm text-slate-medium">Add items from your receipt to split</p>
        </div>

        {/* Restaurant name */}
        <div>
          <label className="block text-sm font-medium text-slate-dark mb-1">
            Restaurant / Description
          </label>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="e.g., Mootz Pizzeria"
            className="input w-full"
          />
        </div>

        {/* Add item form */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-dark">Add Item</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name"
              className="input flex-1 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
            />
            <div className="relative w-24">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-medium text-sm">$</span>
              <input
                type="number"
                step="0.01"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="0.00"
                className="input w-full pl-5 py-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addItem();
                }}
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["drink", "app", "pizza", "entree", "other"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setNewItemCategory(cat)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  newItemCategory === cat
                    ? "bg-electric-cyan text-white"
                    : "bg-white border border-gray-200 text-slate-medium hover:border-electric-cyan"
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span className="capitalize">{cat === "app" ? "Apps" : cat}</span>
              </button>
            ))}
          </div>
          <button
            onClick={addItem}
            disabled={!newItemName.trim() || !newItemPrice}
            className="btn-primary w-full py-2 disabled:opacity-50"
          >
            + Add Item
          </button>
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-dark">
              Items ({items.length})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <span>{CATEGORY_ICONS[item.category]}</span>
                    <span className="font-medium text-slate-dark">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">${item.price.toFixed(2)}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-light hover:text-red-500 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tax and Tip */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-dark mb-1">Tax</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-medium">$</span>
              <input
                type="number"
                step="0.01"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                placeholder="0.00"
                className="input w-full pl-7"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-dark mb-1">Tip / Gratuity</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-medium">$</span>
              <input
                type="number"
                step="0.01"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="0.00"
                className="input w-full pl-7"
              />
            </div>
          </div>
        </div>

        {/* Running total */}
        <div className="bg-slate-dark text-white rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs opacity-60">Subtotal: ${subtotal.toFixed(2)}</p>
            <p className="text-xs opacity-60">Tax + Tip: ${(tax + gratuity).toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-60 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold">${total.toFixed(2)}</p>
          </div>
        </div>

        {/* Continue */}
        <button
          onClick={() => setStep(0)}
          disabled={items.length === 0}
          className="w-full py-4 bg-slate-dark text-white rounded-xl font-bold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {items.length === 0 ? "Add items to continue" : `Continue with ${items.length} items →`}
        </button>

        <button onClick={onCancel} className="btn-ghost w-full">
          Cancel
        </button>
      </div>
    );
  }

  // Step 0: Choose mode
  if (step === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center pb-4 border-b border-gray-200">
          <button
            onClick={() => setStep(-1)}
            className="text-sm text-electric-cyan hover:underline mb-2 block mx-auto"
          >
            ← Edit Items
          </button>
          <div className="text-4xl mb-2">🧾</div>
          <h2 className="font-heading font-bold text-xl">Split the Bill</h2>
          {receiptData.restaurant && (
            <p className="text-slate-medium text-sm mt-1">{receiptData.restaurant}</p>
          )}
          <p className="text-slate-light text-xs">
            {items.length} items · {receiptData.date}
          </p>
          <div className="inline-flex flex-col bg-slate-dark text-white rounded-xl px-6 py-3 mt-4">
            <span className="text-xs uppercase tracking-wider opacity-60">Total</span>
            <span className="text-2xl font-bold">${receiptData.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="space-y-3">
          <p className="font-medium text-slate-dark">How do you want to split this?</p>

          <button
            onClick={() => {
              setSplitMode("equal");
              setStep(3);
            }}
            className="w-full flex items-center gap-4 p-4 bg-bright-white border border-gray-200 rounded-xl hover:border-electric-cyan/50 hover:shadow-md transition-all"
          >
            <span className="text-2xl">⚖️</span>
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-dark">Split Equally</p>
              <p className="text-sm text-slate-medium">
                ${equalPerPerson.toFixed(2)} per person ({people.length} people)
              </p>
            </div>
            <span className="text-slate-light">→</span>
          </button>

          <button
            onClick={() => {
              setSplitMode("itemize");
              setStep(1);
            }}
            className="w-full flex items-center gap-4 p-4 bg-bright-white border border-gray-200 rounded-xl hover:border-electric-cyan/50 hover:shadow-md transition-all"
          >
            <span className="text-2xl">📋</span>
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-dark">Itemize It</p>
              <p className="text-sm text-slate-medium">
                Assign items to people, split shared dishes
              </p>
            </div>
            <span className="text-slate-light">→</span>
          </button>
        </div>

        {/* People Section */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-slate-medium uppercase tracking-wide mb-2">
            Splitting between:
          </p>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-sm"
              >
                {editingName === p.id ? (
                  <input
                    autoFocus
                    className="bg-transparent border-b border-electric-cyan outline-none w-20 text-sm"
                    defaultValue={p.name}
                    onBlur={(e) => {
                      if (p.id.startsWith("local_")) {
                        setLocalGuests((prev) =>
                          prev.map((g) =>
                            g.id === p.id ? { ...g, name: e.target.value } : g
                          )
                        );
                      }
                      setEditingName(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                ) : (
                  <span
                    onClick={() => p.id.startsWith("local_") && setEditingName(p.id)}
                    className={p.id.startsWith("local_") ? "cursor-pointer" : ""}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ background: p.color }}
                    />
                    {p.name}
                    {p.isGuest && (
                      <span className="ml-1 text-xs text-hot-pink bg-hot-pink/10 px-1.5 py-0.5 rounded">
                        guest
                      </span>
                    )}
                  </span>
                )}
                {p.id.startsWith("local_") && (
                  <button
                    onClick={() => removeLocalGuest(p.id)}
                    className="text-slate-light hover:text-red-500 ml-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setShowAddGuest(true)}
              className="flex items-center gap-1 border border-dashed border-gray-300 rounded-full px-3 py-1.5 text-sm text-slate-medium hover:border-electric-cyan hover:text-electric-cyan transition-colors"
            >
              + Add Guest
            </button>
          </div>

          {showAddGuest && (
            <div className="flex gap-2 mt-3">
              <input
                autoFocus
                placeholder="Guest name"
                className="input flex-1 py-2"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addLocalGuest();
                  if (e.key === "Escape") {
                    setShowAddGuest(false);
                    setNewGuestName("");
                  }
                }}
              />
              <button
                onClick={addLocalGuest}
                disabled={!newGuestName.trim()}
                className="btn-primary py-2 px-4 disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddGuest(false);
                  setNewGuestName("");
                }}
                className="text-slate-medium hover:text-slate-dark p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <p className="text-xs text-slate-light mt-2 italic">
            Tap a local guest name to edit
          </p>
        </div>

        {/* Cancel */}
        <button onClick={onCancel} className="btn-ghost w-full">
          Cancel
        </button>
      </div>
    );
  }

  // Step 1: Itemize assignment
  if (step === 1) {
    const categories = ["app", "pizza", "entree", "drink", "other"] as const;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="pb-4 border-b border-gray-200">
          <button
            onClick={() => setStep(0)}
            className="text-sm text-electric-cyan hover:underline mb-2"
          >
            ← Back
          </button>
          <h2 className="font-heading font-bold text-xl">Assign Items</h2>
          <p className="text-sm text-slate-medium">
            Tap people to assign them to each item
          </p>
        </div>

        {/* Progress */}
        {unassignedItems.length > 0 && (
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-electric-cyan to-neon-purple rounded-full transition-all duration-300"
              style={{
                width: `${((receiptData.items.length - unassignedItems.length) / receiptData.items.length) * 100}%`,
              }}
            />
          </div>
        )}

        {/* People bar */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl flex-wrap">
          {people.map((p) => (
            <span
              key={p.id}
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{ background: p.color + "20", color: p.color }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                style={{ background: p.color }}
              />
              {p.name}
            </span>
          ))}
          {!showAddGuest ? (
            <button
              onClick={() => setShowAddGuest(true)}
              className="text-xs border border-dashed border-gray-300 rounded-full px-2 py-1 text-slate-medium hover:border-electric-cyan"
            >
              + Guest
            </button>
          ) : (
            <div className="flex gap-1 items-center">
              <input
                autoFocus
                placeholder="Name"
                className="border border-electric-cyan rounded-lg px-2 py-1 text-xs w-20 outline-none"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addLocalGuest();
                  if (e.key === "Escape") {
                    setShowAddGuest(false);
                    setNewGuestName("");
                  }
                }}
              />
              <button
                onClick={addLocalGuest}
                disabled={!newGuestName.trim()}
                className="bg-slate-dark text-white rounded-lg w-6 h-6 text-sm disabled:opacity-50"
              >
                ✓
              </button>
            </div>
          )}
        </div>

        {/* Items by category */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {categories.map((cat) => {
            const catItems = receiptData.items.filter((i) => i.category === cat);
            if (catItems.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2 pb-1">
                  <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                  <span className="font-semibold text-slate-dark capitalize">
                    {cat === "app" ? "Apps & Sides" : cat === "pizza" ? "Pizzas" : cat === "entree" ? "Entrees" : cat === "drink" ? "Drinks" : "Other"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat]}`}>
                    {catItems.length} items
                  </span>
                </div>

                {catItems.map((item) => {
                  const assigned = assignments[item.id] || [];
                  const isUnassigned = assigned.length === 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl bg-gray-50 border-l-4 ${
                        isUnassigned ? "border-gray-300" : "border-electric-cyan"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-slate-dark text-sm">{item.name}</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-dark">${item.price.toFixed(2)}</span>
                          {assigned.length > 1 && (
                            <span className="block text-xs text-electric-cyan font-medium">
                              → ${(item.price / assigned.length).toFixed(2)} each
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 items-center">
                        {people.map((p) => {
                          const isOn = assigned.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              onClick={() => toggleAssignment(item.id, p.id)}
                              className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                                isOn ? "text-white scale-105" : "bg-gray-200 text-slate-medium"
                              }`}
                              style={isOn ? { background: p.color } : undefined}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </button>
                          );
                        })}
                        <button
                          onClick={() =>
                            selectAllItem === item.id
                              ? setSelectAllItem(null)
                              : setSelectAllItem(item.id)
                          }
                          className="w-8 h-8 rounded-full border border-dashed border-gray-300 text-slate-light hover:border-slate-medium"
                        >
                          ···
                        </button>
                      </div>

                      {selectAllItem === item.id && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-dashed border-gray-200">
                          <button
                            onClick={() => assignAllToPerson(item.id)}
                            className="text-xs px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                          >
                            Everyone
                          </button>
                          <button
                            onClick={() => clearAssignment(item.id)}
                            className="text-xs px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Continue button */}
        <button
          onClick={() => setStep(2)}
          disabled={!allItemsAssigned}
          className={`w-full py-4 rounded-xl font-bold transition-all ${
            allItemsAssigned
              ? "bg-slate-dark text-white hover:bg-slate-900"
              : "bg-gray-200 text-slate-medium cursor-not-allowed"
          }`}
        >
          {allItemsAssigned
            ? "Continue to Tip →"
            : `${unassignedItems.length} item${unassignedItems.length !== 1 ? "s" : ""} unassigned`}
        </button>
      </div>
    );
  }

  // Step 2: Tip options
  if (step === 2) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="pb-4 border-b border-gray-200">
          <button
            onClick={() => setStep(1)}
            className="text-sm text-electric-cyan hover:underline mb-2"
          >
            ← Back
          </button>
          <h2 className="font-heading font-bold text-xl">Gratuity</h2>
          <p className="text-sm text-slate-medium">
            {receiptData.gratuityPercent
              ? `Receipt includes ${receiptData.gratuityPercent}% gratuity `
              : "Tip "}
            (${receiptData.gratuity.toFixed(2)})
          </p>
        </div>

        {/* Tip options */}
        <div className="space-y-2">
          {[
            {
              key: "proportional" as const,
              label: "Based on Items",
              desc: "Tip split by what each person ordered",
              icon: "📊",
            },
            {
              key: "equal" as const,
              label: "Split Equally",
              desc: `$${(receiptData.gratuity / people.length).toFixed(2)} each`,
              icon: "⚖️",
            },
            {
              key: "custom" as const,
              label: "Custom Amount",
              desc: "Set each person's tip manually",
              icon: "✏️",
            },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTipMode(opt.key)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                tipMode === opt.key
                  ? "border-electric-cyan bg-electric-cyan/5"
                  : "border-transparent bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <div className="text-left">
                <p className="font-semibold text-slate-dark">{opt.label}</p>
                <p className="text-sm text-slate-medium">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Custom tips */}
        {tipMode === "custom" && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {people.map((p) => (
              <div key={p.id} className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: p.color }}
                  />
                  {p.name}
                </span>
                <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200">
                  <span className="text-slate-medium text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-16 text-sm font-semibold outline-none bg-transparent"
                    value={customTips[p.id] || ""}
                    onChange={(e) =>
                      setCustomTips((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                  />
                </div>
              </div>
            ))}
            <div className="text-right text-sm text-slate-medium pt-2 border-t border-gray-200">
              Custom total: $
              {Object.values(customTips)
                .reduce((a, b) => a + (parseFloat(b) || 0), 0)
                .toFixed(2)}{" "}
              / ${receiptData.gratuity.toFixed(2)}
            </div>
          </div>
        )}

        {/* Continue */}
        <button
          onClick={() => setStep(3)}
          className="w-full py-4 bg-slate-dark text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
        >
          See Summary →
        </button>
      </div>
    );
  }

  // Step 3: Summary
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200">
        <button
          onClick={() => setStep(splitMode === "equal" ? 0 : 2)}
          className="text-sm text-electric-cyan hover:underline mb-2"
        >
          ← Back
        </button>
        <h2 className="font-heading font-bold text-xl">Bill Summary</h2>
        <p className="text-sm text-slate-medium">
          {receiptData.restaurant} · {receiptData.date}
        </p>
      </div>

      {splitMode === "equal" ? (
        <div className="text-center py-6">
          <div className="text-5xl font-bold text-slate-dark">
            ${equalPerPerson.toFixed(2)}
          </div>
          <p className="text-slate-medium mt-1">per person</p>
          <p className="text-sm text-slate-light">
            ${receiptData.total.toFixed(2)} ÷ {people.length} people
          </p>
          <p className="text-xs text-slate-light mt-1">
            Includes ${receiptData.tax.toFixed(2)} tax + ${receiptData.gratuity.toFixed(2)} gratuity
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mt-6 text-left">
            {people.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: p.color }}
                  />
                  {p.name}
                </span>
                <span className="font-bold">${equalPerPerson.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {people.map((p) => {
            const sub = getPersonSubtotal(p.id);
            const tax = getPersonTax(p.id);
            const tip = getPersonTip(p.id);
            const total = getPersonTotal(p.id);

            if (total <= 0) return null;

            const itemsList = receiptData.items.filter((item) =>
              (assignments[item.id] || []).includes(p.id)
            );

            return (
              <div
                key={p.id}
                className="bg-gray-50 rounded-xl p-4"
                style={{ borderTop: `3px solid ${p.color}` }}
              >
                <div className="font-semibold text-slate-dark flex items-center gap-2 mb-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: p.color }}
                  />
                  {p.name}
                </div>

                <div className="space-y-1 text-sm pb-2 mb-2 border-b border-gray-200">
                  {itemsList.map((item) => {
                    const splitCount = (assignments[item.id] || []).length;
                    return (
                      <div key={item.id} className="flex justify-between text-slate-medium">
                        <span>
                          {CATEGORY_ICONS[item.category]} {item.name}
                          {splitCount > 1 && (
                            <span className="ml-1 text-xs text-electric-cyan font-bold">
                              ÷{splitCount}
                            </span>
                          )}
                        </span>
                        <span>${(item.price / splitCount).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1 text-sm text-slate-medium mb-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${sub.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Tip{" "}
                      <span className="text-xs text-slate-light">
                        ({tipMode === "equal" ? "equal" : tipMode === "custom" ? "custom" : "proportional"})
                      </span>
                    </span>
                    <span>${tip.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-slate-dark pt-2 border-t-2 border-slate-dark">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grand total */}
      <div className="flex justify-between bg-slate-dark text-white rounded-xl px-5 py-4 font-bold text-lg">
        <span>Grand Total</span>
        <span>
          $
          {splitMode === "equal"
            ? receiptData.total.toFixed(2)
            : people.reduce((sum, p) => sum + getPersonTotal(p.id), 0).toFixed(2)}
        </span>
      </div>

      {/* Action buttons */}
      <button
        onClick={handleComplete}
        className="w-full py-4 bg-gradient-to-r from-electric-cyan to-neon-purple text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
      >
        ✓ Add to Group Expenses
      </button>

      <button onClick={onCancel} className="btn-ghost w-full">
        Cancel
      </button>
    </div>
  );
}
