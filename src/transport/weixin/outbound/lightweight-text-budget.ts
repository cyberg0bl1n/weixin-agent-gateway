const DIRECT_SEND_LIMIT = 5;
const BATCH_SEND_LIMIT = 9;
const TOTAL_SEND_LIMIT = 10;
const BATCH_SIZE = 3;

function normalizeText(text: string | undefined): string | undefined {
  const normalized = text?.trim();
  return normalized ? normalized : undefined;
}

function joinTextParts(parts: string[]): string | undefined {
  const normalized = parts
    .map((part) => normalizeText(part))
    .filter((part): part is string => Boolean(part));
  if (!normalized.length) return undefined;
  return normalized.join("\n\n");
}

export type LightweightTextReplyBudgeter = {
  pushProgress: (text: string) => Promise<void>;
  finish: (finalText?: string) => Promise<void>;
};

export function createLightweightTextReplyBudgeter(params: {
  sendText: (text: string) => Promise<void>;
}): LightweightTextReplyBudgeter {
  const pendingParts: string[] = [];
  let sentCount = 0;

  async function sendText(text: string | undefined): Promise<void> {
    const normalized = normalizeText(text);
    if (!normalized) return;
    if (sentCount >= TOTAL_SEND_LIMIT) return;
    await params.sendText(normalized);
    sentCount += 1;
  }

  return {
    async pushProgress(text) {
      const normalized = normalizeText(text);
      if (!normalized) return;

      if (sentCount < DIRECT_SEND_LIMIT) {
        await sendText(normalized);
        return;
      }

      pendingParts.push(normalized);

      if (sentCount < BATCH_SEND_LIMIT && pendingParts.length >= BATCH_SIZE) {
        const batchedText = joinTextParts(pendingParts.splice(0, BATCH_SIZE));
        await sendText(batchedText);
      }
    },

    async finish(finalText) {
      const normalizedFinal = normalizeText(finalText);
      if (normalizedFinal) {
        pendingParts.push(normalizedFinal);
      }

      const remainingText = joinTextParts(pendingParts.splice(0));
      await sendText(remainingText);
    },
  };
}
