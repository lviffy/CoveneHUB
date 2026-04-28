# Full Stack TypeScript to JavaScript Migration Checklist

Use this checklist to track your progress step-by-step for a solid, production-grade migration.

## 0. Project-Wide Preparation
- [ ] Create a feature branch: `git checkout -b chore/migrate-ts-to-js`
- [ ] Ensure all current work is committed and working.

---

## 1. Backend Migration (`/backend`)
### Compilation & Extraction
- [ ] Update `backend/tsconfig.json` to compile to modern ES modules (`"outDir": "./dist"`, `"target": "ES2022"`, `"module": "ESNext"`).
- [ ] Run `tsc` to generate JavaScript output in the `/dist` directory.
- [ ] Replace `backend/src` and `backend/scripts` with the compiled `.js` files from `/dist`.
- [ ] Run Prettier to clean up the generated `.js` files (`npx prettier --write backend/src backend/scripts`).

### Cleanup & Configuration
- [ ] Uninstall TS dependencies: `npm uninstall typescript ts-node ts-node-dev @types/node @types/express @types/mongoose @types/cors`
- [ ] Update `backend/package.json`:
  - [ ] Add `"type": "module"`.
  - [ ] Update `"dev"` script (e.g., `nodemon src/app.js`).
  - [ ] Update `"start"` script (e.g., `node src/app.js`).
  - [ ] Remove `"build"` script (`tsc`).
- [ ] Delete `backend/tsconfig.json` and the `backend/src/types` directory.
- [ ] *If keeping `type: "module"`:* Ensure all relative imports have `.js` extensions (e.g., `import { User } from './models/User.js'`).

### Verification
- [ ] Run backend: `cd backend && npm run dev`
- [ ] Smoke test API endpoints and database connection.
- [ ] Run scripts to test: `node scripts/migrate-schema-db.js`

---

## 2. Frontend Migration (`/frontend`)
### Automated Transpilation
- [ ] Install Babel temporarily: `npm i -D @babel/cli @babel/core @babel/preset-typescript @babel/preset-react`
- [ ] Transpile codebase via Babel into `app`, `components`, `src`, `lib`, and `hooks`.
- [ ] Programmatically delete the old `.ts` and `.tsx` files (ignoring `node_modules`).

### Configuration & Tooling
- [ ] Update `tailwind.config.ts`:
  - [ ] Rename to `tailwind.config.js`.
  - [ ] Update `content` array to cover `.js, .jsx`.
- [ ] Rename `vite.config.ts` to `vite.config.js`.
- [ ] Update `components.json`: set `"tsx": false` for Shadcn UI.
- [ ] Update Vite's `index.html` to point to `<script type="module" src="/src/main.jsx"></script>`.
- [ ] Replace `frontend/tsconfig.json` with `frontend/jsconfig.json` (add `"jsx": "preserve"` and path aliases).

### Cleanup
- [ ] Delete strict type directories/files like `frontend/types` and `shared/types.ts`.
- [ ] Clean up typed imports if any slipped through (e.g., `import type`).
- [ ] Uninstall TS & Babel dependencies: `npm uninstall typescript @types/react @types/react-dom @types/node ts-node @typescript-eslint/eslint-plugin @typescript-eslint/parser @babel/cli @babel/core @babel/preset-typescript @babel/preset-react`
- [ ] Update ESLint rules for Javascript and run Prettier over the frontend: `npx prettier --write .`

### Verification
- [ ] Clear bundler cache: `rm -rf .next/ node_modules/.vite/`.
- [ ] Verify production build: `npm run build` (Should have no TS-related compilation errors).
- [ ] Verify development build: `npm run dev`.
- [ ] Click through major UI features (Auth, Layouts, Dashboard).