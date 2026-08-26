import path from 'node:path';
import { readJsonFile } from '../lib/fs.js';
import type { SessionFixture } from './types.js';

function fixtureError(path: string, expected: string): never {
  throw new Error(`Invalid fixture: ${path} must be ${expected}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, fieldPath: string): Record<string, unknown> {
  if (!isRecord(value)) fixtureError(fieldPath, 'an object');
  return value;
}

function requireString(value: unknown, fieldPath: string): asserts value is string {
  if (typeof value !== 'string') fixtureError(fieldPath, 'a string');
}

function requireBoolean(value: unknown, fieldPath: string): void {
  if (typeof value !== 'boolean') fixtureError(fieldPath, 'a boolean');
}

function requireEnum(value: unknown, fieldPath: string, values: readonly string[]): void {
  if (typeof value !== 'string' || !values.includes(value)) {
    fixtureError(fieldPath, `one of ${values.map((item) => JSON.stringify(item)).join(', ')}`);
  }
}

function requireArray(value: unknown, fieldPath: string): unknown[] {
  if (!Array.isArray(value)) fixtureError(fieldPath, 'an array');
  return value;
}

function validateFixture(value: unknown): asserts value is SessionFixture {
  const fixture = requireRecord(value, 'root');
  requireString(fixture.sessionId, 'sessionId');
  requireString(fixture.workspaceRoot, 'workspaceRoot');
  requireString(fixture.objective, 'objective');

  requireArray(fixture.expectedPaths, 'expectedPaths').forEach((item, index) => {
    requireString(item, `expectedPaths[${index}]`);
  });

  const reviewIds = new Map<string, number>();
  requireArray(fixture.commandReviews, 'commandReviews').forEach((item, index) => {
    const review = requireRecord(item, `commandReviews[${index}]`);
    requireString(review.id, `commandReviews[${index}].id`);
    const previousIndex = reviewIds.get(review.id);
    if (previousIndex !== undefined) {
      throw new Error(
        `Invalid fixture: commandReviews[${index}].id duplicates commandReviews[${previousIndex}].id (${JSON.stringify(review.id)}).`
      );
    }
    reviewIds.set(review.id, index);
    requireString(review.command, `commandReviews[${index}].command`);
    requireString(review.reason, `commandReviews[${index}].reason`);
    requireEnum(review.risk, `commandReviews[${index}].risk`, ['low', 'medium', 'high']);
    requireBoolean(review.requiresApproval, `commandReviews[${index}].requiresApproval`);
    requireEnum(review.approvalStatus, `commandReviews[${index}].approvalStatus`, ['approved', 'rejected', 'pending']);
    requireString(review.addedAt, `commandReviews[${index}].addedAt`);
  });

  requireArray(fixture.transcript, 'transcript').forEach((item, index) => {
    const entry = requireRecord(item, `transcript[${index}]`);
    requireString(entry.at, `transcript[${index}].at`);
    requireEnum(entry.role, `transcript[${index}].role`, ['system', 'agent', 'user', 'tool']);
    requireString(entry.text, `transcript[${index}].text`);
    if (entry.meta !== undefined) {
      const meta = requireRecord(entry.meta, `transcript[${index}].meta`);
      for (const [key, metaValue] of Object.entries(meta)) {
        if (!['string', 'number', 'boolean'].includes(typeof metaValue)) {
          fixtureError(`transcript[${index}].meta.${key}`, 'a string, number, or boolean');
        }
      }
      if (meta.commandReviewId !== undefined) requireString(meta.commandReviewId, `transcript[${index}].meta.commandReviewId`);
      if (meta.approvalStatus !== undefined) {
        requireEnum(meta.approvalStatus, `transcript[${index}].meta.approvalStatus`, ['approved', 'rejected', 'pending']);
      }
    }
  });
}

export async function loadFixture(fixturePath: string): Promise<SessionFixture> {
  const fixture: unknown = await readJsonFile(path.resolve(fixturePath));
  validateFixture(fixture);
  return fixture;
}
