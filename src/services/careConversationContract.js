import { z } from 'zod';

const nullableId = z.union([z.string(), z.number()]).nullable().optional();
export const careCapabilitySchema = z.object({
  contract_version: z.literal('care-conversation-turn-v1'), role: z.string(), provider_roles: z.array(z.string()).default([]),
  capabilities: z.object({
    care_conversation_api: z.boolean(), proactive_runtime: z.boolean(), proactive_app_inbox: z.boolean(),
    proactive_whatsapp: z.boolean(), task_assignment: z.boolean(), conversation_preferences: z.boolean(),
  }).passthrough(),
}).passthrough();
export const quickActionSchema = z.object({ id: z.string().min(1), label: z.string().min(1) }).passthrough();
export const conversationTurnSchema = z.object({
  turn_id: z.string().min(1), direction: z.enum(['inbound', 'outbound']), sender_role: z.string(), audience_role: z.string(),
  message: z.string(), reply_to_turn_id: z.string().nullable().optional(), state_version: z.number().int().nonnegative(), status: z.string(),
  structured: z.object({
    requested_response_type: z.string().nullable().optional(), quick_actions: z.array(quickActionSchema).default([]),
    next_checkpoint_at: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();
export const careConversationSchema = z.object({
  conversation_id: z.string().min(1), patient_id: nullableId, stakeholder_role: z.string(), organization_id: nullableId,
  business_unit_id: nullableId, status: z.string(), continuity_version: z.number().int().nonnegative(),
  unread_count: z.number().int().nonnegative(), last_activity_at: z.string().nullable().optional(),
  active_reply_turn_id: z.string().nullable().optional(),
  active_response_obligation: z.object({
    status: z.string().optional(), task_id: z.string().optional(), outbound_turn_id: z.string().optional(),
    inbound_turn_id: z.string().optional(), owner: z.string().optional(), deadline: z.string().nullable().optional(),
  }).passthrough().default({}),
  current_commitment: z.object({
    task_id: z.string(), state: z.string(), owner: z.string(), deadline: z.string().nullable().optional(), next_action: z.string(),
  }).passthrough().nullable(),
  tasks: z.array(z.object({
    task_id: z.string(), relation: z.string(), state: z.string(), task_type: z.string(), risk_tier: z.string(),
    due_at: z.string().nullable().optional(), requires_response: z.boolean(),
    assignment_actions: z.array(z.enum(['release', 'decline'])).default([]),
  }).passthrough()).max(3),
  turns: z.array(conversationTurnSchema),
  allowed_actions: z.object({ reply: z.boolean(), read: z.boolean(), pause: z.boolean(), update_delivery_preferences: z.boolean() }).passthrough(),
  delivery_preferences: z.object({
    paused: z.boolean().optional(), frequency: z.enum(['default', 'less_often']).optional(), preferred_days: z.array(z.string()).optional(),
    preferred_time: z.string().optional(), preferred_channel: z.enum(['portal', 'whatsapp']).optional(),
    quiet_hours: z.object({ start: z.string(), end: z.string() }).optional(),
  }).passthrough(),
}).passthrough();
export const careConversationCollectionSchema = z.object({ patient_id: nullableId, items: z.array(careConversationSchema), next_cursor: z.string().nullable() }).passthrough();
export const careConversationSummarySchema = z.object({
  patient_id: nullableId, conversation_count: z.number().int().nonnegative(), unread_count: z.number().int().nonnegative(),
  active_count: z.number().int().nonnegative(), server_contract: z.literal('care-conversation-turn-v1'),
}).passthrough();
export const careConversationReplyResultSchema = z.object({
  conversation: careConversationSchema, status: z.string().optional(),
  runtime: z.object({ status: z.string().optional(), message: z.string().optional(), state_version: z.number().int().nonnegative().optional() }).passthrough().optional(),
}).passthrough();
export function parseContract(schema, payload, label) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const error = new Error(`${label} did not match care-conversation-turn-v1.`);
    error.code = 'contract_mismatch'; error.issues = result.error.issues; throw error;
  }
  return result.data;
}
