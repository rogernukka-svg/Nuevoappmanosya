export type SocialIntent =
  | 'greeting'
  | 'ask_about_manosya'
  | 'user_needs_service'
  | 'worker_has_skill'
  | 'supplier_has_business'
  | 'ask_registration'
  | 'ask_price'
  | 'ask_location'
  | 'support'
  | 'flirty'
  | 'unsafe'
  | 'spam'
  | 'unknown';

export type SocialLeadType =
  | 'USER_LEAD'
  | 'WORKER_LEAD'
  | 'SUPPLIER_LEAD'
  | 'CURIOUS_LEAD'
  | 'FLIRTY_LEAD'
  | 'UNSAFE_LEAD';

export type SocialStatus =
  | 'received'
  | 'replied'
  | 'needs_human'
  | 'send_failed'
  | 'ignored';

export type SocialMessageContext = {
  message_text?: string | null;
  ai_response?: string | null;
  intent?: string | null;
  lead_type?: string | null;
  city?: string | null;
  profession?: string | null;
  interests?: string[] | null;
  needs_human?: boolean | null;
  created_at?: string | null;
};

export type SocialReplyInput = {
  senderId: string;
  messageText: string;
  previousMessages?: SocialMessageContext[];
  currentLeadType?: SocialLeadType | string | null;
  currentIntent?: SocialIntent | string | null;
};

export type SocialReply = {
  reply: string;
  intent: SocialIntent;
  lead_type: SocialLeadType;
  city: string | null;
  profession: string | null;
  interests: string[];
  needs_human: boolean;
};

export type LocalIntentResult = {
  intent: SocialIntent;
  lead_type: SocialLeadType;
  city: string | null;
  profession: string | null;
  interests: string[];
  needs_human: boolean;
};
