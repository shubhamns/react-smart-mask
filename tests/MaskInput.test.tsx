import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { MaskInput } from '../src';

function setSelection(el: HTMLInputElement, start: number, end = start) {
  el.setSelectionRange(start, end);
  el.dispatchEvent(new Event('select', { bubbles: true }));
}

describe('MaskInput', () => {
  it('shows prefix literals on focus and places caret after them', () => {
    render(<MaskInput aria-label="phone" mask="{+91 }99999 99999" placeholder="XXXXX XXXXX" />);
    const input = screen.getByLabelText('phone') as HTMLInputElement;
    expect(input).toHaveValue('');
    fireEvent.focus(input);
    expect(input).toHaveValue('+91 ');
    expect(input.selectionStart).toBe('+91 '.length);
    fireEvent.blur(input);
    expect(input).toHaveValue('');
  });
  it('shows maskChar template on focus', () => {
    render(<MaskInput aria-label="date" mask="99/99/9999" maskChar="_" />);
    const input = screen.getByLabelText('date') as HTMLInputElement;
    expect(input).toHaveValue('');
    fireEvent.focus(input);
    expect(input).toHaveValue('__/__/____');
    expect(input.selectionStart).toBe(0);
    fireEvent.blur(input);
    expect(input).toHaveValue('');
  });
  it('formats user input', () => {
    render(<MaskInput aria-label="phone" mask="99999 99999" />);
    const input = screen.getByLabelText('phone') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '9876543210' } });
    expect(input).toHaveValue('98765 43210');
  });
  it('supports controlled raw values', () => {
    const onChange = vi.fn();
    render(<MaskInput aria-label="phone" mask="99999 99999" value="9876543210" onChange={onChange} />);
    expect(screen.getByLabelText('phone')).toHaveValue('98765 43210');
  });
  it('supports uncontrolled defaultValue', () => {
    render(<MaskInput aria-label="phone" mask="9999" defaultValue="12" />);
    expect(screen.getByLabelText('phone')).toHaveValue('12');
  });
  it('fires onComplete', () => {
    const onComplete = vi.fn();
    render(<MaskInput aria-label="pin" mask="9999" onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText('pin'), { target: { value: '1234' } });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it('forwards ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<MaskInput ref={ref} aria-label="x" mask="9999" />);
    expect(ref.current?.tagName).toBe('INPUT');
  });
  it('deletes around slash literal with backspace', () => {
    render(<MaskInput aria-label="date" mask="99/99/9999" defaultValue="2909" />);
    const input = screen.getByLabelText('date') as HTMLInputElement;
    setSelection(input, 3, 3);
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(input).toHaveValue('20/9');
  });
  it('deletes selection', () => {
    render(<MaskInput aria-label="date" mask="99/99/9999" defaultValue="29092026" />);
    const input = screen.getByLabelText('date') as HTMLInputElement;
    setSelection(input, 0, 3);
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(input).toHaveValue('09/20/26');
  });
  it('handles delete key', () => {
    render(<MaskInput aria-label="date" mask="99/99/9999" defaultValue="2909" />);
    const input = screen.getByLabelText('date') as HTMLInputElement;
    setSelection(input, 0, 0);
    fireEvent.keyDown(input, { key: 'Delete' });
    expect(input).toHaveValue('90/9');
  });
  it('pastes digits into mask', () => {
    render(<MaskInput aria-label="phone" mask="99999 99999" />);
    const input = screen.getByLabelText('phone') as HTMLInputElement;
    setSelection(input, 0, 0);
    fireEvent.paste(input, { clipboardData: { getData: () => '9876543210' } });
    expect(input).toHaveValue('98765 43210');
  });
  it('cuts selection', () => {
    render(<MaskInput aria-label="phone" mask="99999 99999" defaultValue="9876543210" />);
    const input = screen.getByLabelText('phone') as HTMLInputElement;
    setSelection(input, 0, 6);
    fireEvent.cut(input, { clipboardData: { getData: () => '', setData: () => undefined } });
    expect(input).toHaveValue('43210 ');
  });
  it('skips literals with arrow keys', () => {
    render(<MaskInput aria-label="date" mask="99/99/9999" defaultValue="2909" />);
    const input = screen.getByLabelText('date') as HTMLInputElement;
    setSelection(input, 2, 2);
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(input.selectionStart).toBe(3);
  });
  it('moves to first editable on Home', () => {
    render(<MaskInput aria-label="date" mask="99/99/9999" defaultValue="29092026" />);
    const input = screen.getByLabelText('date') as HTMLInputElement;
    setSelection(input, 10, 10);
    fireEvent.keyDown(input, { key: 'Home' });
    expect(input.selectionStart).toBe(0);
  });
  it('passes aria attributes', () => {
    render(<MaskInput aria-label="phone" aria-invalid={true} mask="9999" />);
    expect(screen.getByLabelText('phone')).toHaveAttribute('aria-invalid', 'true');
  });
  it('sets numeric inputMode for digit masks', () => {
    render(<MaskInput aria-label="pin" mask="9999" />);
    expect(screen.getByLabelText('pin')).toHaveAttribute('inputmode', 'numeric');
  });
});

describe('SSR', () => {
  it('renders initial markup without window access', () => {
    const html = render(<MaskInput aria-label="ssr" mask="9999" defaultValue="12" />).container.innerHTML;
    expect(html).toContain('value="12"');
  });
});
