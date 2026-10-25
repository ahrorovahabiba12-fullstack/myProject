import { AIMessageRole, PrismaClient } from "@prisma/client";

export class ConversationRepository {
  constructor(private db: PrismaClient) {}

  findOrCreateDefault(studentId: string) {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.aIConversation.findFirst({
        where: { studentId },
        orderBy: { updatedAt: "desc" },
      });
      if (existing) return existing;
      return tx.aIConversation.create({ data: { studentId, title: "AI Maslahatchi" } });
    });
  }

  // Ownership is enforced by filtering on studentId here — a student can
  // never fetch another student's conversation, even with a guessed id.
  findByIdForStudent(id: string, studentId: string) {
    return this.db.aIConversation.findFirst({ where: { id, studentId } });
  }

  // The LATEST `limit` messages, returned oldest-first for display/AI context.
  // Taking the first `limit` in ascending order instead froze the window on the
  // conversation's opening messages — past 50, every new message and reply was
  // saved but never shown again, and the AI only ever saw the oldest turns.
  async listMessages(conversationId: string, limit = 50) {
    const latest = await this.db.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return latest.reverse();
  }

  addMessage(conversationId: string, role: AIMessageRole, content: string) {
    return this.db.aIMessage.create({ data: { conversationId, role, content } });
  }

  touch(conversationId: string) {
    return this.db.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  }
}
