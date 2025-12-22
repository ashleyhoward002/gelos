// Dependent constants - shared between client and server

export type DependentType = "child" | "spouse" | "partner" | "friend" | "friends_child" | "other_family" | "other";
export type AgeGroup = "adult" | "teen" | "child" | "infant";

export interface DependentTypeConfig {
  id: DependentType;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export interface AgeGroupConfig {
  id: AgeGroup;
  label: string;
  shortLabel: string;
  ageRange: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const DEPENDENT_TYPES: DependentTypeConfig[] = [
  { id: "child", label: "Child (my kid)", shortLabel: "Child", icon: "👶", description: "Your own child" },
  { id: "spouse", label: "Spouse/Partner", shortLabel: "Spouse", icon: "💑", description: "Your spouse or partner" },
  { id: "partner", label: "Partner", shortLabel: "Partner", icon: "💕", description: "Your significant other" },
  { id: "friend", label: "Friend (adult)", shortLabel: "Friend", icon: "🧑", description: "An adult friend traveling with you" },
  { id: "friends_child", label: "Friend's Child", shortLabel: "Friend's Kid", icon: "👧", description: "A friend's child you're responsible for" },
  { id: "other_family", label: "Other Family", shortLabel: "Family", icon: "👨‍👩‍👧", description: "Other family member" },
  { id: "other", label: "Other", shortLabel: "Other", icon: "👤", description: "Someone else" },
];

export const AGE_GROUPS: AgeGroupConfig[] = [
  { id: "adult", label: "Adult", shortLabel: "Adult", ageRange: "18+", icon: "🧑", color: "#3B82F6", bgColor: "#DBEAFE" },
  { id: "teen", label: "Teen", shortLabel: "Teen", ageRange: "13-17", icon: "🧒", color: "#8B5CF6", bgColor: "#EDE9FE" },
  { id: "child", label: "Child", shortLabel: "Child", ageRange: "3-12", icon: "👶", color: "#F97316", bgColor: "#FFEDD5" },
  { id: "infant", label: "Infant", shortLabel: "Infant", ageRange: "0-2", icon: "👼", color: "#EC4899", bgColor: "#FCE7F3" },
];

export function getDependentTypeConfig(type: DependentType): DependentTypeConfig {
  return DEPENDENT_TYPES.find((t) => t.id === type) || DEPENDENT_TYPES[DEPENDENT_TYPES.length - 1];
}

export function getAgeGroupConfig(ageGroup: AgeGroup): AgeGroupConfig {
  return AGE_GROUPS.find((a) => a.id === ageGroup) || AGE_GROUPS[0];
}

// Infer age group from actual age
export function inferAgeGroup(age: number | null | undefined): AgeGroup {
  if (age === null || age === undefined) return "adult";
  if (age < 3) return "infant";
  if (age < 13) return "child";
  if (age < 18) return "teen";
  return "adult";
}

// Infer age group from dependent type (default guess)
export function defaultAgeGroupForType(type: DependentType): AgeGroup {
  switch (type) {
    case "child":
    case "friends_child":
      return "child";
    case "spouse":
    case "partner":
    case "friend":
      return "adult";
    case "other_family":
    case "other":
    default:
      return "adult";
  }
}

// Format display for dependent
export function formatDependentDisplay(
  name: string,
  type: DependentType,
  ageGroup: AgeGroup,
  age?: number | null
): string {
  const ageGroupConfig = getAgeGroupConfig(ageGroup);
  const ageStr = age ? `, ${age}` : "";
  return `${name} (${ageGroupConfig.shortLabel.toLowerCase()}${ageStr})`;
}

// Default pricing multipliers by age group
export interface AgePricing {
  adult: number;
  teen: number;
  child: number;
  infant: number;
}

export const DEFAULT_AGE_PRICING: AgePricing = {
  adult: 1.0,    // 100%
  teen: 0.75,    // 75%
  child: 0.5,    // 50%
  infant: 0,     // free
};

// Calculate total for a group based on age pricing
export function calculateGroupTotal(
  basePrice: number,
  peopleCounts: { adult: number; teen: number; child: number; infant: number },
  agePricing: AgePricing = DEFAULT_AGE_PRICING
): number {
  return (
    basePrice * agePricing.adult * peopleCounts.adult +
    basePrice * agePricing.teen * peopleCounts.teen +
    basePrice * agePricing.child * peopleCounts.child +
    basePrice * agePricing.infant * peopleCounts.infant
  );
}

// Format currency
export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Count people by age group
export interface PeopleByAgeGroup {
  adult: number;
  teen: number;
  child: number;
  infant: number;
  total: number;
}

export function countByAgeGroup(
  ageGroups: AgeGroup[],
  includeResponsibleMember: boolean = true
): PeopleByAgeGroup {
  const counts = {
    adult: includeResponsibleMember ? 1 : 0, // Responsible member is always adult
    teen: 0,
    child: 0,
    infant: 0,
    total: includeResponsibleMember ? 1 : 0,
  };

  ageGroups.forEach((ag) => {
    counts[ag]++;
    counts.total++;
  });

  return counts;
}

// Grouping helper for family units
export interface FamilyUnit {
  memberId: string;
  memberName: string;
  memberAvatar?: string | null;
  isCurrentUser: boolean;
  dependents: {
    id: string;
    name: string;
    type: DependentType;
    ageGroup: AgeGroup;
    age?: number | null;
    notes?: string | null;
  }[];
  totalPeople: number;
}

// Build family units from members and dependents
export function buildFamilyUnits(
  members: {
    id: string;
    display_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  }[],
  dependents: {
    id: string;
    name: string;
    type: DependentType;
    age_group: AgeGroup;
    age?: number | null;
    notes?: string | null;
    responsible_member: string;
  }[],
  currentUserId?: string
): FamilyUnit[] {
  return members.map((member) => {
    const memberDependents = dependents.filter(
      (d) => d.responsible_member === member.id
    );

    return {
      memberId: member.id,
      memberName: member.display_name || member.full_name || "Member",
      memberAvatar: member.avatar_url,
      isCurrentUser: member.id === currentUserId,
      dependents: memberDependents.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        ageGroup: d.age_group,
        age: d.age,
        notes: d.notes,
      })),
      totalPeople: 1 + memberDependents.length,
    };
  });
}
