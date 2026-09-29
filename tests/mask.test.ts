import { describe, expect, it } from 'vitest';
import {
  applyMask,
  displayCaretToRawIndex,
  firstEditable,
  getEditablePositions,
  maskValue,
  parseMask,
  rawIndexToDisplayCaret,
  skipEditable,
  unmask,
} from '../src/core/mask';

describe('mask engine', () => {
  it('formats phone with literal block', () => {
    expect(applyMask('9876543210', '{+91 }99999 99999')).toEqual({
      value: '+91 98765 43210',
      rawValue: '9876543210',
      isComplete: true,
    });
  });
  it('formats date', () => expect(maskValue('29092026', '99/99/9999')).toBe('29/09/2026'));
  it('supports letters', () => expect(maskValue('ABCDE1234F', 'AAAAA9999A')).toBe('ABCDE1234F'));
  it('ignores invalid characters', () => expect(maskValue('98abc765', '999999')).toBe('98765'));
  it('unmasks formatted value', () => expect(unmask('29/09/2026', '99/99/9999')).toBe('29092026'));
  it('reports incomplete values', () => expect(applyMask('123', '9999').isComplete).toBe(false));
  it('parses brace literals and escapes', () => {
    expect(parseMask('{+91 }99')).toEqual([
      { kind: 'literal', value: '+91 ' },
      { kind: 'token', token: '9' },
      { kind: 'token', token: '9' },
    ]);
    expect(parseMask('\\9')).toEqual([{ kind: 'literal', value: '9' }]);
  });
  it('supports custom tokens', () => {
    expect(maskValue('ab12', 'AA-99', { tokens: { A: /[a-z]/ } })).toBe('ab-12');
  });
  it('maps caret positions', () => {
    const mask = '99/99/9999';
    const display = maskValue('2909', mask);
    expect(displayCaretToRawIndex(3, display, mask)).toBe(2);
    expect(rawIndexToDisplayCaret(2, '2909', mask)).toBe(3);
  });
  it('finds editable positions', () => {
    const mask = '99/99/9999';
    const display = maskValue('2909', mask);
    expect(firstEditable(display, mask)).toBe(0);
    expect(skipEditable(display, mask, 2, 1, {})).toBe(3);
    expect(getEditablePositions('99/99')).toEqual([0, 1, 3, 4]);
  });
});
