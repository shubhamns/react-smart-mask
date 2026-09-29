import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { applyMask, inferInputMode, maskValue } from '../core/mask';
import {
  handleBeforeInput,
  handleChange,
  handleCompositionEnd,
  handleCompositionStart,
  handleCut,
  handleKeyDown,
  handlePaste,
  type CaretRef,
  type MaskInputCore,
} from '../core/maskInputHandlers';
import type { MaskInputProps } from '../types';

export const MaskInput = forwardRef<HTMLInputElement, MaskInputProps>(function MaskInput(
  {
    mask,
    value,
    defaultValue = '',
    maskOptions,
    onChange,
    onComplete,
    inputRef,
    onKeyDown,
    onPaste,
    onCut,
    onCompositionStart,
    onCompositionEnd,
    inputMode,
    ...props
  },
  forwardedRef,
) {
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const caretRef: CaretRef = useRef(null);
  const controlled = value !== undefined;
  const [internalRaw, setInternalRaw] = useState(() => applyMask(defaultValue, mask, maskOptions).rawValue);
  const raw = controlled ? applyMask(value ?? '', mask, maskOptions).rawValue : internalRaw;
  const display = useMemo(() => maskValue(raw, mask, maskOptions), [raw, mask, maskOptions]);
  useImperativeHandle(forwardedRef, () => input.current as HTMLInputElement);
  useImperativeHandle(inputRef, () => input.current as HTMLInputElement);
  const emit = useCallback(
    (nextRaw: string, event?: FormEvent<HTMLInputElement>) => {
      const r = applyMask(nextRaw, mask, maskOptions);
      if (!controlled) setInternalRaw(r.rawValue);
      const meta = { value: r.value, rawValue: r.rawValue, isComplete: r.isComplete };
      const changeEvent = event as ChangeEvent<HTMLInputElement> | undefined;
      if (changeEvent) onChange?.(r.value, meta, changeEvent);
      else onChange?.(r.value, meta, { target: { value: r.value } } as ChangeEvent<HTMLInputElement>);
      if (r.isComplete) onComplete?.(r.value, meta);
    },
    [controlled, mask, maskOptions, onChange, onComplete],
  );
  const core = useMemo(
    (): MaskInputCore => ({
      mask,
      maskOptions,
      raw,
      display,
      get composing() {
        return composing.current;
      },
      set composing(v: boolean) {
        composing.current = v;
      },
      input: input.current,
      caretRef,
      setRaw: setInternalRaw,
      emit,
    }),
    [mask, maskOptions, raw, display, emit],
  );
  core.input = input.current;
  useLayoutEffect(() => {
    const c = caretRef.current;
    if (!c || !input.current) return;
    input.current.setSelectionRange(c[0], c[1]);
    caretRef.current = null;
  }, [display, raw]);
  const mode = inputMode ?? inferInputMode(mask);
  return (
    <input
      {...props}
      ref={input}
      value={display}
      inputMode={mode}
      onChange={(e) => {
        handleChange({ ...core, input: e.currentTarget }, e);
      }}
      onBeforeInput={(e) => {
        handleBeforeInput({ ...core, input: e.currentTarget }, e);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        handleKeyDown({ ...core, input: e.currentTarget }, e);
      }}
      onPaste={(e) => {
        onPaste?.(e);
        if (!e.defaultPrevented) handlePaste({ ...core, input: e.currentTarget }, e);
      }}
      onCut={(e) => {
        onCut?.(e);
        if (!e.defaultPrevented) handleCut({ ...core, input: e.currentTarget }, e);
      }}
      onCompositionStart={(e) => {
        onCompositionStart?.(e);
        handleCompositionStart({ ...core, input: e.currentTarget });
      }}
      onCompositionEnd={(e) => {
        onCompositionEnd?.(e);
        handleCompositionEnd({ ...core, input: e.currentTarget }, e);
      }}
    />
  );
});
