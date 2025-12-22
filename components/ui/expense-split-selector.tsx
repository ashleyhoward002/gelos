"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TripDependent, FamilyUnitData } from "@/lib/dependents";
import {
  AgeGroup,
  AGE_GROUPS,
  getAgeGroupConfig,
  formatCurrency,
  AgePricing,
  DEFAULT_AGE_PRICING,
} from "@/lib/dependent-constants";

export interface SplitPerson {
  id: string;
  type: "member" | "dependent";
  name: string;
  ageGroup: AgeGroup;
  responsibleMemberId: string;
  responsibleMemberName: string;
}

export interface SplitSelection {
  personId: string;
  personType: "member" | "dependent";
  ageGroup: AgeGroup;
  responsibleMemberId: string;
  amount: number;
}

interface ExpenseSplitSelectorProps {
  familyUnits: FamilyUnitData[];
  currentUserId: string;
  totalAmount: number;
  currency?: string;
  initialSelections?: SplitSelection[];
  splitMode?: "equal" | "by_person" | "by_family" | "custom";
  useAgePricing?: boolean;
  agePricing?: AgePricing;
  onChange?: (selections: SplitSelection[], summary: SplitSummary) => void;
}

export interface MemberSplitSummary {
  memberId: string;
  memberName: string;
  totalAmount: number;
  breakdown: {
    personId: string;
    personName: string;
    ageGroup: AgeGroup;
    amount: number;
  }[];
}

export interface SplitSummary {
  totalPeople: number;
  totalAmount: number;
  byMember: MemberSplitSummary[];
}

