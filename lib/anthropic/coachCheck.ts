import { getAnthropicClient } from "./client";

export type CoachResult = { needsAttention: boolean; message: string };

export async function coachCheck(params: {
  generalGuidance: string;
  focusNotes: string;
  positives: string;
  challenges: string;
  narrative: string;
}): Promise<CoachResult> {
  const { generalGuidance, focusNotes, positives, challenges, narrative } = params;

  if (!generalGuidance.trim() && !focusNotes.trim()) {
    return { needsAttention: false, message: "" };
  }

  const system = `You help a Regional VP coach their branch directors on their weekly reports. You are given the RVP's standing coaching guidance (applies to everyone) and specific focus notes for THIS director, plus the director's new weekly submission.

Decide whether the submission misses something the RVP has asked this director to cover, or clearly falls short of the guidance (for example, staying vague where specifics were requested, or omitting a topic the RVP wants addressed every week). If so, write ONE short, friendly, specific nudge addressed to the director - as if it's coming from their RVP - prompting them to add or clarify it before they submit.

Only flag genuine gaps tied to the guidance or focus notes. If the submission adequately covers what the RVP asked for, do NOT flag it.

Respond with ONLY a JSON object, no other text:
{"needs_attention": boolean, "message": string}
Keep message to one or two sentences. Use an empty string when not flagged.`;

  const user = `RVP GENERAL GUIDANCE:
${generalGuidance || "(none)"}

FOCUS NOTES FOR THIS DIRECTOR:
${focusNotes || "(none)"}

DIRECTOR'S NEW SUBMISSION:
Positives: ${positives || "(empty)"}
Challenges: ${challenges || "(empty)"}
Narrative: ${narrative || "(empty)"}`;

  const client = getAnthropicClient();
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: user }],
  });

  const block = msg.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";

  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : raw);
    return {
      needsAttention: Boolean(parsed.needs_attention),
      message: typeof parsed.message === "string" ? parsed.message : "",
    };
  } catch {
    return { needsAttention: false, message: "" };
  }
}
