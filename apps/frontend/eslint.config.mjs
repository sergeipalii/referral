import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({ resolveRelativeTo: __dirname });

const eslintConfig = [...compat.extends('next/core-web-vitals', 'next/typescript')];

export default eslintConfig;
