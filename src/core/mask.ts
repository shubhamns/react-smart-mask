export type MaskToken = '9' | 'A' | '*';
export type TokenPattern = RegExp;
export type TokenMap = Partial<Record<MaskToken, TokenPattern>>;
export interface MaskOptions {
  tokens?: TokenMap;
  maskChar?: string | null;
}
export interface MaskResult {
  value: string;
  rawValue: string;
  isComplete: boolean;
}
export type MaskPart = { kind: 'literal'; value: string } | { kind: 'token'; token: MaskToken };
const DEFAULT_TOKENS: Record<MaskToken, RegExp> = {
  '9': /[0-9]/,
  A: /[a-zA-Z]/,
  '*': /[a-zA-Z0-9]/,
};
export const isMaskToken = (char: string): char is MaskToken => char === '9' || char === 'A' || char === '*';
function matches(pattern: RegExp, char: string) {
  pattern.lastIndex = 0;
  return pattern.test(char);
}
export function parseMask(mask: string): MaskPart[] {
  const parts: MaskPart[] = [];
  let i = 0;
  while (i < mask.length) {
    const c = mask[i];
    if (c === '{') {
      const end = mask.indexOf('}', i + 1);
      if (end === -1) {
        parts.push({ kind: 'literal', value: '{' });
        i++;
        continue;
      }
      parts.push({ kind: 'literal', value: mask.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (c === '\\' && i + 1 < mask.length) {
      parts.push({ kind: 'literal', value: mask[i + 1] });
      i += 2;
      continue;
    }
    if (isMaskToken(c)) {
      parts.push({ kind: 'token', token: c });
      i++;
      continue;
    }
    let lit = c;
    while (i + 1 < mask.length) {
      const n = mask[i + 1];
      if (n === '{' || n === '\\' || isMaskToken(n)) break;
      lit += n;
      i++;
    }
    parts.push({ kind: 'literal', value: lit });
    i++;
  }
  return parts;
}
export function applyMask(input: string, mask: string, options: MaskOptions = {}): MaskResult {
  const tokens = { ...DEFAULT_TOKENS, ...options.tokens };
  const chars = Array.from(input);
  const parts = parseMask(mask);
  let i = 0,
    value = '',
    rawValue = '',
    complete = true;
  for (const part of parts) {
    if (part.kind === 'literal') {
      if (value.length > 0 || i < chars.length) value += part.value;
      continue;
    }
    let found = false;
    while (i < chars.length) {
      const c = chars[i++];
      if (matches(tokens[part.token], c)) {
        value += c;
        rawValue += c;
        found = true;
        break;
      }
    }
    if (!found) {
      complete = false;
      break;
    }
  }
  return { value, rawValue, isComplete: mask.length === 0 ? true : complete };
}
export function rawFromDisplay(display: string, mask: string, options: MaskOptions = {}): string {
  const tokens = { ...DEFAULT_TOKENS, ...options.tokens };
  const maskChar = options.maskChar;
  const parts = parseMask(mask);
  let pos = 0;
  let raw = '';
  for (const part of parts) {
    if (part.kind === 'literal') {
      const lit = part.value;
      if (!display.startsWith(lit, pos)) return raw;
      pos += lit.length;
      continue;
    }
    if (pos >= display.length) break;
    const ch = display[pos];
    if (maskChar && ch === maskChar) break;
    if (!matches(tokens[part.token], ch)) break;
    raw += ch;
    pos++;
  }
  return raw;
}
export function unmask(value: string, mask: string, options: MaskOptions = {}): string {
  const prefix = leadingLiteralPrefix(mask);
  if (prefix && value.startsWith(prefix)) return rawFromDisplay(value, mask, options);
  return applyMask(value, mask, options).rawValue;
}
export function maskValue(rawValue: string, mask: string, options: MaskOptions = {}): string {
  return applyMask(rawValue, mask, options).value;
}
export function maskDisplayWithChar(
  rawValue: string,
  mask: string,
  maskChar: string,
  options: MaskOptions = {},
): string {
  const tokens = { ...DEFAULT_TOKENS, ...options.tokens };
  const parts = parseMask(mask);
  let rawi = 0;
  const raw = Array.from(rawValue);
  let result = '';
  for (const part of parts) {
    if (part.kind === 'literal') {
      result += part.value;
      continue;
    }
    if (rawi < raw.length && matches(tokens[part.token], raw[rawi])) {
      result += raw[rawi++];
    } else {
      result += maskChar;
    }
  }
  return result;
}
export function leadingLiteralPrefix(mask: string): string {
  const parts = parseMask(mask);
  let prefix = '';
  for (const part of parts) {
    if (part.kind === 'token') break;
    prefix += part.value;
  }
  return prefix;
}
export function isMaskTemplateActive(
  raw: string,
  mask: string,
  options: MaskOptions = {},
  focused: boolean,
  showMaskOnFocus = true,
): boolean {
  if (!focused || !showMaskOnFocus || applyMask(raw, mask, options).isComplete) return false;
  const maskChar = options.maskChar;
  if (maskChar != null && maskChar !== '') return true;
  return raw === '' && leadingLiteralPrefix(mask).length > 0;
}
export function resolveInputDisplay(
  raw: string,
  mask: string,
  options: MaskOptions = {},
  templateActive: boolean,
): string {
  const maskChar = options.maskChar;
  if (templateActive && maskChar != null && maskChar !== '') return maskDisplayWithChar(raw, mask, maskChar, options);
  if (templateActive && raw === '') return leadingLiteralPrefix(mask);
  return maskValue(raw, mask, options);
}
export function focusCaretForMask(
  raw: string,
  mask: string,
  options: MaskOptions = {},
  showMaskOnFocus = true,
): number {
  if (!showMaskOnFocus || applyMask(raw, mask, options).isComplete) return 0;
  const active = isMaskTemplateActive(raw, mask, options, true, showMaskOnFocus);
  const display = resolveInputDisplay(raw, mask, options, active);
  if (options.maskChar != null && options.maskChar !== '') return firstEmptySlot(display, mask, options);
  if (raw === '' && leadingLiteralPrefix(mask)) return firstEditable(display, mask, options);
  return firstEmptySlot(display, mask, options);
}
export function getEditablePositions(mask: string): number[] {
  const result: number[] = [];
  const parts = parseMask(mask);
  let maskIndex = 0;
  for (const part of parts) {
    if (part.kind === 'literal') maskIndex += part.value.length;
    else {
      result.push(maskIndex);
      maskIndex++;
    }
  }
  return result;
}
export function displayCaretToRawIndex(
  caret: number,
  display: string,
  mask: string,
  options: MaskOptions = {},
): number {
  const tokens = { ...DEFAULT_TOKENS, ...options.tokens };
  const parts = parseMask(mask);
  let raw = 0,
    pos = 0;
  for (const part of parts) {
    if (part.kind === 'literal') {
      const len = part.value.length;
      if (caret <= pos + len) return raw;
      pos += len;
      continue;
    }
    if (caret <= pos) return raw;
    const ch = display[pos];
    const maskChar = options.maskChar;
    if (maskChar && ch === maskChar) return raw;
    if (ch && matches(tokens[part.token], ch)) {
      raw++;
      pos++;
      continue;
    }
    return raw;
  }
  return raw;
}
export function rawIndexToDisplayCaret(
  rawIndex: number,
  raw: string,
  mask: string,
  options: MaskOptions = {},
  displayValue?: string,
): number {
  const { value: masked } = applyMask(raw, mask, options);
  const value = displayValue ?? masked;
  const maskChar = options.maskChar;
  if (rawIndex <= 0) return firstEditable(value, mask, options);
  if (rawIndex >= raw.length) {
    if (maskChar && displayValue) return firstEmptySlot(displayValue, mask, options);
    return value.length;
  }
  const tokens = { ...DEFAULT_TOKENS, ...options.tokens };
  const parts = parseMask(mask);
  let ri = 0,
    pos = 0,
    pi = 0;
  for (; pi < parts.length; pi++) {
    const part = parts[pi];
    if (part.kind === 'literal') {
      if (value.startsWith(part.value, pos)) pos += part.value.length;
      else break;
      continue;
    }
    const ch = value[pos];
    if (maskChar && ch === maskChar) {
      if (ri === rawIndex) return pos;
      return pos;
    }
    if (!ch) break;
    if (matches(tokens[part.token], ch)) {
      ri++;
      pos++;
      if (ri === rawIndex) {
        let j = pi + 1;
        while (j < parts.length) {
          const litPart = parts[j];
          if (litPart.kind !== 'literal') break;
          if (value.startsWith(litPart.value, pos)) {
            pos += litPart.value.length;
            j++;
          } else break;
        }
        return pos;
      }
    } else break;
  }
  return pos;
}
export function isEditableDisplayIndex(
  index: number,
  display: string,
  mask: string,
  options: MaskOptions = {},
): boolean {
  const tokens = { ...DEFAULT_TOKENS, ...options.tokens };
  const parts = parseMask(mask);
  let pos = 0;
  for (const part of parts) {
    if (part.kind === 'literal') {
      if (index >= pos && index < pos + part.value.length) return false;
      pos += part.value.length;
      continue;
    }
    if (index === pos) return true;
    const ch = display[pos];
    const maskChar = options.maskChar;
    if (maskChar && ch === maskChar) return index === pos;
    if (!ch) return index === pos;
    if (matches(tokens[part.token], ch)) {
      pos++;
      continue;
    }
    return index === pos;
  }
  return false;
}
export function firstEditable(display: string, mask: string, options: MaskOptions = {}): number {
  for (let i = 0; i <= display.length; i++) if (isEditableDisplayIndex(i, display, mask, options)) return i;
  return 0;
}
export function firstEmptySlot(display: string, mask: string, options: MaskOptions = {}): number {
  const maskChar = options.maskChar;
  const tokens = { ...DEFAULT_TOKENS, ...options.tokens };
  const parts = parseMask(mask);
  let pos = 0;
  for (const part of parts) {
    if (part.kind === 'literal') {
      pos += part.value.length;
      continue;
    }
    const ch = display[pos];
    if (ch === undefined || (maskChar && ch === maskChar)) return pos;
    if (!matches(tokens[part.token], ch)) return pos;
    pos++;
  }
  return display.length;
}
export function lastEditable(display: string, mask: string, options: MaskOptions = {}): number {
  for (let i = display.length; i >= 0; i--) if (isEditableDisplayIndex(i, display, mask, options)) return i;
  return display.length;
}
export function skipEditable(
  display: string,
  mask: string,
  index: number,
  dir: -1 | 1,
  options: MaskOptions = {},
): number {
  let p = index + dir;
  const max = display.length;
  while (p >= 0 && p <= max) {
    if (p === max && dir === 1) return max;
    if (isEditableDisplayIndex(p, display, mask, options)) return p;
    p += dir;
  }
  return dir === -1 ? firstEditable(display, mask, options) : lastEditable(display, mask, options);
}
export function deleteRawRange(raw: string, start: number, end: number): string {
  return raw.slice(0, start) + raw.slice(end);
}
export function insertRaw(raw: string, index: number, text: string, mask: string, options: MaskOptions = {}): string {
  const tokens = { ...DEFAULT_TOKENS, ...options.tokens };
  const parts = parseMask(mask);
  const allowed = parts
    .filter((p): p is { kind: 'token'; token: MaskToken } => p.kind === 'token')
    .map((p) => tokens[p.token]);
  let merged = raw.slice(0, index);
  for (const c of Array.from(text)) {
    if (allowed.some((re) => matches(re, c))) merged += c;
  }
  merged += raw.slice(index);
  return applyMask(merged, mask, options).rawValue;
}
export function inferInputMode(mask: string): 'text' | 'numeric' | 'tel' | undefined {
  const parts = parseMask(mask);
  const hasLetter = parts.some((p) => p.kind === 'token' && (p.token === 'A' || p.token === '*'));
  const hasDigit = parts.some((p) => p.kind === 'token' && (p.token === '9' || p.token === '*'));
  if (hasLetter && hasDigit) return 'text';
  if (hasDigit && !hasLetter) return 'numeric';
  return undefined;
}
