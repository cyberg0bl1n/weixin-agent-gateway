import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UploadedFileInfo } from "../cdn/upload.js";
import { MessageItemType } from "../api/types.js";

const { sendMessageMock } = vi.hoisted(() => ({
  sendMessageMock: vi.fn(),
}));

vi.mock("../api/api.js", async () => {
  const actual = await vi.importActual<typeof import("../api/api.js")>("../api/api.js");
  return {
    ...actual,
    sendMessage: sendMessageMock,
  };
});

import {
  sendFileMessageWeixin,
  sendImageMessageWeixin,
  sendMessageWeixin,
  sendVideoMessageWeixin,
} from "./send.js";

const uploadedFile: UploadedFileInfo = {
  filekey: "filekey",
  downloadEncryptedQueryParam: "download-param",
  aeskey: "00112233445566778899aabbccddeeff",
  fileSize: 123,
  fileSizeCiphertext: 128,
};

describe("weixin send parity", () => {
  beforeEach(() => {
    sendMessageMock.mockReset();
    sendMessageMock.mockResolvedValue(undefined);
  });

  it("allows text sends without a context token", async () => {
    const result = await sendMessageWeixin({
      to: "peer@im.wechat",
      text: "hello",
      opts: { baseUrl: "https://example.com" },
    });

    expect(result.messageId).toEqual(expect.any(String));
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock.mock.calls[0][0]).toMatchObject({
      baseUrl: "https://example.com",
      body: {
        msg: {
          to_user_id: "peer@im.wechat",
          context_token: undefined,
          item_list: [{ type: MessageItemType.TEXT }],
        },
      },
    });
  });

  it.each([
    {
      label: "image sends",
      expectedType: MessageItemType.IMAGE,
      invoke: () =>
        sendImageMessageWeixin({
          to: "peer@im.wechat",
          text: "",
          uploaded: uploadedFile,
          opts: { baseUrl: "https://example.com" },
        }),
    },
    {
      label: "video sends",
      expectedType: MessageItemType.VIDEO,
      invoke: () =>
        sendVideoMessageWeixin({
          to: "peer@im.wechat",
          text: "",
          uploaded: uploadedFile,
          opts: { baseUrl: "https://example.com" },
        }),
    },
    {
      label: "file sends",
      expectedType: MessageItemType.FILE,
      invoke: () =>
        sendFileMessageWeixin({
          to: "peer@im.wechat",
          text: "",
          fileName: "report.txt",
          uploaded: uploadedFile,
          opts: { baseUrl: "https://example.com" },
        }),
    },
  ])("allows $label without a context token", async ({ expectedType, invoke }) => {
    const result = await invoke();

    expect(result.messageId).toEqual(expect.any(String));
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock.mock.calls[0][0]).toMatchObject({
      baseUrl: "https://example.com",
      body: {
        msg: {
          to_user_id: "peer@im.wechat",
          context_token: undefined,
          item_list: [{ type: expectedType }],
        },
      },
    });
  });
});
