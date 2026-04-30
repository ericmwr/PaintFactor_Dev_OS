// Room type catalog — drives Identity tab "Room Type" dropdown and the
// "Suggested fixtures" section. Room type is informational only (no engine
// activation behavior). The fixture suggestions just bias which fixture
// rows land in the "Suggested" section vs the collapsed "Other" section.

export const ROOM_TYPES = [
  { id: 'kitchen',         label: 'Kitchen' },
  { id: 'half_bath',       label: 'Half Bath' },
  { id: 'full_bath',       label: 'Full Bath' },
  { id: 'master_bath',     label: 'Master Bath' },
  { id: 'powder_room',     label: 'Powder Room' },
  { id: 'living_room',     label: 'Living Room' },
  { id: 'family_room',     label: 'Family Room' },
  { id: 'dining_room',     label: 'Dining Room' },
  { id: 'sunroom',         label: 'Sunroom' },
  { id: 'foyer',           label: 'Foyer' },
  { id: 'bedroom',         label: 'Bedroom' },
  { id: 'master_bedroom',  label: 'Master Bedroom' },
  { id: 'office',          label: 'Office' },
  { id: 'hallway',         label: 'Hallway' },
  { id: 'laundry',         label: 'Laundry Room' },
  { id: 'mudroom',         label: 'Mudroom' },
  { id: 'basement',        label: 'Basement' },
  { id: 'garage',          label: 'Garage' },
  { id: 'other',           label: 'Other' },
];

export const ROOM_TYPE_MAP = Object.fromEntries(ROOM_TYPES.map(r => [r.id, r]));

// Map of room type → fixture IDs likely present (from fixture-catalog.js).
// Used to populate the Identity tab's "Suggested for [room type]" section.
// Anything not in this list still appears in the collapsed "Other" section.
export const ROOM_TYPE_SUGGESTED_FIXTURES = {
  kitchen:        ['cabinets', 'countertops', 'appliances', 'backsplash', 'light_fixtures'],
  half_bath:      ['vanity', 'toilet', 'light_fixtures'],
  full_bath:      ['vanity', 'toilet', 'bathtub', 'shower', 'light_fixtures'],
  master_bath:    ['vanity', 'toilet', 'bathtub', 'shower', 'light_fixtures'],
  powder_room:    ['vanity', 'toilet', 'light_fixtures'],
  living_room:    ['fireplace', 'builtin_shelving', 'feature_wall', 'light_fixtures'],
  family_room:    ['fireplace', 'builtin_shelving', 'feature_wall', 'light_fixtures'],
  dining_room:    ['light_fixtures'],
  sunroom:        ['light_fixtures'],
  foyer:          ['light_fixtures'],
  bedroom:        ['light_fixtures'],
  master_bedroom: ['fireplace', 'light_fixtures'],
  office:         ['builtin_shelving', 'light_fixtures'],
  hallway:        ['light_fixtures'],
  laundry:        ['cabinets', 'appliances', 'light_fixtures'],
  mudroom:        ['cabinets', 'builtin_shelving', 'light_fixtures'],
  basement:       ['light_fixtures'],
  garage:         [],
  other:          [],
};
