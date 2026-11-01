import { NotificationType } from "@prisma/client";
import { NotificationRepository } from "../repositories/notificationRepository";
import { prisma } from "../config/prisma";
import { Lang } from "../middleware/language";

export class NotificationService {
  constructor(private repo = new NotificationRepository(prisma)) {}

  notify(recipientId: string, type: NotificationType, title: string, body: string) {
    return this.repo.create(recipientId, type, title, body);
  }

  async list(recipientId: string, lang: Lang = "uz") {
    const rows = await this.repo.listForUser(recipientId);
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: lang === "ru" && n.titleRu ? n.titleRu : n.title,
      body: lang === "ru" && n.bodyRu ? n.bodyRu : n.body,
      link: n.link || null,
      read: n.read,
      createdAt: n.createdAt,
    }));
  }

  async markRead(id: string, recipientId: string) {
    const updated = await this.repo.markRead(id, recipientId);
    return { success: updated.count > 0 };
  }

  unreadCount(recipientId: string) {
    return this.repo.unreadCount(recipientId);
  }
}
