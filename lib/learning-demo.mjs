/** A tiny fictional workshop for the guided lesson. Never merged into saved memory. */
import { createWorkspace, ingest, addClaim, addLink, scheduleResearch } from './core.mjs';

export const LEARNING_WORKSPACE_KEY = 'astral-travel.workspace.v0.1.lesson.workshop';
export const LEARNING_PROMPT = 'What if we put the start time at the top of the invitation?';

export const LEARNING_STEPS = Object.freeze([
  { step: 1, label: 'Save', title: 'Save the original', mode: 'memory', message: 'Maya saved the exact message below. Select it and read the original words. They stay separate from what she thinks they mean.', next: 'See Maya’s idea' },
  { step: 2, label: 'Separate', title: 'Keep your idea beside it', mode: 'memory', message: 'This is Maya’s idea, not the original message. Follow “Based on original sources” to see what she used. An idea starts as a proposal.', next: 'Find a connection' },
  { step: 3, label: 'Connect', title: 'Spot a possible connection', mode: 'dreams', message: 'Choose “Find possible connections” below. Read both notes, then keep or dismiss the suggestion. Shared words and tags are clues, not proof.', next: 'Plan a check' },
  { step: 4, label: 'Check', title: 'Come back and check', mode: 'research', message: 'Maya has a question and a date to check it. After checking, choose “Record review”. This is a list you manage; it does not send alerts or search the web.', next: 'Try a what-if' },
  { step: 5, label: 'Imagine', title: 'Explore a what-if', mode: 'scenarios', message: 'Edit Maya’s question, then choose “Create worksheet”. It gives you questions to think through, not a prediction. Your imagined answer stays out of the original notes.', next: 'Return to my workspace' },
].map(step => Object.freeze(step)));

export function createLearningWorkspace() {
  const workspace = createWorkspace();
  const tags = ['fictional', 'workshop', 'invitation', 'time'];
  const message = ingest(workspace, {
    title: 'Maya’s message · fictional example',
    text: 'People keep asking what time the workshop starts.',
    tags,
  });
  const invitation = ingest(workspace, {
    title: 'The invitation · fictional example',
    text: 'The workshop invitation lists the place, but no start time.',
    tags,
  });
  const idea = addClaim(workspace, {
    title: 'Maya’s idea · fictional example',
    text: 'Put the start time where people can find it.',
    rawIds: [message.id, invitation.id],
    tags,
  });
  for (const rawId of idea.rawIds) addLink(workspace, { fromId: idea.id, toId: rawId, type: 'derived-from' });
  const dueAt = new Date();
  dueAt.setUTCDate(dueAt.getUTCDate() + 7);
  dueAt.setUTCHours(12, 0, 0, 0);
  scheduleResearch(workspace, {
    title: 'Did fewer people ask about the start time?',
    query: 'Fictional practice question: after updating the workshop invitation, check whether people still ask what time it starts. Save any new observations as original notes.',
    rawIds: [message.id, invitation.id],
    dueAt: dueAt.toISOString(),
  });
  return workspace;
}
