import { randomBytes } from 'crypto';
import { ALARM_CONST } from '../constants/alarm.constants';

const { HEX_RADIX, BIN_RADIX, BIT_LENGTH, EMPTY_BIT } = ALARM_CONST;

export function randomString(len: number): string {
  return randomBytes(len).toString('hex');
}
export function hex2bin(hex: string) {
  return parseInt(hex, HEX_RADIX)
    .toString(BIN_RADIX)
    .padStart(BIT_LENGTH, EMPTY_BIT.toString());
}