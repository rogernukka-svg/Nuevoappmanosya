export type SocialAssistantContext =
  | 'private_message'
  | 'friend_request'
  | 'public_comment'
  | 'story_reply'
  | 'user'
  | 'worker'
  | 'supplier'
  | 'curious'
  | 'flirty'
  | 'support'
  | 'unknown';

export type SocialAssistantLeadType =
  | 'USER_LEAD'
  | 'WORKER_LEAD'
  | 'SUPPLIER_LEAD'
  | 'CURIOUS_LEAD'
  | 'FLIRTY_LEAD'
  | 'UNSAFE_LEAD';

export type SocialAssistantRequest = {
  message: string;
  context: SocialAssistantContext;
};

export type SocialAssistantResponse = {
  shortReply: string;
  naturalReply: string;
  warmReply: string;
  detectedLeadType: SocialAssistantLeadType;
  suggestedNextStep: string;
};
