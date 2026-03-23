import { describe, expect, it } from "vitest";

import { createLightweightTextReplyBudgeter } from "./lightweight-text-budget.js";

describe("createLightweightTextReplyBudgeter", () => {
  it("sends the first five progress messages individually", async () => {
    const sent: string[] = [];
    const budgeter = createLightweightTextReplyBudgeter({
      sendText: async (text) => {
        sent.push(text);
      },
    });

    for (let i = 1; i <= 5; i += 1) {
      await budgeter.pushProgress(`msg-${i}`);
    }
    await budgeter.finish();

    expect(sent).toEqual([
      "msg-1",
      "msg-2",
      "msg-3",
      "msg-4",
      "msg-5",
    ]);
  });

  it("batches progress after the fifth sent message in groups of three", async () => {
    const sent: string[] = [];
    const budgeter = createLightweightTextReplyBudgeter({
      sendText: async (text) => {
        sent.push(text);
      },
    });

    for (let i = 1; i <= 11; i += 1) {
      await budgeter.pushProgress(`msg-${i}`);
    }
    await budgeter.finish("final");

    expect(sent).toEqual([
      "msg-1",
      "msg-2",
      "msg-3",
      "msg-4",
      "msg-5",
      "msg-6\n\nmsg-7\n\nmsg-8",
      "msg-9\n\nmsg-10\n\nmsg-11",
      "final",
    ]);
  });

  it("reserves the tenth send for the final flush once nine sends have been used", async () => {
    const sent: string[] = [];
    const budgeter = createLightweightTextReplyBudgeter({
      sendText: async (text) => {
        sent.push(text);
      },
    });

    for (let i = 1; i <= 20; i += 1) {
      await budgeter.pushProgress(`msg-${i}`);
    }
    await budgeter.finish("final");

    expect(sent).toEqual([
      "msg-1",
      "msg-2",
      "msg-3",
      "msg-4",
      "msg-5",
      "msg-6\n\nmsg-7\n\nmsg-8",
      "msg-9\n\nmsg-10\n\nmsg-11",
      "msg-12\n\nmsg-13\n\nmsg-14",
      "msg-15\n\nmsg-16\n\nmsg-17",
      "msg-18\n\nmsg-19\n\nmsg-20\n\nfinal",
    ]);
  });
});
