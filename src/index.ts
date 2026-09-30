export { MaskInput } from './components/MaskInput';
export {
  applyMask,
  maskValue,
  unmask,
  getEditablePositions,
  isMaskToken,
  parseMask,
  displayCaretToRawIndex,
  rawIndexToDisplayCaret,
  isEditableDisplayIndex,
  skipEditable,
  firstEditable,
  lastEditable,
  inferInputMode,
} from './core/mask';
export type { MaskOptions, MaskResult, MaskToken, TokenMap, MaskPart } from './core/mask';
export type { MaskInputProps, MaskMeta } from './types';
