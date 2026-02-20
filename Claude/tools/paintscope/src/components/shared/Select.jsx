/**
 * Select – custom select dropdown.
 *
 * Props:
 *   options   – Array of { value, label }
 *   value     – currently selected value
 *   onChange  – callback receiving the new value string
 *   placeholder – optional placeholder text shown as first disabled-style option
 *   ...rest   – any additional props forwarded to the <select> element
 */
export default function Select({ options, value, onChange, placeholder, ...props }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
