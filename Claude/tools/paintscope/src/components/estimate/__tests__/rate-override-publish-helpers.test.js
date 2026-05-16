import { describe, it, expect } from 'vitest';
import { findConflictingDraft } from '../RateOverridePublishHelpers.js';

describe('findConflictingDraft', () => {
  it('returns the draft when one exists with status "draft"', () => {
    const drafts = [
      { id: 'TSK_A', task_id: 'TSK_A', rate_per_hour: 88, status: 'draft' },
      { id: 'TSK_B', task_id: 'TSK_B', rate_per_hour: 50, status: 'draft' },
    ];
    const result = findConflictingDraft('TSK_A', drafts);
    expect(result).toEqual(drafts[0]);
  });

  it('returns null when matching draft has status "published"', () => {
    const drafts = [
      { id: 'TSK_A', task_id: 'TSK_A', rate_per_hour: 88, status: 'published' },
    ];
    expect(findConflictingDraft('TSK_A', drafts)).toBeNull();
  });

  it('returns null when no draft matches the task_id', () => {
    const drafts = [
      { id: 'TSK_B', task_id: 'TSK_B', rate_per_hour: 50, status: 'draft' },
    ];
    expect(findConflictingDraft('TSK_A', drafts)).toBeNull();
  });

  it('returns null when drafts array is empty', () => {
    expect(findConflictingDraft('TSK_A', [])).toBeNull();
  });

  it('handles undefined/null drafts argument', () => {
    expect(findConflictingDraft('TSK_A', null)).toBeNull();
    expect(findConflictingDraft('TSK_A', undefined)).toBeNull();
  });

  it('matches on task_id, not id (drafts may have id == task_id or different)', () => {
    const drafts = [
      { id: 'TSK_A', task_id: 'TSK_A', rate_per_hour: 88, status: 'draft' },
    ];
    expect(findConflictingDraft('TSK_A', drafts)).toEqual(drafts[0]);
  });
});
