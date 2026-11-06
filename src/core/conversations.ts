import { and, eq, desc, ne } from 'drizzle-orm';
import { db } from '@/db';
import { conversations, messages, funnelEvents, type Attachment } from '@/db/schema';
import { emit } from './events';

export type Conversation = typeof conversations.$inferSelect;
export type FunnelStage = Conversation['funnelStage'];
export type ConversationStatus = Conversation['status'];

export async function getOrCreateActive(
  userId: string,
  channel: 'telegram' | 'instagram' | 'web' = 'telegram',
): Promise<Conversation> {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), ne(conversations.status, 'yopilgan')))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({ userId, channel })
    .returning();
  return created;
}

export async function addMessage(args: {
  conversationId: string;
  sender: 'user' | 'ai' | 'lawyer' | 'system';
  body: string;
  authorAdminId?: string | null;
  attachments?: Attachment[];
  externalMessageId?: string | null;
}) {
  const [row] = await db
    .insert(messages)
    .values({
      conversationId: args.conversationId,
      sender: args.sender,
      body: args.body,
      authorAdminId: args.authorAdminId ?? null,
      attachments: args.attachments ?? [],
      externalMessageId: args.externalMessageId ?? null,
    })
    .returning();

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, args.conversationId));

  // Panel ochiq bo'lsa — xabar u yerda darhol paydo bo'ladi
  void emit({
    type: 'message',
    conversationId: args.conversationId,
    sender: args.sender,
    preview: args.body.slice(0, 140),
    at: new Date().toISOString(),
  });

  return row;
}

export async function setStatus(conversationId: string, status: ConversationStatus) {
  await db
    .update(conversations)
    .set({ status, ...(status === 'yopilgan' ? { closedAt: new Date() } : {}) })
    .where(eq(conversations.id, conversationId));
  void emit({ type: 'conversation', conversationId, status, at: new Date().toISOString() });
}

/**
 * Voronka bosqichini oldinga suradi va o'tishni yozib qo'yadi.
 * Panelda konversiya voronkasi shu hodisalardan chiziladi.
 */
export async function advanceFunnel(args: {
  conversation: Conversation;
  to: FunnelStage;
  reason?: string;
}) {
  if (args.conversation.funnelStage === args.to) return;
  await db.transaction(async (tx) => {
    await tx
      .update(conversations)
      .set({ funnelStage: args.to })
      .where(eq(conversations.id, args.conversation.id));
    await tx.insert(funnelEvents).values({
      conversationId: args.conversation.id,
      userId: args.conversation.userId,
      fromStage: args.conversation.funnelStage,
      toStage: args.to,
      reason: args.reason ?? null,
    });
  });
  args.conversation.funnelStage = args.to;
}

export async function recentHistory(conversationId: string, limit = 10) {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}
