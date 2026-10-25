import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { ChatService } from "../../src/services/chatService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser } from "../helpers/fixtures";

// Seeds `count` alternating USER/ASSISTANT messages with strictly increasing
// createdAt, so ordering assertions never depend on same-millisecond inserts.
async function seedMessages(studentId: string, count: number) {
  const conversation = await prisma.aIConversation.create({ data: { studentId, title: "AI Maslahatchi" } });
  const base = Date.now() - count * 1000;
  await prisma.aIMessage.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      conversationId: conversation.id,
      role: i % 2 === 0 ? ("USER" as const) : ("ASSISTANT" as const),
      content: `msg ${i + 1}`,
      createdAt: new Date(base + i * 1000),
    })),
  });
  return conversation;
}

describe("ChatService — history window (real DB)", () => {
  const ai = { chat: vi.fn() };

  function makeService() {
    return new ChatService(ai as any);
  }

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    ai.chat.mockResolvedValue("javob");
  });
  afterAll(() => prisma.$disconnect());

  it("returns the LATEST 50 messages, oldest-first — not the conversation's first 50", async () => {
    const { student } = await createStudentUser();
    await seedMessages(student.id, 60);

    const { messages } = await makeService().getHistory(student.id);

    expect(messages).toHaveLength(50);
    expect(messages[0].content).toBe("msg 11");
    expect(messages[49].content).toBe("msg 60");
  });

  it("shows a newly sent message and its reply in the history even past 50 messages (the reported bug)", async () => {
    const { student } = await createStudentUser();
    await seedMessages(student.id, 60);

    await makeService().sendMessage(student.id, "yangi savol", "uz");
    const { messages } = await makeService().getHistory(student.id);

    expect(messages.slice(-2).map((m) => [m.role, m.content])).toEqual([
      ["USER", "yangi savol"],
      ["ASSISTANT", "javob"],
    ]);
  });

  it("gives the AI the most recent turns as context, not the oldest ones", async () => {
    const { student } = await createStudentUser();
    await seedMessages(student.id, 60);

    await makeService().sendMessage(student.id, "yangi savol", "uz");

    const history = ai.chat.mock.calls[0][1] as { content: string }[];
    expect(history).toHaveLength(50);
    expect(history[history.length - 1].content).toBe("msg 60");
  });
});
