import { SolapiMessageService } from "solapi";

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY!,
  process.env.SOLAPI_API_SECRET!
);

const SENDER = process.env.SOLAPI_SENDER!;

export async function sendSMS(to: string, text: string) {
  return messageService.send({ to, from: SENDER, text });
}

export async function sendBulkSMS(messages: { to: string; text: string }[]) {
  if (messages.length === 0) return null;
  return messageService.send(
    messages.map((m) => ({ to: m.to, from: SENDER, text: m.text }))
  );
}
