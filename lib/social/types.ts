export type LeadType =
  | 'USER_LEAD'
  | 'WORKER_LEAD'
  | 'SUPPLIER_LEAD'
  | 'DRIVER_LEAD'
  | 'CURIOUS_LEAD'
  | 'FLIRTY_LEAD'
  | 'SUPPORT_LEAD'
  | 'UNSAFE_LEAD';

export type Intent =
  | 'greeting'
  | 'ask_about_manosya'
  | 'ask_about_roger'
  | 'user_needs_service'
  | 'worker_has_skill'
  | 'supplier_has_business'
  | 'driver_interest'
  | 'job_interest'
  | 'registration_interest'
  | 'price_question'
  | 'location_question'
  | 'flirty'
  | 'sexual'
  | 'aggressive'
  | 'support'
  | 'spam'
  | 'unknown';

export interface ClassificationResult {
  intent: Intent;
  leadType: LeadType;
  confidence: number;
  needsHuman: boolean;
  shouldSendLink: boolean;
  detectedCity?: string | null;
  detectedProfession?: string | null;
  detectedInterests?: string[];
}

export type ConversationRole = 'user' | 'assistant';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
  createdAt: number;
}

export interface GenerateSocialReplyInput {
  messageText: string;
  recentMessages?: ConversationMessage[];
  leadType?: LeadType;
  intent?: Intent;
}
