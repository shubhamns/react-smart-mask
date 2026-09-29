import type { ChangeEvent, ClipboardEvent, CompositionEvent, FormEvent, KeyboardEvent } from 'react';
import {
  applyMask,
  deleteRawRange,
  displayCaretToRawIndex,
  firstEditable,
  insertRaw,
  lastEditable,
  rawIndexToDisplayCaret,
  skipEditable,
  type MaskOptions,
} from './mask';
export type CaretRef = { current: [number, number] | null };
export type MaskInputCore = {
  mask: string;
  maskOptions?: MaskOptions;
  raw: string;
  display: string;
  composing: boolean;
  input: HTMLInputElement | null;
  caretRef: CaretRef;
  setRaw: (raw: string) => void;
  emit: (raw: string, event?: FormEvent<HTMLInputElement>) => void;
};
export function setCaret(core: MaskInputCore, start: number, end = start) {
  core.caretRef.current = [start, end];
  core.input?.setSelectionRange(start, end);
}
export function commitRaw(core: MaskInputCore, nextRaw: string, caretRaw: number, event?: FormEvent<HTMLInputElement>) {
  core.setRaw(nextRaw);
  setCaret(core, rawIndexToDisplayCaret(caretRaw, nextRaw, core.mask, core.maskOptions));
  core.emit(nextRaw, event);
}
export function handleCompositionStart(core: MaskInputCore) {
  core.composing = true;
}
export function handleCompositionEnd(core: MaskInputCore, e: CompositionEvent<HTMLInputElement>) {
  core.composing = false;
  if (!core.input) return;
  const start = core.input.selectionStart ?? core.display.length;
  const end = core.input.selectionEnd ?? start;
  const rawStart = displayCaretToRawIndex(start, core.display, core.mask, core.maskOptions);
  const rawEnd = displayCaretToRawIndex(end, core.display, core.mask, core.maskOptions);
  const inserted = insertRaw(
    deleteRawRange(core.raw, rawStart, rawEnd),
    rawStart,
    e.data ?? '',
    core.mask,
    core.maskOptions,
  );
  commitRaw(core, inserted, rawStart + Array.from(e.data ?? '').length, e);
}
export function handleBeforeInput(core: MaskInputCore, e: FormEvent<HTMLInputElement>) {
  if (core.composing) return;
  const native = e.nativeEvent as InputEvent;
  if (!core.input || !native.inputType) return;
  const start = core.input.selectionStart ?? core.display.length;
  const end = core.input.selectionEnd ?? start;
  const rawStart = displayCaretToRawIndex(start, core.display, core.mask, core.maskOptions);
  const rawEnd = displayCaretToRawIndex(end, core.display, core.mask, core.maskOptions);
  if (native.inputType === 'deleteContentBackward') {
    e.preventDefault();
    if (start !== end) commitRaw(core, deleteRawRange(core.raw, rawStart, rawEnd), rawStart, e);
    else if (rawStart > 0) commitRaw(core, deleteRawRange(core.raw, rawStart - 1, rawStart), rawStart - 1, e);
    return;
  }
  if (native.inputType === 'deleteContentForward') {
    e.preventDefault();
    if (start !== end) commitRaw(core, deleteRawRange(core.raw, rawStart, rawEnd), rawStart, e);
    else if (rawStart < core.raw.length) commitRaw(core, deleteRawRange(core.raw, rawStart, rawStart + 1), rawStart, e);
    return;
  }
  if (native.inputType === 'insertFromPaste' || native.inputType === 'insertFromDrop') return;
  if (native.inputType.startsWith('insert') && native.data) {
    e.preventDefault();
    const base = deleteRawRange(core.raw, rawStart, rawEnd);
    const next = insertRaw(base, rawStart, native.data, core.mask, core.maskOptions);
    commitRaw(core, next, rawStart + next.length - base.length, e);
  }
}
export function handleChange(core: MaskInputCore, e: ChangeEvent<HTMLInputElement>) {
  if (core.composing) return;
  const nextDisplay = e.target.value;
  const r = applyMask(nextDisplay, core.mask, core.maskOptions);
  const el = core.input;
  const caret = el?.selectionStart ?? r.value.length;
  const rawCaret = displayCaretToRawIndex(caret, nextDisplay, core.mask, core.maskOptions);
  commitRaw(core, r.rawValue, rawCaret, e);
}
export function handleKeyDown(core: MaskInputCore, e: KeyboardEvent<HTMLInputElement>) {
  if (core.composing || !core.input) return;
  const el = core.input;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;
  const display = core.display;
  if (e.key === 'ArrowLeft') {
    const next = skipEditable(display, core.mask, start, -1, core.maskOptions);
    if (next !== start) {
      e.preventDefault();
      setCaret(core, next, next);
    }
    return;
  }
  if (e.key === 'ArrowRight') {
    const next = skipEditable(display, core.mask, start, 1, core.maskOptions);
    if (next !== start) {
      e.preventDefault();
      setCaret(core, next, next);
    }
    return;
  }
  if (e.key === 'Home') {
    e.preventDefault();
    const first = firstEditable(display, core.mask, core.maskOptions);
    setCaret(core, first, first);
    return;
  }
  if (e.key === 'End') {
    e.preventDefault();
    const last = lastEditable(display, core.mask, core.maskOptions);
    setCaret(core, last, last);
    return;
  }
  if (e.key === 'Backspace' || e.key === 'Delete') {
    if (e.defaultPrevented) return;
    const rawStart = displayCaretToRawIndex(start, display, core.mask, core.maskOptions);
    const rawEnd = displayCaretToRawIndex(end, display, core.mask, core.maskOptions);
    e.preventDefault();
    if (start !== end) commitRaw(core, deleteRawRange(core.raw, rawStart, rawEnd), rawStart, e);
    else if (e.key === 'Backspace' && rawStart > 0)
      commitRaw(core, deleteRawRange(core.raw, rawStart - 1, rawStart), rawStart - 1, e);
    else if (e.key === 'Delete' && rawStart < core.raw.length)
      commitRaw(core, deleteRawRange(core.raw, rawStart, rawStart + 1), rawStart, e);
    return;
  }
}
export function handlePaste(core: MaskInputCore, e: ClipboardEvent<HTMLInputElement>) {
  if (core.composing) return;
  const text = e.clipboardData.getData('text');
  if (!text || !core.input) return;
  e.preventDefault();
  const start = core.input.selectionStart ?? core.display.length;
  const end = core.input.selectionEnd ?? start;
  const rawStart = displayCaretToRawIndex(start, core.display, core.mask, core.maskOptions);
  const rawEnd = displayCaretToRawIndex(end, core.display, core.mask, core.maskOptions);
  const base = deleteRawRange(core.raw, rawStart, rawEnd);
  const next = insertRaw(base, rawStart, text, core.mask, core.maskOptions);
  const added = next.length - base.length;
  commitRaw(core, next, rawStart + added, e);
}
export function handleCut(core: MaskInputCore, e: ClipboardEvent<HTMLInputElement>) {
  if (core.composing || !core.input) return;
  const start = core.input.selectionStart ?? 0;
  const end = core.input.selectionEnd ?? start;
  if (start === end) return;
  e.preventDefault();
  const rawStart = displayCaretToRawIndex(start, core.display, core.mask, core.maskOptions);
  const rawEnd = displayCaretToRawIndex(end, core.display, core.mask, core.maskOptions);
  e.clipboardData?.setData('text', core.display.slice(start, end));
  commitRaw(core, deleteRawRange(core.raw, rawStart, rawEnd), rawStart, e);
}
