import { useState, type CSSProperties, type ReactNode } from 'react';
import { MaskInput, type MaskMeta } from '../src';
const page: CSSProperties = {
  margin: 0,
  minHeight: '100vh',
  fontFamily: 'system-ui,sans-serif',
  background: '#0f172a',
  padding: 24,
};
const card: CSSProperties = { maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: 12, padding: 24 };
const field: CSSProperties = { marginBottom: 16 };
const label: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 };
const input: CSSProperties = {
  width: '100%',
  fontSize: 16,
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
};
const meta: CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: '#64748b',
  fontFamily: 'ui-monospace,Menlo,monospace',
};
function Field({ title, children, info }: { title: string; children: ReactNode; info?: MaskMeta | null }) {
  return (
    <div style={field}>
      <label style={label}>{title}</label>
      {children}
      {info ? (
        <div style={meta}>
          raw: {info.rawValue} · complete: {String(info.isComplete)}
        </div>
      ) : null}
    </div>
  );
}
export function App() {
  const [dateRaw, setDateRaw] = useState('');
  const [phoneMeta, setPhoneMeta] = useState<MaskMeta | null>(null);
  const [dateMeta, setDateMeta] = useState<MaskMeta | null>(null);
  return (
    <div style={page}>
      <div style={card}>
        <h1 style={{ margin: '0 0 16px', fontSize: 20 }}>react-smart-mask</h1>
        <Field title="Phone" info={phoneMeta}>
          <MaskInput
            style={input}
            aria-label="phone"
            mask="{+91 }99999 99999"
            placeholder="XXXXX XXXXX"
            onChange={(_, m) => setPhoneMeta(m)}
          />
        </Field>
        <Field title="Date" info={dateMeta}>
          <MaskInput
            style={input}
            aria-label="date"
            mask="99/99/9999"
            maskChar="_"
            placeholder="Birthdate"
            value={dateRaw}
            onChange={(_, m) => {
              setDateRaw(m.rawValue);
              setDateMeta(m);
            }}
          />
        </Field>
        <Field title="PIN">
          <MaskInput style={input} aria-label="pin" mask="9999" />
        </Field>
      </div>
    </div>
  );
}
