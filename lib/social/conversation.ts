import type { ConversationMessage, ConversationRole } from './types';

type SocialGlobal = typeof globalThis & {
  __manosyaSocialConversations?: Map<string, ConversationMessage[]>;
};

const socialGlobal = globalThis as SocialGlobal;

const conversations =
  socialGlobal.__manosyaSocialConversations ||
  new Map<string, ConversationMessage[]>();

socialGlobal.__manosyaSocialConversations = conversations;

export function getRecentMessages(senderId: string): ConversationMessage[] {
  return [...(conversations.get(senderId) || [])];
}

export function addMessage(senderId: string, role: ConversationRole, content: string) {
  if (!senderId || !content.trim()) return;

  const current = conversations.get(senderId) || [];
  const next = [
    ...current,
    {
      role,
      content: content.trim(),
      createdAt: Date.now(),
    },
  ].slice(-10);

  conversations.set(senderId, next);
}
