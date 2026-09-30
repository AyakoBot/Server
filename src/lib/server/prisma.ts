import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type * as Generated from '../../../../../prisma-client-generated/index.js';

const generated = createRequire(resolve(process.cwd(), 'package.json'))(
	'../../prisma-client-generated',
) as typeof Generated;

export type * from '../../../../../prisma-client-generated/index.js';
export const { PrismaClient, ArtType, FormulaType, AnswerType } = generated;
export type ArtType = Generated.ArtType;
