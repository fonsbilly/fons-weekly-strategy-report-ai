import { getAnthropicClient } from "./client";

type PriorSubmission = {
  weekStart: string;
  positives: string;
  challenges: string;
  narrative: string;
};

export type DuplicateResult = {
  isSimilar: boolean;
  similarWeekStarts: string[];
  explanation: string;
};

export async function checkDuplicate(params: {
  newPositives: string;
  newChallenges: string;
  newNarrative: string;
  prior: PriorSubmission[];
}): Promise<DuplicateResult> {
  const { newPositives, newChallenges, newNarrative, prior } = params;

  if (prior.length === 0) {
    return { isSimilar: false, similarWeekStarts: [], explanation: "" };
  }

  const systemPrompt = `You help a Regional VP's direct reports avoid re-reporting stale content in their weekly status updates. You will be shown a NEW submission and a list of that SAME director's PRIOR submissions (most recent first). Decide whether the new submission's content is substantially similar in substance to any prior week(s) - recycled facts or situations without meaningful new information, not merely similar wording on genuinely new events.

Respond with ONLY a JSON object, no other text, matching:
{"is_similar": boolean, "similar_week_starts": string[], "explanation": string}

Keep the explanation to one short sentence. If not similar, use an empty array and empty explanation.`;

  const priorBlocks = prior
    .map(
      (p) =>
        `Week of ${p.weekStart}:\nPositives: ${p.positives}\nChallenges: ${p.challenges}\nNarrative: ${p.narrative}`
    )
    .join("\n\n");

  const userPrompt = `NEW SUBMISSION:\nPositives: ${newPositives}\nChallenges: ${newChallenges}\nNarrative: ${newNarrative}\n\nPRIOR SUBMISSIONS (same director, most recent first):\n${priorBlocks}`;

  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return {
      isSimilar: Boolean(parsed.is_similar),
      similarWeekStarts: Array.isArray(parsed.similar_week_starts) ? parsed.similar_week_starts : [],
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
    };
  } catch {
    // If the model returns unparseable output, fail open (don't block submission).
    return { isSimilar: false, similarWeekStarts: [], explanation: "" };
  }
}
