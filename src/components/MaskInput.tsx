import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { applyMask, focusCaretForMask, inferInputMode, isMaskTemplateActive, resolveInputDisplay } from '../core/mask';
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
    maskChar,
    showMaskOnFocus = true,
    onChange,
    onComplete,
    inputRef,
    onFocus,
    onBlur,
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
  const snapFocusCaret = useRef(false);
  const committedRawRef = useRef('');
  const lastEmittedRef = useRef('');
  const [focused, setFocused] = useState(false);
  const controlled = value !== undefined;
  const options = useMemo(
    () => ({ ...maskOptions, ...(maskChar !== undefined ? { maskChar } : {}) }),
    [maskOptions, maskChar],
  );
  const readRaw = (source: string) => applyMask(source, mask, options).rawValue;
  const [raw, setRaw] = useState(() => readRaw(controlled ? (value ?? '') : defaultValue));
  const rawRef = useRef(raw);
  rawRef.current = raw;
  useEffect(() => {
    if (!controlled) return;
    const fromProp = readRaw(value ?? '');
    if (fromProp === lastEmittedRef.current) return;
    lastEmittedRef.current = fromProp;
    committedRawRef.current = fromProp;
    rawRef.current = fromProp;
    setRaw(fromProp);
  }, [controlled, value, mask, options]);
  const templateActive = isMaskTemplateActive(raw, mask, options, focused, showMaskOnFocus);
  const display = resolveInputDisplay(raw, mask, options, templateActive);
  useImperativeHandle(forwardedRef, () => input.current as HTMLInputElement);
  useImperativeHandle(inputRef, () => input.current as HTMLInputElement);
  const patchRaw = useCallback(
    (nextRaw: string, event?: FormEvent<HTMLInputElement>) => {
      const r = applyMask(nextRaw, mask, options);
      lastEmittedRef.current = r.rawValue;
      committedRawRef.current = r.rawValue;
      rawRef.current = r.rawValue;
      setRaw(r.rawValue);
      const meta = { value: r.value, rawValue: r.rawValue, isComplete: r.isComplete };
      const changeEvent = event as ChangeEvent<HTMLInputElement> | undefined;
      if (changeEvent) onChange?.(r.value, meta, changeEvent);
      else onChange?.(r.value, meta, { target: { value: r.value } } as ChangeEvent<HTMLInputElement>);
      if (r.isComplete) onComplete?.(r.value, meta);
    },
    [mask, options, onChange, onComplete],
  );
  const coreRef = useRef<MaskInputCore | null>(null);
  coreRef.current = {
    mask,
    maskOptions: options,
    raw,
    display,
    templateActive,
    get composing() {
      return composing.current;
    },
    set composing(v: boolean) {
      composing.current = v;
    },
    input: input.current,
    caretRef,
    committedRawRef,
    focused,
    showMaskOnFocus,
    setRaw: (next) => {
      rawRef.current = next;
      setRaw(next);
    },
    emit: patchRaw,
  };
  const withCore = (el: HTMLInputElement): MaskInputCore => {
    const liveRaw = rawRef.current;
    const liveTemplate = isMaskTemplateActive(liveRaw, mask, options, focused, showMaskOnFocus);
    const base = coreRef.current!;
    return {
      ...base,
      raw: liveRaw,
      display: resolveInputDisplay(liveRaw, mask, options, liveTemplate),
      templateActive: liveTemplate,
      focused,
      showMaskOnFocus,
      input: el,
    };
  };
  const snapCaretToStart = useCallback(() => {
    if (!showMaskOnFocus || applyMask(rawRef.current, mask, options).isComplete) return;
    snapFocusCaret.current = true;
  }, [mask, options, showMaskOnFocus]);
  useLayoutEffect(() => {
    if (!input.current) return;
    if (snapFocusCaret.current) {
      snapFocusCaret.current = false;
      const slot = templateActive ? focusCaretForMask(rawRef.current, mask, options, showMaskOnFocus) : 0;
      input.current.setSelectionRange(slot, slot);
      return;
    }
    const c = caretRef.current;
    if (!c) return;
    input.current.setSelectionRange(c[0], c[1]);
    caretRef.current = null;
  }, [display, raw, templateActive, focused, mask, options, showMaskOnFocus]);
  return (
    <input
      {...props}
      ref={input}
      value={display}
      inputMode={inputMode ?? inferInputMode(mask)}
      onMouseDown={(e) => {
        if (e.button !== 0 || applyMask(rawRef.current, mask, options).isComplete || !showMaskOnFocus) return;
        e.preventDefault();
        snapCaretToStart();
        input.current?.focus({ preventScroll: true });
      }}
      onFocus={(e) => {
        onFocus?.(e);
        setFocused(true);
        snapCaretToStart();
      }}
      onBlur={(e) => {
        onBlur?.(e);
        setFocused(false);
      }}
      onChange={(e) => handleChange(withCore(e.currentTarget), e)}
      onBeforeInput={(e) => handleBeforeInput(withCore(e.currentTarget), e)}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        handleKeyDown(withCore(e.currentTarget), e);
      }}
      onPaste={(e) => {
        onPaste?.(e);
        if (!e.defaultPrevented) handlePaste(withCore(e.currentTarget), e);
      }}
      onCut={(e) => {
        onCut?.(e);
        if (!e.defaultPrevented) handleCut(withCore(e.currentTarget), e);
      }}
      onCompositionStart={(e) => {
        onCompositionStart?.(e);
        handleCompositionStart(withCore(e.currentTarget));
      }}
      onCompositionEnd={(e) => {
        onCompositionEnd?.(e);
        handleCompositionEnd(withCore(e.currentTarget), e);
      }}
    />
  );
});
