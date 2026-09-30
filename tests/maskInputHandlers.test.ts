import { describe, expect, it, vi } from 'vitest';
import { handleBeforeInput, handleChange, type MaskInputCore } from '../src/core/maskInputHandlers';
import { resolveInputDisplay } from '../src/core/mask';

function core(overrides: Partial<MaskInputCore> = {}): MaskInputCore {
  return {
    mask: '{+91 }99999 99999',
    raw: '691',
    display: '+91 691',
    composing: false,
    input: null,
    caretRef: { current: [8, 8] },
    templateActive: false,
    focused: false,
    showMaskOnFocus: true,
    committedRawRef: { current: '6918' },
    setRaw: vi.fn(),
    emit: vi.fn(),
    ...overrides,
  };
}

describe('mask input handlers', () => {
  it('inserts consecutive digits in maskChar template order', () => {
    const mask = '99/99/9999';
    const maskOptions = { maskChar: '_' };
    const committedRawRef = { current: '' };
    const caretRef: { current: [number, number] | null } = { current: null };
    let raw = '';
    const input = document.createElement('input');
    const buildCore = (): MaskInputCore => ({
      mask,
      maskOptions,
      raw,
      display: resolveInputDisplay(raw, mask, maskOptions, true),
      templateActive: true,
      focused: true,
      showMaskOnFocus: true,
      composing: false,
      input,
      caretRef,
      committedRawRef,
      setRaw: (next) => {
        raw = next;
      },
      emit: (next) => {
        raw = next;
      },
    });
    const runInsert = (data: string, caret: number) => {
      Object.defineProperty(input, 'selectionStart', { get: () => caret, configurable: true });
      Object.defineProperty(input, 'selectionEnd', { get: () => caret, configurable: true });
      const preventDefault = vi.fn();
      handleBeforeInput(buildCore(), {
        preventDefault,
        nativeEvent: { inputType: 'insertText', data },
      } as unknown as React.FormEvent<HTMLInputElement>);
    };
    runInsert('2', 0);
    expect(raw).toBe('2');
    runInsert('0', 1);
    expect(raw).toBe('20');
  });
  it('parses change without swallowing literal prefix digits', () => {
    const mask = '{+91 }99999 99999';
    const maskOptions = { maskChar: undefined as string | undefined };
    const committedRawRef = { current: '' };
    const caretRef: { current: [number, number] | null } = { current: null };
    let raw = '';
    const input = document.createElement('input');
    input.value = '+91 8';
    Object.defineProperty(input, 'selectionStart', { get: () => 5, configurable: true });
    Object.defineProperty(input, 'selectionEnd', { get: () => 5, configurable: true });
    handleChange(
      {
        mask,
        maskOptions,
        raw,
        display: '+91 ',
        templateActive: true,
        composing: false,
        input,
        caretRef,
        committedRawRef,
        setRaw: (next) => {
          raw = next;
        },
        focused: true,
        showMaskOnFocus: true,
        emit: (next) => {
          raw = next;
        },
      },
      { target: input } as React.ChangeEvent<HTMLInputElement>,
    );
    expect(raw).toBe('8');
  });
  it('skips change when raw was already committed by beforeInput', () => {
    const c = core();
    const input = document.createElement('input');
    input.value = '+91 6918';
    Object.defineProperty(input, 'selectionStart', { get: () => 0 });
    Object.defineProperty(input, 'selectionEnd', { get: () => 0 });
    handleChange({ ...c, input }, { target: input } as React.ChangeEvent<HTMLInputElement>);
    expect(c.setRaw).not.toHaveBeenCalled();
    expect(c.emit).not.toHaveBeenCalled();
    expect(c.caretRef.current).toEqual([8, 8]);
  });
});
