import Select from '../shared/Select';
import { ENUMS } from '../../data/enums';

export default function SubstrateStateSelect({ substrateId, value, onChange }) {
  const applicable = ENUMS.substrateStates.filter(s => s.applies_to.includes(substrateId));
  return <Select options={applicable} value={value} onChange={v => onChange(v || null)} placeholder="Select State..." />;
}
