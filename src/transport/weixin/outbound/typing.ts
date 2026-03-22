import { sendTyping } from "../../../api/api.js";
import { TypingStatus } from "../../../api/types.js";

export function createWeixinTypingTransportConfig(params: {
  baseUrl: string;
  token?: string;
  to: string;
  typingTicket?: string;
  log: (message: string) => void;
}): {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  onStartError: (err: unknown) => void;
  onStopError: (err: unknown) => void;
  keepaliveIntervalMs: number;
} {
  const hasTypingTicket = Boolean(params.typingTicket);
  return {
    start: hasTypingTicket
      ? async () => {
          await sendTyping({
            baseUrl: params.baseUrl,
            token: params.token,
            body: {
              ilink_user_id: params.to,
              typing_ticket: params.typingTicket!,
              status: TypingStatus.TYPING,
            },
          });
        }
      : async () => {},
    stop: hasTypingTicket
      ? async () => {
          await sendTyping({
            baseUrl: params.baseUrl,
            token: params.token,
            body: {
              ilink_user_id: params.to,
              typing_ticket: params.typingTicket!,
              status: TypingStatus.CANCEL,
            },
          });
        }
      : async () => {},
    onStartError: (err) => params.log(`[weixin] typing send error: ${String(err)}`),
    onStopError: (err) => params.log(`[weixin] typing cancel error: ${String(err)}`),
    keepaliveIntervalMs: 5000,
  };
}

