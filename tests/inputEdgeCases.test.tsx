import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MaskInput } from '../src';

function setSelection(el: HTMLInputElement, start: number, end = start) {
  el.setSelectionRange(start, end);
}

describe('MaskInput edge cases', () => {
  it('preserves caret at end after append change', () => {
    render(<MaskInput aria-label="date" mask="9999" defaultValue="12" />);
    const input = screen.getByLabelText('date') as HTMLInputElement;
    setSelection(input, 2, 2);
    fireEvent.change(input, { target: { value: '123' } });
    expect(input).toHaveValue('123');
    expect(input.selectionStart).toBe(3);
  });
  it('calls user onKeyDown before internal handling', () => {
    const onKeyDown = vi.fn();
    render(<MaskInput aria-label="x" mask="9999" onKeyDown={onKeyDown} />);
    fireEvent.keyDown(screen.getByLabelText('x'), { key: 'ArrowLeft' });
    expect(onKeyDown).toHaveBeenCalled();
  });
  it('respects defaultPrevented paste handler', () => {
    const onPaste = vi.fn((e) => e.preventDefault());
    render(<MaskInput aria-label="x" mask="9999" onPaste={onPaste} />);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    fireEvent.paste(input, { clipboardData: { getData: () => '1234' } });
    expect(input).toHaveValue('');
  });
  it('updates controlled value from parent', () => {
    const { rerender } = render(<MaskInput aria-label="x" mask="9999" value="12" />);
    expect(screen.getByLabelText('x')).toHaveValue('12');
    rerender(<MaskInput aria-label="x" mask="9999" value="1234" />);
    expect(screen.getByLabelText('x')).toHaveValue('1234');
  });
  it('handles composition end with inserted text', () => {
    render(<MaskInput aria-label="x" mask="9999" />);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    fireEvent.compositionStart(input, { data: '' });
    fireEvent.compositionEnd(input, { data: '12' });
    expect(input).toHaveValue('12');
  });
});