export function ExpenseSplitSelector({
  familyUnits,
  currentUserId,
  totalAmount,
  currency = "USD",
  initialSelections = [],
  splitMode = "by_person",
  useAgePricing = false,
  agePricing = DEFAULT_AGE_PRICING,
  onChange,
}: ExpenseSplitSelectorProps) {
  // Track selected people
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelections.map((s) => `${s.personType}-${s.personId}`))
  );
  const [pricingMode, setPricingMode] = useState<"same" | "age">(useAgePricing ? "age" : "same");
  const [basePrice, setBasePrice] = useState(totalAmount);
  const [customPricing, setCustomPricing] = useState<AgePricing>(agePricing);

  // Build flat list of all selectable people
  const allPeople = useMemo<SplitPerson[]>(() => {
    const people: SplitPerson[] = [];

    familyUnits.forEach((unit) => {
      // Add member
      people.push({
        id: unit.member.id,
        type: "member",
        name: unit.member.display_name || unit.member.full_name || "Member",
        ageGroup: "adult",
        responsibleMemberId: unit.member.id,
        responsibleMemberName: unit.member.display_name || unit.member.full_name || "Member",
      });

      // Add dependents
      unit.dependents.forEach((dep) => {
        people.push({
          id: dep.id,
          type: "dependent",
          name: dep.name,
          ageGroup: dep.age_group,
          responsibleMemberId: unit.member.id,
          responsibleMemberName: unit.member.display_name || unit.member.full_name || "Member",
        });
      });
    });

    return people;
  }, [familyUnits]);

  // Toggle a person's selection
  const togglePerson = (person: SplitPerson) => {
    const key = `${person.type}-${person.id}`;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle entire family unit
  const toggleFamily = (unit: FamilyUnitData, selectAll: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      // Member key
      const memberKey = `member-${unit.member.id}`;
      if (selectAll) {
        next.add(memberKey);
      } else {
        next.delete(memberKey);
      }

      // Dependent keys
      unit.dependents.forEach((dep) => {
        const depKey = `dependent-${dep.id}`;
        if (selectAll) {
          next.add(depKey);
        } else {
          next.delete(depKey);
        }
      });

      return next;
    });
  };

  // Check if person is selected
  const isSelected = (person: SplitPerson) => {
    return selectedIds.has(`${person.type}-${person.id}`);
  };

  // Check if entire family is selected
  const isFamilyFullySelected = (unit: FamilyUnitData) => {
    const memberKey = `member-${unit.member.id}`;
    if (!selectedIds.has(memberKey)) return false;

    return unit.dependents.every((dep) =>
      selectedIds.has(`dependent-${dep.id}`)
    );
  };

  // Check if any from family is selected
  const isFamilyPartiallySelected = (unit: FamilyUnitData) => {
    const memberKey = `member-${unit.member.id}`;
    if (selectedIds.has(memberKey)) return true;

    return unit.dependents.some((dep) =>
      selectedIds.has(`dependent-${dep.id}`)
    );
  };

  // Calculate amounts based on pricing mode
  const calculatePersonAmount = (person: SplitPerson): number => {
    if (pricingMode === "same") {
      return basePrice / selectedIds.size;
    } else {
      // Age-based pricing
      return basePrice * customPricing[person.ageGroup];
    }
  };

  // Generate summary
  const summary = useMemo<SplitSummary>(() => {
    const selectedPeople = allPeople.filter((p) => isSelected(p));

    // Group by responsible member
    const byMemberMap = new Map<string, MemberSplitSummary>();

    selectedPeople.forEach((person) => {
      let memberSummary = byMemberMap.get(person.responsibleMemberId);
      if (!memberSummary) {
        memberSummary = {
          memberId: person.responsibleMemberId,
          memberName: person.responsibleMemberName,
          totalAmount: 0,
          breakdown: [],
        };
        byMemberMap.set(person.responsibleMemberId, memberSummary);
      }

      const amount = calculatePersonAmount(person);
      memberSummary.breakdown.push({
        personId: person.id,
        personName: person.name,
        ageGroup: person.ageGroup,
        amount,
      });
      memberSummary.totalAmount += amount;
    });

    const byMember = Array.from(byMemberMap.values());
    const totalCalculated = byMember.reduce((sum, m) => sum + m.totalAmount, 0);

    return {
      totalPeople: selectedPeople.length,
      totalAmount: totalCalculated,
      byMember,
    };
  }, [selectedIds, pricingMode, basePrice, customPricing, allPeople]);

  // Notify parent of changes
  useEffect(() => {
    const selections: SplitSelection[] = allPeople
      .filter((p) => isSelected(p))
      .map((p) => ({
        personId: p.id,
        personType: p.type,
        ageGroup: p.ageGroup,
        responsibleMemberId: p.responsibleMemberId,
        amount: calculatePersonAmount(p),
      }));

    onChange?.(selections, summary);
  }, [selectedIds, pricingMode, basePrice, customPricing]);

  return (
    <div className="space-y-5">
      {/* Pricing Mode */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <label className="text-sm font-medium mb-3 block">Pricing</label>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="pricingMode"
              checked={pricingMode === "same"}
              onChange={() => setPricingMode("same")}
              className="w-4 h-4"
            />
            <span>Same price for everyone:</span>
            <div className="relative flex-1 max-w-[120px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                className="input w-full pl-7 text-sm"
                disabled={pricingMode !== "same"}
              />
            </div>
            <span className="text-sm text-muted-foreground">per person</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="pricingMode"
              checked={pricingMode === "age"}
              onChange={() => setPricingMode("age")}
              className="w-4 h-4 mt-1"
            />
            <div className="flex-1">
              <span>Different pricing by age:</span>
              {pricingMode === "age" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-3 grid grid-cols-2 gap-2"
                >
                  {AGE_GROUPS.map((ag) => (
                    <div key={ag.id} className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded flex items-center justify-center text-xs"
                        style={{ backgroundColor: ag.bgColor, color: ag.color }}
                      >
                        {ag.icon}
                      </span>
                      <span className="text-sm">{ag.label}:</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                        <input
                          type="number"
                          value={basePrice * customPricing[ag.id]}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setCustomPricing((prev) => ({
                              ...prev,
                              [ag.id]: value / basePrice,
                            }));
                          }}
                          className="input w-full pl-5 text-sm py-1"
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* People Selection */}
      <div>
        <label className="text-sm font-medium mb-3 block">
          Who&apos;s included in this expense?
        </label>

        <div className="space-y-3">
          {familyUnits.map((unit) => {
            const fullySelected = isFamilyFullySelected(unit);
            const partiallySelected = isFamilyPartiallySelected(unit);
            const memberName = unit.member.display_name || unit.member.full_name || "Member";
            const isCurrentUser = unit.member.id === currentUserId;

            return (
              <div key={unit.member.id} className="rounded-lg border border-border overflow-hidden">
                {/* Family header */}
                <div
                  className={`
                    flex items-center justify-between p-3 cursor-pointer transition-colors
                    ${fullySelected ? "bg-primary/5" : "bg-card hover:bg-muted/50"}
                  `}
                  onClick={() => toggleFamily(unit, !fullySelected)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                        ${fullySelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : partiallySelected
                          ? "border-primary bg-primary/20"
                          : "border-muted-foreground/30"
                        }
                      `}
                    >
                      {fullySelected && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {partiallySelected && !fullySelected && (
                        <div className="w-2 h-2 bg-primary rounded-sm" />
                      )}
                    </div>
                    <span className="font-medium">
                      {memberName}&apos;s Group
                      {isCurrentUser && <span className="text-muted-foreground ml-1">(You)</span>}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({unit.totalPeople})
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFamily(unit, !fullySelected);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {fullySelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {/* Family members */}
                <div className="px-3 pb-3 space-y-1">
                  {/* The member themselves */}
                  <PersonRow
                    person={allPeople.find((p) => p.type === "member" && p.id === unit.member.id)!}
                    isSelected={selectedIds.has(`member-${unit.member.id}`)}
                    amount={pricingMode === "same"
                      ? basePrice / selectedIds.size
                      : basePrice * customPricing.adult
                    }
                    currency={currency}
                    showAmount={selectedIds.has(`member-${unit.member.id}`)}
                    onToggle={() => {
                      const p = allPeople.find((p) => p.type === "member" && p.id === unit.member.id);
                      if (p) togglePerson(p);
                    }}
                  />

                  {/* Dependents */}
                  {unit.dependents.map((dep) => {
                    const person = allPeople.find((p) => p.type === "dependent" && p.id === dep.id);
                    if (!person) return null;

                    return (
                      <PersonRow
                        key={dep.id}
                        person={person}
                        isSelected={selectedIds.has(`dependent-${dep.id}`)}
                        amount={pricingMode === "same"
                          ? basePrice / selectedIds.size
                          : basePrice * customPricing[dep.age_group]
                        }
                        currency={currency}
                        showAmount={selectedIds.has(`dependent-${dep.id}`)}
                        onToggle={() => togglePerson(person)}
                        indent
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {summary.totalPeople > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <h4 className="font-medium mb-3">Split Summary</h4>
          <div className="space-y-3">
            {summary.byMember.map((member) => (
              <div key={member.memberId}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{member.memberName} owes:</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(member.totalAmount, currency)}
                  </span>
                </div>
                <div className="ml-4 text-sm text-muted-foreground">
                  {member.breakdown.map((b) => (
                    <div key={b.personId} className="flex justify-between">
                      <span>• {b.personName} ({getAgeGroupConfig(b.ageGroup).shortLabel.toLowerCase()})</span>
                      <span>{formatCurrency(b.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-amber-200 flex justify-between">
            <span className="font-medium">Total:</span>
            <span className="font-bold">{formatCurrency(summary.totalAmount, currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Person row component
function PersonRow({
  person,
  isSelected,
  amount,
  currency,
  showAmount,
  onToggle,
  indent = false,
}: {
  person: SplitPerson;
  isSelected: boolean;
  amount: number;
  currency: string;
  showAmount: boolean;
  onToggle: () => void;
  indent?: boolean;
}) {
  const ageConfig = getAgeGroupConfig(person.ageGroup);

  return (
    <div
      className={`
        flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors
        ${indent ? "ml-6" : ""}
        ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"}
      `}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <div
          className={`
            w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
            ${isSelected
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/30"
            }
          `}
        >
          {isSelected && (
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
          style={{ backgroundColor: ageConfig.bgColor, color: ageConfig.color }}
        >
          {ageConfig.icon}
        </span>
        <span className={isSelected ? "" : "text-muted-foreground"}>
          {person.name}
          <span className="text-xs text-muted-foreground ml-1">
            ({ageConfig.shortLabel.toLowerCase()})
          </span>
        </span>
      </div>

      {showAmount && (
        <span className="text-sm font-medium">
          {formatCurrency(amount, currency)}
        </span>
      )}
    </div>
  );
}

export default ExpenseSplitSelector;
