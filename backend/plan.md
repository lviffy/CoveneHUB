# Migration Plan: TypeScript to JavaScript (Backend)

This document outlines the step-by-step process for converting the existing CoveneHUB Node.js/Express backend from TypeScript back to JavaScript.

## Phase 1: Preparation & Strategy
Before modifying files, ensure we have a clean working state.
1. **Create a Backup / Branch:** Ensure all current backend work is committed and create a new feature branch (e.g., `git checkout -b chore/migrate-ts-to-js`).
2. **Decide on Module System:** Node.js natively supports CommonJS (`require()`) and ES Modules (`import/export`). Since the TS code uses `import/export`, it is usually easiest to keep the ES syntax and set `"type": "module"` in the `backend/package.json` to avoid rewriting all imports to `require()`.

## Phase 2: Convert Files from `.ts` to `.js`
There are two main approaches here. The recommended approach is to let the TypeScript compiler strip the types out for us.

### Approach 1 (Automated - Recommended)
Use `tsc` to compile the codebase to ES6+ JavaScript, then replace the source files with the compiled output.
1. Update `backend/tsconfig.json`:
   - Set `"outDir": "./dist"`
   - Set `"target": "ES2022"`
   - Set `"module": "ESNext"`, `"moduleResolution": "node"`
2. Run `tsc` to generate the `.js` files in the `dist` folder.
3. Replace the `backend/src` and `backend/scripts` directories with the contents of the `dist` directory.
4. Run `npx prettier --write backend/src backend/scripts` to clean up the generated JavaScript.

### Approach 2 (Manual)
1. Rename all `.ts` files to `.js`.
2. Go through each file and manually remove type annotations (e.g., `req: Request, res: Response`, interfaces, type imports).
3. Remove generic types from Mongoose models (e.g., `Model<IUser>` becomes just `Model`).

## Phase 3: Update Project Configuration
1. **Remove TypeScript Dependencies:**
   Run the following inside the `backend` folder:
   ```bash
   npm uninstall typescript ts-node ts-node-dev @types/node @types/express @types/mongoose @types/cors # (plus any other @types/* packages)
   ```
2. **Update `backend/package.json`:**
   - Add `"type": "module"` (if keeping `import/export` syntax).
   - Update scripts:
     - Change `"dev": "ts-node-dev src/app.ts"` to `"dev": "nodemon src/app.js"` (Note: you will need to install `nodemon`: `npm install -D nodemon`).
     - Change `"start": "node dist/app.js"` to `"start": "node src/app.js"`.
     - Remove the `"build": "tsc"` script.
3. **Delete TypeScript Config files:**
   - Delete `backend/tsconfig.json`.
   - Delete `backend/src/types` directory as it contains TS-only type definitions.

## Phase 4: Refactoring Imports for ES Modules (If using "type": "module")
If you choose to use ES modules natively in Node.js, you must ensure that all relative imports include the `.js` extension.
- **Before:** `import { UserModel } from './models/User';`
- **After:** `import { UserModel } from './models/User.js';`
*Note: A global find-and-replace or a specialized codemod can help automate this.*

## Phase 5: Cleanup & Testing
1. **Remove redundant folders:** Delete the old `dist` or `build` folders since you'll be running source directly.
2. **Run the server:**
   ```bash
   cd backend
   npm run dev
   ```
3. **Run existing scripts** recursively (e.g., test out `migrate-schema-db.js` using `node`).
4. **Smoke test APIs:** Hit your endpoints (via Postman, the frontend, or `smoke-test-api.js`) to ensure controllers and database models operate normally without their static type definitions.
