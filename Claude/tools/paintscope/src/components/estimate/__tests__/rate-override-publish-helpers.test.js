import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { findConflictingDraft, buildPublishedTaskPayload } from '../RateOverridePublishHelpers.js';

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

describe('buildPublishedTaskPayload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const canonical = {
    task_id: 'TSK_BRUSH_COAT_LF',
    name: 'Brush Coat (LF)',
    uom: 'LF',
    skill_level: 'experienced',
    rate_per_hour: 80,
  };

  it('preserves all canonical fields and replaces rate_per_hour', () => {
    const result = buildPublishedTaskPayload(canonical, 95, { projectId: 'proj_x', projectName: 'McLeod' });
    expect(result.task_id).toBe('TSK_BRUSH_COAT_LF');
    expect(result.name).toBe('Brush Coat (LF)');
    expect(result.uom).toBe('LF');
    expect(result.skill_level).toBe('experienced');
    expect(result.rate_per_hour).toBe(95);
  });

  it('stamps _meta.last_calibrated_at as a valid ISO timestamp', () => {
    const result = buildPublishedTaskPayload(canonical, 95, { projectId: 'proj_x', projectName: 'McLeod' });
    expect(result._meta.last_calibrated_at).toBe('2026-05-16T12:00:00.000Z');
  });

  it('stamps _meta.last_calibrated_from with project context + previous rate from canonical', () => {
    const result = buildPublishedTaskPayload(canonical, 95, { projectId: 'proj_x', projectName: 'McLeod' });
    expect(result._meta.last_calibrated_from).toEqual({
      project_id: 'proj_x',
      project_name: 'McLeod',
      previous_rate: 80,
    });
  });

  it('handles null projectId (fresh state, localStorage-only)', () => {
    const result = buildPublishedTaskPayload(canonical, 95, { projectId: null, projectName: 'Untitled Project' });
    expect(result._meta.last_calibrated_from.project_id).toBeNull();
    expect(result._meta.last_calibrated_from.project_name).toBe('Untitled Project');
  });

  it('merges with existing _meta if canonical already has one', () => {
    const withMeta = {
      ...canonical,
      _meta: {
        custom_note: 'preserved',
        last_calibrated_at: '2020-01-01T00:00:00.000Z',
      },
    };
    const result = buildPublishedTaskPayload(withMeta, 95, { projectId: 'p', projectName: 'n' });
    expect(result._meta.custom_note).toBe('preserved');
    expect(result._meta.last_calibrated_at).toBe('2026-05-16T12:00:00.000Z'); // replaced
    expect(result._meta.last_calibrated_from.previous_rate).toBe(80);
  });

  it('does not mutate the canonical input', () => {
    const original = JSON.stringify(canonical);
    buildPublishedTaskPayload(canonical, 95, { projectId: 'p', projectName: 'n' });
    expect(JSON.stringify(canonical)).toBe(original);
  });
});
