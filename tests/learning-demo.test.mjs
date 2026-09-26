import test from 'node:test';
import assert from 'node:assert/strict';
import { addClaim, backlinks, createScenario, dream, exportWorkspace, review, validateWorkspace } from '../lib/core.mjs';
import { createExampleWorkspace, EXAMPLE_PACKS } from '../lib/example-packs.mjs';
import { createLearningWorkspace, LEARNING_PROMPT, LEARNING_STEPS, LEARNING_WORKSPACE_KEY } from '../lib/learning-demo.mjs';

test('the guided workshop is small, fictional, and source-backed before any actions', () => {
  const workspace = createLearningWorkspace();
  assert.equal(workspace.raw.length, 2);
  assert.equal(workspace.claims.length, 1);
  assert.equal(workspace.research.length, 1);
  assert.equal(workspace.dreams.length, 0, 'opening the guide does not run dreaming');
  assert.equal(workspace.scenarios.length, 0, 'opening the guide does not create a scenario');
  assert.deepEqual(workspace.raw.map(record => record.text), [
    'People keep asking what time the workshop starts.',
    'The workshop invitation lists the place, but no start time.',
  ]);
  for (const source of workspace.raw) {
    assert.ok(Object.isFrozen(source));
    assert.match(source.title, /fictional/);
    assert.ok(source.tags.includes('fictional'));
    assert.equal(source.sourceUrl, '');
    assert.equal(backlinks(workspace, source.id).claims[0].id, workspace.claims[0].id);
  }
  assert.equal(workspace.claims[0].text, 'Put the start time where people can find it.');
  assert.equal(workspace.claims[0].status, 'proposed');
  assert.deepEqual(workspace.claims[0].rawIds, workspace.raw.map(source => source.id));
  assert.deepEqual(workspace.research[0].rawIds, workspace.raw.map(source => source.id));
  assert.equal(workspace.research[0].status, 'pending');
  assert.ok(Date.parse(workspace.research[0].dueAt) > Date.now());
  assert.doesNotThrow(() => validateWorkspace(exportWorkspace(workspace)));
});

test('guide construction and actions leave the example collections untouched', () => {
  const studio = createExampleWorkspace('studio');
  const savedStudio = exportWorkspace(studio);
  const first = createLearningWorkspace();
  const second = createLearningWorkspace();
  assert.notEqual(first.raw[0].id, second.raw[0].id);
  const secondBefore = exportWorkspace(second);
  const [suggestion] = dream(first);
  review(first, suggestion.id, 'accept');
  createScenario(first, { prompt: LEARNING_PROMPT });
  assert.equal(exportWorkspace(second), secondBefore);
  assert.equal(exportWorkspace(studio), savedStudio);
  assert.notEqual(LEARNING_WORKSPACE_KEY, 'astral-travel.workspace.v0.1');
  for (const { id } of EXAMPLE_PACKS) assert.notEqual(LEARNING_WORKSPACE_KEY, `astral-travel.workspace.v0.1.example.${id}`);
  assert.deepEqual(EXAMPLE_PACKS.map(({ count }) => count), [48, 96, 144]);
});

test('the lesson produces a reviewable connection and keeps imagined material separate', () => {
  const workspace = createLearningWorkspace();
  const originals = JSON.stringify(workspace.raw);
  const proposals = dream(workspace);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].status, 'proposed');
  assert.deepEqual(proposals[0].rawIds, workspace.raw.map(source => source.id));
  review(workspace, proposals[0].id, 'accept');
  assert.equal(workspace.claims.at(-1).status, 'inferred');
  const scenario = createScenario(workspace, { prompt: LEARNING_PROMPT });
  assert.equal(scenario.method, 'scenario-worksheet-v1');
  assert.ok(scenario.contextRawIds.length > 0);
  assert.match(scenario.output, /not a prediction or model result/);
  assert.throws(() => addClaim(workspace, { title: 'Imaginary evidence', text: 'Not allowed', rawIds: [scenario.id] }), /Simulations cannot be evidence/);
  assert.equal(JSON.stringify(workspace.raw), originals);
  assert.doesNotThrow(() => validateWorkspace(exportWorkspace(workspace)));
  assert.deepEqual(LEARNING_STEPS.map(({ step, mode }) => [step, mode]), [[1, 'memory'], [2, 'memory'], [3, 'dreams'], [4, 'research'], [5, 'scenarios']]);
});
