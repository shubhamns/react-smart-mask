import type { ChangeEvent, InputHTMLAttributes, Ref } from 'react';
import type { MaskOptions } from '../core/mask';
export interface MaskMeta {
  value: string;
  rawValue: string;
  isComplete: boolean;
}
export interface MaskInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange'
> {
  mask: string;
  value?: string;
  defaultValue?: string;
  maskChar?: string | null;
  showMaskOnFocus?: boolean;
  maskOptions?: MaskOptions;
  onChange?: (value: string, meta: MaskMeta, event: ChangeEvent<HTMLInputElement>) => void;
  onComplete?: (value: string, meta: MaskMeta) => void;
  inputRef?: Ref<HTMLInputElement>;
}
