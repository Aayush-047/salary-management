import { invalid } from "./errors.js";

/*
 * Business rules about dates and promotions. Pure functions over YYYY-MM-DD strings, which
 * compare correctly as plain strings. They throw a DomainError (422) when a rule is broken.
 */

/** A pay entry must fall within employment and must not be in the future. */
export function checkPayEntryDate(input: {
  effectiveDate: string;
  hireDate: string;
  terminationDate: string | null;
  today: string;
}): void {
  const { effectiveDate, hireDate, terminationDate, today } = input;
  if (effectiveDate > today) {
    throw invalid("FUTURE_DATE", `Effective date ${effectiveDate} is in the future`);
  }
  if (effectiveDate < hireDate) {
    throw invalid(
      "BEFORE_HIRE_DATE",
      `Effective date ${effectiveDate} is before the hire date ${hireDate}`,
    );
  }
  if (terminationDate && effectiveDate > terminationDate) {
    throw invalid(
      "AFTER_TERMINATION_DATE",
      `Effective date ${effectiveDate} is after the termination date ${terminationDate}`,
    );
  }
}

/** A promotion changes level and/or title, and never lowers the level. */
export function checkPromotion(input: {
  currentLevel: number;
  newLevel: number | undefined;
  currentJobTitle: string;
  newJobTitle: string | undefined;
}): void {
  const { currentLevel, newLevel, currentJobTitle, newJobTitle } = input;
  if (newLevel !== undefined && newLevel < currentLevel) {
    throw invalid(
      "PROMOTION_LOWERS_LEVEL",
      `A promotion cannot lower the level (L${currentLevel} → L${newLevel})`,
    );
  }
  const levelChanges = newLevel !== undefined && newLevel !== currentLevel;
  const titleChanges = newJobTitle !== undefined && newJobTitle !== currentJobTitle;
  if (!levelChanges && !titleChanges) {
    throw invalid("PROMOTION_WITHOUT_CHANGE", "A promotion must change the level or job title");
  }
}

/** Termination happens after the latest pay change, and not in the future. */
export function checkTerminationDate(input: {
  terminationDate: string;
  latestEntryDate: string;
  today: string;
}): void {
  const { terminationDate, latestEntryDate, today } = input;
  if (terminationDate > today) {
    throw invalid("FUTURE_DATE", `Termination date ${terminationDate} is in the future`);
  }
  if (terminationDate < latestEntryDate) {
    throw invalid(
      "BEFORE_LATEST_PAY_CHANGE",
      `Termination date ${terminationDate} is before the latest pay change on ${latestEntryDate}`,
    );
  }
}

/**
 * The hire date is also the date of the HIRE pay entry, so it must stay before every later
 * pay change, before any termination, and not in the future.
 */
export function checkHireDateChange(input: {
  newHireDate: string;
  firstChangeDate: string | null;
  terminationDate: string | null;
  today: string;
}): void {
  const { newHireDate, firstChangeDate, terminationDate, today } = input;
  if (newHireDate > today) {
    throw invalid("FUTURE_DATE", `Hire date ${newHireDate} is in the future`);
  }
  if (firstChangeDate && newHireDate >= firstChangeDate) {
    throw invalid(
      "HIRE_AFTER_PAY_CHANGE",
      `Hire date ${newHireDate} must be before the first pay change on ${firstChangeDate}`,
    );
  }
  if (terminationDate && newHireDate > terminationDate) {
    throw invalid(
      "HIRE_AFTER_TERMINATION",
      `Hire date ${newHireDate} is after the termination date ${terminationDate}`,
    );
  }
}

/**
 * A new pay change is dated after the latest existing entry. Changes are recorded in order;
 * fixing a past entry is a correction. This keeps currencies consistent across relocations and
 * guarantees the new entry becomes current pay.
 */
export function checkAfterLatestEntry(input: {
  effectiveDate: string;
  latestEntryDate: string;
}): void {
  const { effectiveDate, latestEntryDate } = input;
  if (effectiveDate <= latestEntryDate) {
    throw invalid(
      "NOT_AFTER_LATEST_ENTRY",
      `Effective date ${effectiveDate} must be after the latest pay change on ${latestEntryDate}; to fix an earlier entry, correct it instead`,
    );
  }
}

/** A corrected date stays strictly between the neighbouring entries, so the order never changes. */
export function checkBetweenNeighbours(input: {
  effectiveDate: string;
  previousDate: string | null;
  nextDate: string | null;
}): void {
  const { effectiveDate, previousDate, nextDate } = input;
  if (previousDate && effectiveDate <= previousDate) {
    throw invalid(
      "NOT_AFTER_PREVIOUS_ENTRY",
      `Effective date ${effectiveDate} must be after the previous pay entry on ${previousDate}`,
    );
  }
  if (nextDate && effectiveDate >= nextDate) {
    throw invalid(
      "NOT_BEFORE_NEXT_ENTRY",
      `Effective date ${effectiveDate} must be before the next pay entry on ${nextDate}`,
    );
  }
}
