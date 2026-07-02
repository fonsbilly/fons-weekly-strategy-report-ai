import { getAnthropicClient } from "./client";

type SegmentSeconds = {
  intro: number;
  detroit: number;
  grand_rapids: number;
  indy: number;
  ai_initiatives: number;
};

type BranchContent = {
  branchLabel: string;
  directorName: string;
  status: "current" | "history" | "none";
  text: string;
};

export async function generateScript(params: {
  styleGuide: string;
  wordsPerMinute: number;
  segmentSeconds: SegmentSeconds;
  totalTargetSeconds: number;
  branches: BranchContent[];
  aiInitiativesContent: string;
}): Promise<string> {
  const { styleGuide, wordsPerMinute, segmentSeconds, totalTargetSeconds, branches, aiInitiativesContent } =
    params;

  const wordTarget = (seconds: number) => Math.round((seconds / 60) * wordsPerMinute);

  const systemPrompt = `${styleGuide || "Write in a direct, plain-spoken, upbeat voice."}

You are drafting a spoken script for a Monday all-company Teams call. The script has these timed segments, read at ${wordsPerMinute} words per minute:
INTRO: ${segmentSeconds.intro} seconds (~${wordTarget(segmentSeconds.intro)} words)
DETROIT: ${segmentSeconds.detroit} seconds (~${wordTarget(segmentSeconds.detroit)} words)
GRAND RAPIDS: ${segmentSeconds.grand_rapids} seconds (~${wordTarget(segmentSeconds.grand_rapids)} words)
INDY: ${segmentSeconds.indy} seconds (~${wordTarget(segmentSeconds.indy)} words)
AI: ${segmentSeconds.ai_initiatives} seconds (~${wordTarget(segmentSeconds.ai_initiatives)} words)
Total target time: ${totalTargetSeconds} seconds.

Each branch segment below is marked with a status:
- CURRENT: real content submitted this week. Write the segment normally, hitting close to its word target.
- HISTORY: no new report was submitted this week. You are given that director's reports from recent prior weeks (oldest to newest). Synthesize a brief continuation/update from this - phrase it as an ongoing status (e.g. "as previously mentioned..." or "still working through..."), not as fresh news, and do not present old information as if it happened this week. Keep it noticeably shorter than a CURRENT segment.
- NONE: no submission this week and no history to draw on. Do NOT invent any facts, numbers, deals, names, or events for this segment under any circumstances. Write exactly one brief, generic sentence noting no update came in this week, and nothing more.

Output the script as plain text broken into labeled sections exactly like this format:
INTRO
<paragraph>

DETROIT
<paragraph>

GRAND RAPIDS
<paragraph>

INDY
<paragraph>

AI
<paragraph>

If a branch's director is not listed below, omit that section's paragraph entirely and just note briefly there is no update. Do not include timestamps, stage directions, or explanations - only the spoken words.`;

  const branchBlocks = branches
    .map((b) => {
      if (b.status === "none") {
        return `${b.branchLabel.toUpperCase()} (from ${b.directorName}) - STATUS: NONE. No submission this week, no history available.`;
      }
      if (b.status === "history") {
        return `${b.branchLabel.toUpperCase()} (from ${b.directorName}) - STATUS: HISTORY. No new report this week. Recent prior weeks:\n${b.text || "(no history available)"}`;
      }
      return `${b.branchLabel.toUpperCase()} (from ${b.directorName}) - STATUS: CURRENT.\n${b.text || "(no content selected)"}`;
    })
    .join("\n\n");

  const userPrompt = `Here is the content for this week's segments.\n\n${branchBlocks}\n\nAI INITIATIVES (self-authored by the RVP):\n${aiInitiativesContent || "(none provided)"}`;

  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
