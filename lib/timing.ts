// Splits the total talk time across segments: intro and AI get fixed reservations,
// and whatever remains is divided evenly across the active branches. More branches
// therefore means less time (and fewer words) per branch, all summing to the total.

export type TimeAllocation = {
  introSeconds: number;
  aiSeconds: number;
  perBranchSeconds: number;
  branchCount: number;
};

export function allocateTime(
  totalSeconds: number,
  introSeconds: number,
  aiSeconds: number,
  branchCount: number
): TimeAllocation {
  const remaining = Math.max(0, totalSeconds - introSeconds - aiSeconds);
  const perBranchSeconds = branchCount > 0 ? Math.floor(remaining / branchCount) : 0;
  return { introSeconds, aiSeconds, perBranchSeconds, branchCount };
}

export function wordTarget(seconds: number, wordsPerMinute: number): number {
  return Math.round((seconds / 60) * wordsPerMinute);
}
