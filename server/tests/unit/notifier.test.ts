import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { Notifier } from "../../src/services/notifier";
import { NotificationService } from "../../src/services/notificationService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createParentUser, createStudentUser } from "../helpers/fixtures";

const n = new Notifier(prisma);
const forUser = (recipientId: string) => prisma.notification.findMany({ where: { recipientId }, orderBy: { createdAt: "asc" } });

describe("Notifier — automatic and admin notifications (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("badge: notifies the student and the linked parent", async () => {
    const { user: pUser, parent } = await createParentUser();
    const { user, student } = await createStudentUser({ fullName: "Ali Valiyev", parentId: parent.id });
    await n.badgesEarned(student.id, [{ nameUz: "Birinchi test", nameRu: "Первый тест", icon: "🎯" }]);

    const mine = await forUser(user.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].type).toBe("BADGE");
    expect(mine[0].title).toContain("Birinchi test");
    expect(mine[0].titleRu).toContain("Первый тест");
    expect(mine[0].link).toBe("/achievements");
    const parents = await forUser(pUser.id);
    expect(parents[0].title).toContain("Ali Valiyev");
  });

  it("quiz result goes to the parent only, and nowhere without a parent", async () => {
    const { user: pUser, parent } = await createParentUser();
    const { user, student } = await createStudentUser({ parentId: parent.id });
    await n.quizCompleted(student.id, { nameUz: "Fizika", nameRu: "Физика" }, 9, 80);
    expect(await forUser(user.id)).toHaveLength(0);
    expect((await forUser(pUser.id))[0].body).toContain("80%");

    const { user: lone, student: loneStudent } = await createStudentUser();
    await n.quizCompleted(loneStudent.id, { nameUz: "Fizika", nameRu: "Физика" }, 9, 80);
    expect(await prisma.notification.count({ where: { recipientId: lone.id } })).toBe(0);
  });

  it("streak reminder: only for a 2+ day streak, not if studied today, at most once a day", async () => {
    const { user, student } = await createStudentUser();
    await n.streakReminder(student.id, 1, false);
    await n.streakReminder(student.id, 5, true);
    expect(await forUser(user.id)).toHaveLength(0);
    await n.streakReminder(student.id, 5, false);
    await n.streakReminder(student.id, 5, false);
    const rows = await forUser(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("STREAK");
  });

  it("broadcast: by audience, by grade (parents of that grade too) and by email", async () => {
    const { user: p9User, parent: p9 } = await createParentUser();
    const { user: s9 } = await createStudentUser({ grade: 9, parentId: p9.id });
    const { user: s11 } = await createStudentUser({ grade: 11 });
    const { user: otherParent } = await createParentUser();

    expect(await n.broadcast({ title: "t", body: "b" }, { audience: "STUDENTS" })).toBe(2);
    expect(await n.broadcast({ title: "t", body: "b" }, { audience: "ALL", grade: 9 })).toBe(2); // s9 + p9
    expect(await prisma.notification.count({ where: { recipientId: s11.id } })).toBe(1);
    expect(await prisma.notification.count({ where: { recipientId: otherParent.id } })).toBe(0);
    expect(await prisma.notification.count({ where: { recipientId: p9User.id } })).toBe(1);

    expect(await n.broadcast({ title: "t", body: "b" }, { audience: "ALL", email: "nobody@x.uz" })).toBe(0);
    const s9Email = (await prisma.user.findUnique({ where: { id: s9.id } }))!.email;
    expect(await n.broadcast({ title: "t", body: "b" }, { audience: "ALL", email: s9Email.toUpperCase() })).toBe(1);
  });

  it("list returns the Russian text for ru, falling back to Uzbek when it is empty", async () => {
    const { user } = await createStudentUser();
    await n.broadcast({ title: "Salom", body: "Matn", titleRu: "Привет", bodyRu: "" }, { audience: "ALL", email: user.email });
    const [ru] = await new NotificationService().list(user.id, "ru");
    expect(ru.title).toBe("Привет");
    expect(ru.body).toBe("Matn");
    const [uz] = await new NotificationService().list(user.id, "uz");
    expect(uz.title).toBe("Salom");
  });
});
