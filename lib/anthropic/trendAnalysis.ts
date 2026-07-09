import { getAnthropicClient } from "./client";

type BranchHistory = {
  branch: string;
  branchLabel: string;
  directorName: string;
  weeks: { weekStart: string; positives: string; challenges: string; narrative: string }[];
};

export type TrendResult = {
  branchThemes: { branch: string; branchLabel: string; themes: string[] }[];
  crossBranchFlags: string[];
};

export async function analyzeTrends(params: {
  branches: BranchHistory[];
  includeCrossBranch: boolean;
}): Promise<TrendResult> {
  const { branches, includeCrossBranch } = params;

  if (branches.length === 0 || branches.every((b) => b.weeks.length === 0)) {
    return { branchThemes: [], crossBranchFlags: [] };
  }

  const systemPrompt = `You analyze weekly branch status reports for a Regional VP to surface patterns over time. Work ONLY from the reports provided - never invent facts, deals, names, or numbers. Be concrete and specific, and name the branch.

For each branch, identify recurring themes across its weeks: challenges that keep reappearing, ongoing wins, situations that are dragging on, or shifts over time. ${
    includeCrossBranch
      ? "Also identify cross-branch flags: a specific issue or theme that shows up at two or more DIFFERENT branches in a similar timeframe (e.g. multiple branches independently reporting the same operational problem) - the kind of pattern that could signal a systemic/corporate issue worth investigating."
      : ""
  }

Respond with ONLY a JSON object, no other text:
{
  "branch_themes": [ { "branch": "<branch key>", "themes": ["short phrase", "short phrase"] } ]${
    includeCrossBranch ? ',\n  "cross_branch_flags": ["short specific phrase naming the branches involved"]' : ""
  }
}
Keep each theme to a short phrase. If a branch shows no meaningful recurring pattern, give it an empty themes array.${
    includeCrossBranch ? " If there are no genuine cross-branch patterns, use an empty array." : ""
  }`;

  const branchBlocks = branches
    .map((b) => {
      const weeks = b.weeks
        .map(
          (w) =>
            `  Week of ${w.weekStart}: Positives: ${w.positives || "-"} | Challenges: ${w.challenges || "-"} | Narrative: ${w.narrative || "-"}`
        )
        .join("\n");
      return `BRANCH ${b.branchLabel} (key: ${b.branch}, director ${b.directorName}):\n${weeks || "  (no reports)"}`;
    })
    .join("\n\n");

  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: branchBlocks }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const labelByKey = new Map(branches.map((b) => [b.branch, b.branchLabel]));
    return {
      branchThemes: Array.isArray(parsed.branch_themes)
        ? parsed.branch_themes.map((t: any) => ({
            branch: t.branch,
            branchLabel: labelByKey.get(t.branch) ?? t.branch,
            themes: Array.isArray(t.themes) ? t.themes : [],
          }))
        : [],
      crossBranchFlags:
        includeCrossBranch && Array.isArray(parsed.cross_branch_flags) ? parsed.cross_branch_flags : [],
    };
  } catch {
    return { branchThemes: [], crossBranchFlags: [] };
  }
}
