import { alarm } from './alarm/index.ts';
import { timer } from './timer/index.ts';
import type { DashApp } from './types.ts';

export const apps: DashApp[] = [timer, alarm];
