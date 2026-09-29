import { useCallback, useMemo, useState } from 'react';
import { applyMask, maskValue, type MaskOptions } from '../core/mask';
import type { MaskMeta } from '../types';
export interface UseMaskOptions {
  mask: string;
  maskOptions?: MaskOptions;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string, meta: MaskMeta) => void;
  onComplete?: (value: string, meta: MaskMeta) => void;
}
export function useMask(options: UseMaskOptions) {
  const { mask, maskOptions, defaultValue = '', value, onChange, onComplete } = options;
  const controlled = value !== undefined;
  const [internalRaw, setInternalRaw] = useState(() => applyMask(defaultValue, mask, maskOptions).rawValue);
  const raw = controlled ? applyMask(value ?? '', mask, maskOptions).rawValue : internalRaw;
  const display = useMemo(() => maskValue(raw, mask, maskOptions), [raw, mask, maskOptions]);
  const meta = useMemo(() => applyMask(raw, mask, maskOptions), [raw, mask, maskOptions]);
  const publish = useCallback(
    (r: ReturnType<typeof applyMask>) => {
      if (!controlled) setInternalRaw(r.rawValue);
      const m = { value: r.value, rawValue: r.rawValue, isComplete: r.isComplete };
      onChange?.(r.value, m);
      if (r.isComplete) onComplete?.(r.value, m);
    },
    [controlled, onChange, onComplete],
  );
  const setValue = useCallback(
    (next: string) => publish(applyMask(next, mask, maskOptions)),
    [mask, maskOptions, publish],
  );
  const setRawValue = useCallback(
    (nextRaw: string) => publish(applyMask(nextRaw, mask, maskOptions)),
    [mask, maskOptions, publish],
  );
  const onMaskInputChange = useCallback(
    (formatted: string, meta: MaskMeta) => {
      if (!controlled) setInternalRaw(meta.rawValue);
      onChange?.(formatted, meta);
      if (meta.isComplete) onComplete?.(formatted, meta);
    },
    [controlled, onChange, onComplete],
  );
  return {
    value: display,
    rawValue: raw,
    meta,
    setValue,
    setRawValue,
    reset: () => setRawValue(''),
    inputProps: { mask, maskOptions, value: raw, onChange: onMaskInputChange },
  };
}
