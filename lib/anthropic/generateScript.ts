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

Each section's word count should be close to its target above so the total reads to the target time at the stated pace. Do not include timestamps, stage directions, or explanations - only the spoken words.`;

  const branchBlocks = branches
    .map((b) => `${b.branchLabel.toUpperCase()} (from ${b.directorName}):\n${b.text || "(no content submitted)"}`)
    .join("\n\n");

  const userPrompt = `Here is the selected content for this week's segments.\n\n${branchBlocks}\n\nAI INITIATIVES (self-authored by the RVP):\n${aiInitiativesContent || "(none provided)"}`;

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
