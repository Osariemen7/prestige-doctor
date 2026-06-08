import {
  buildRealtimeFunctionCallOutputEvents,
  extractCopilotToolCallFromRealtimeEvent,
  extractCopilotUpdateFromRealtimeEvent,
} from './openAiRealtimeClient';

describe('openAiRealtimeClient copilot update parsing', () => {
  it('extracts copilot updates from realtime function-call argument events', () => {
    const event = {
      type: 'response.function_call_arguments.done',
      call_id: 'call_copilot_123',
      name: 'prestige_emit_copilot_update',
      arguments: JSON.stringify({
        running_summary: ['Patient reports worsening pain with movement.'],
        risk_flags: [{ label: 'Possible surgical abdomen', severity: 'urgent' }],
        patient_follow_through_tasks: ['Return urgently if pain worsens.'],
      }),
    };

    const update = extractCopilotUpdateFromRealtimeEvent(event);
    const toolCall = extractCopilotToolCallFromRealtimeEvent(event);

    expect(update).toEqual(expect.objectContaining({
      type: 'prestige.copilot.update',
      running_summary: ['Patient reports worsening pain with movement.'],
    }));
    expect(toolCall).toEqual(expect.objectContaining({
      callId: 'call_copilot_123',
      name: 'prestige_emit_copilot_update',
      update: expect.objectContaining({
        risk_flags: [{ label: 'Possible surgical abdomen', severity: 'urgent' }],
      }),
    }));
  });

  it('extracts copilot updates from nested realtime output items', () => {
    const event = {
      type: 'response.output_item.done',
      item: {
        type: 'function_call',
        call_id: 'call_nested_456',
        name: 'prestige_emit_copilot_update',
        arguments: JSON.stringify({
          missing_information: [{ question: 'Any medication allergies?' }],
          suggested_questions: [{ question: 'When did the fever start?' }],
        }),
      },
    };

    const toolCall = extractCopilotToolCallFromRealtimeEvent(event);

    expect(toolCall.callId).toBe('call_nested_456');
    expect(toolCall.update.missing_information[0].question).toBe('Any medication allergies?');
    expect(toolCall.update.suggested_questions[0].question).toBe('When did the fever start?');
  });

  it('builds function-call output events required by realtime tool calls', () => {
    const events = buildRealtimeFunctionCallOutputEvents(
      { callId: 'call_copilot_123' },
      { update_keys: ['running_summary'] }
    );

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(expect.objectContaining({
      type: 'conversation.item.create',
      item: expect.objectContaining({
        type: 'function_call_output',
        call_id: 'call_copilot_123',
      }),
    }));
    expect(JSON.parse(events[0].item.output)).toEqual(expect.objectContaining({
      success: true,
      handled_by: 'prestige_doctor_workspace',
      action: 'copilot_update_applied',
      update_keys: ['running_summary'],
    }));
    expect(events[1]).toEqual({ type: 'response.create' });
  });
});
