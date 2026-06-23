import { describe, it, expect } from 'vitest';
import { createRooflineSection, createElevation } from '../exterior-state';
import { reducer } from '../reducer.js';

describe('roofline section state', () => {
  it('factory defaults to rake-only trim and zero quantities', () => {
    const s = createRooflineSection();
    expect(s.edges).toEqual({ rake: true, bottom: false, vertical: false });
    expect(s.siding_sf).toBe(0);
    expect(s.difficulty_override).toBeNull();
    expect(s.id).toMatch(/^rls/);
  });

  it('createElevation seeds an empty roofline_sections array', () => {
    expect(createElevation().roofline_sections).toEqual([]);
  });

  it('ADD/SET/REMOVE_ROOFLINE_SECTION mutate the right elevation', () => {
    let st = { exterior: { elevations: [createElevation({ id: 'e1' })] } };
    st = reducer(st, { type: 'ADD_ROOFLINE_SECTION', payload: { elevId: 'e1' } });
    const sid = st.exterior.elevations[0].roofline_sections[0].id;
    st = reducer(st, { type: 'SET_ROOFLINE_SECTION', payload: { elevId: 'e1', sectionId: sid, field: 'siding_sf', value: 120 } });
    expect(st.exterior.elevations[0].roofline_sections[0].siding_sf).toBe(120);
    st = reducer(st, { type: 'REMOVE_ROOFLINE_SECTION', payload: { elevId: 'e1', sectionId: sid } });
    expect(st.exterior.elevations[0].roofline_sections).toHaveLength(0);
  });
});
