# Production Migration Plan: TypeScript to JavaScript (Frontend)

This document serves as the canonical, production-grade guide for safely migrating the CoveneHUB frontend from TypeScript to JavaScript. The core goal is absolute fidelity to existing application runtime behavior while stripping static type analysis and tooling comprehensively.

## Phase 1: Pre-Migration Audit & Freeze
Before beginning the migration, the codebase must be isolated to prevent merge conflicts.
1. **Branching & Feature Freeze:**
   - Execute `git checkout -b migration/frontend-ts-to-js`.
   - Enforce a frontend feature freeze until migration is validated.
2. **Review Bundler Ecosystem:**
   - CoveneHUB utilizes a mix of Next.js (`app/` router) and Vite elements. Next.js natively handles `.js`/`.jsx` inside `.next/` pipeline, as does Vite. Zero major build step changes are strictly necessary aside from AST parsers, but specific config files (e.g. `vite.config.ts`, `tailwind.config.ts`) must be addressed without breaking module resolution.

## Phase 2: Automated AST Type Stripping
Manual type shedding is highly prone to human error and regressions. We will use Babel or SWC to strip the TypeScript AST, ensuring 100% preservation of raw runtime logic.

1. **Automated Codemod via Babel CLI:**
   From the `frontend` root, install Babel temporarily:
   ```bash
   npm i -D @babel/cli @babel/core @babel/preset-typescript @babel/preset-react
   ```
2. **Execute Transpilation:**
   Transpile all TS/TSX to JS/JSX, removing type nodes automatically:
   ```bash
   npx babel src --out-dir src --extensions ".ts,.tsx" --presets @babel/preset-typescript,@babel/preset-react
   npx babel app --out-dir app --extensions ".ts,.tsx" --presets @babel/preset-typescript,@babel/preset-react
   npx babel components --out-dir components --extensions ".ts,.tsx" --presets @babel/preset-typescript,@babel/preset-react
   npx babel lib --out-dir lib --extensions ".ts,.tsx" --presets @babel/preset-typescript,@babel/preset-react
   npx babel hooks --out-dir hooks --extensions ".ts,.tsx" --presets @babel/preset-typescript,@babel/preset-react
   ```
3. **Delete Original Context files:**
   After guaranteeing output `.js`/`.jsx` files are generated, programmatically remove the `.ts`/`.tsx` files:
   ```bash
   find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -name "vite-env.d.ts" -delete
   ```
   *Note: Next.js specific routing files inside the `app/` folder (like `page.tsx`, `layout.tsx`) will now be perfectly functioning `page.jsx` and `layout.jsx` files.*

## Phase 3: High-Level Configuration Refactor
Several config arrays specify `.ts/.tsx` extensions that must be updated.

1. **`tailwind.config.ts` \-\> `tailwind.config.js`:**
   - Rename to `.js` and remove any static type `import type ...`.
   - Ensure the `content` array observes `.jsx` and `.js` extensions:
     ```javascript
     content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./src/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
     ```
2. **`components.json` (shadcn/ui):**
   - Update the configuration so future components install as JavaScript:
     ```json
     "tsx": false,
     ```
3. **`vite.config.ts` \-\> `vite.config.js`:**
   - Rename the file.
   - Remove `import { defineConfig } from 'vite'` if it was relying on TS interfaces, standard ES module import `import { defineConfig } from 'vite'` is fine in `.js`.
4. **HTML Template Adjustments:**
   - In `frontend/index.html` (for Vite), update the entry point script to target `.jsx`:
     `<script type="module" src="/src/main.jsx"></script>`

## Phase 4: Module References & Dependencies
Next.js and modern bundlers resolve extension-less imports automatically, but specific files must be addressed.

1. **Type & Interface Imports:**
   - While Babel strips standard imports, ensure files like `frontend/types/database.types.ts` and `shared/types.ts` are completely deleted.
   - If any `import { ... } from '@/types/...'` slipped past Babel's `import type` strip, surgically remove them.
2. **IDE Configurations (`tsconfig.json` to `jsconfig.json`):**
   - Delete `frontend/tsconfig.json`.
   - Create `frontend/jsconfig.json` to restore intellisense pathing:
     ```json
     {
       "compilerOptions": {
         "baseUrl": ".",
         "paths": {
           "@/*": ["./*"]
         },
         "jsx": "preserve"
       }
     }
     ```
3. **Dependency Cleanup:**
   Purge development dependencies specifically for Typescript across the frontend:
   ```bash
   npm uninstall typescript @types/react @types/react-dom @types/node ts-node @typescript-eslint/eslint-plugin @typescript-eslint/parser
   ```
   *(Also remove Babel if temporary CLI used in Phase 2)*

## Phase 5: Verification & Quality Assurance (QA)
A production migration requires validation of absolute runtime fidelity.

1. **Lint and Formatting Audit:**
   - Reconfigure ESLint strictly for `.js`/`.jsx` rules.
   - Run Prettier to conform the Babel-emitted source files to repo standards.
     ```bash
     npm run lint -- --fix
     npx prettier --write .
     ```
2. **Production Build Sequence:**
   - Flush the cache: `rm -rf .next/ node_modules/.vite/`.
   - Validate Production Build Engine:
     ```bash
     npm run build
     ```
     Ensure No `TS2304` or `Module not found` errors occur on previously typed `.ts` exports.
3. **End-to-End Environment Run:**
   Spin up the dev environment with `npm run dev` and smoke-test:
   - Root auth layouts (`app/auth`, `app/login`).
   - Dynamic routing pages.
   - Shadcn frontend UI interactions.
   - Re-verify any direct API call responses that were previously tightly bound to `shared/types.ts` models.
