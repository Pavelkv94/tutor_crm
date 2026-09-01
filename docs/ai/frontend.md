# Frontend (`frontend-vite/`)

React 19 · Vite 7 · TypeScript (strict) · TailwindCSS 3 · shadcn/Radix · `@tanstack/react-query` v5 ·
axios · react-router-dom v6 · sonner. Package manager **npm**. Path alias `@/` → `src/`.

Style rules come from `.cursor/rules/frontend-dev.mdc`: Tailwind classes only (no CSS files),
early returns, `const` arrow functions with types instead of `function`, event handlers named
`handle*`, a11y attributes on interactive elements, no TODOs/placeholders.
UI copy is in **Russian**.

## Layers

```
pages/            one component per route, owns page state + queries
components/<domain>/   dialogs, tables, cards for that domain
components/ui/    shadcn primitives — regenerate via the CLI, don't hand-roll new ones
api/<resource>.ts one object literal of request functions; the only place URLs live
lib/api-client.ts axios instance + interceptors (token, 401 refresh, error toast)
types/index.ts    hand-written mirror of backend DTOs
```

## Routing

All routes are declared in `src/App.tsx`. Every non-login route is wrapped:

```tsx
<Route path="/plans" element={
  <ProtectedRoute adminOnly>
    <MainLayout><Plans /></MainLayout>
  </ProtectedRoute>
} />
```

- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`): shows a loader while
  `isLoading`, redirects to `/login` when unauthenticated, and to `/` when `adminOnly` and the
  user is not an admin.
- `MaterialViewerPage` is deliberately rendered **without** `MainLayout` (full-screen viewer).
- `*` redirects to `/`.

Admin-only routes today: `/plans`, `/teachers`, `/payments`.

## Auth

`src/contexts/AuthContext.tsx` exposes `useAuth()` → `{ user, isLoading, login, logout,
isAuthenticated, isAdmin }`. `user` is the decoded JWT payload (`{ id: string, login, name, role }`) —
`id` is a **string**, so component code does `parseInt(user?.id || '0', 10)`.

Token plumbing lives in `src/lib/token-utils.ts`; the refresh cookie is handled by the browser
(`withCredentials: true`).

## Talking to the backend

Never call axios from a component. Add a function to the resource module in `src/api/`:

```ts
// src/api/payments.ts
export const paymentsApi = {
  list: async (filter: PaymentsFilter = {}): Promise<Payment[]> => {
    const response = await apiClient.get<Payment[]>('/payments', { params })
    return response.data
  },
  // ...
}
```

`apiClient` (`src/lib/api-client.ts`) already handles:
- attaching `Authorization: Bearer <token>`;
- 401 → single in-flight `POST /auth/refresh-token`, queueing concurrent requests, retrying
  them, and `window.location.href = '/login'` if refresh fails;
- any non-401 error → `showErrorToast(error.response.data)`.

So **mutations normally need no `onError`** — the toast is automatic. Add `onError` only when
you want extra behaviour beyond the toast.

Two deliberate exceptions that bypass `apiClient`:
- `materialsApi.uploadToR2` uses raw `fetch` to PUT the file to a presigned R2 URL
  (no bearer token must be sent to R2).
- `useTasksPendingCountStream` uses `@microsoft/fetch-event-source` and re-implements its own
  401-refresh-and-reconnect loop, because the axios interceptor cannot wrap an SSE stream.

`VITE_API_URL` is read via `import.meta.env` and already includes the `/api` prefix
(`http://localhost:5000/api`). Paths passed to `apiClient` are therefore relative and start
with `/`, e.g. `/payments/invoices`.

## Server state (react-query)

`QueryClient` is configured once in `App.tsx`: `refetchOnWindowFocus: false`, `retry: 1`.

Query keys are inline arrays, hierarchical, resource-first:

```
['students']  ['students', 'active', teacherId]  ['student', studentId]
['teachers', 'active']  ['plans', 'active']  ['plans', filter]
['lessons', year, month, teacherId]  ['lessons', 'rescheduled', teacherId]
['payments', 'list', filter]  ['payments', 'balance', studentId]
['materials', 'courses']  ['materials', 'courses', courseId, 'materials']
['tasks', 'my']  ['tasks', 'pending-count']  ['tasks', 'detail', taskId]
```

There is **no shared query-key factory** — keys are written by hand at each call site.
When adding a query, reuse the existing prefix for that resource so invalidation keeps working.

Lazy loading of dropdown data is done with `enabled:` plus a state flag, e.g.
`useStudentsDirectory(isStudentFilterOpened)` in `pages/Payments.tsx`, or
`enabled: isAdmin && open` in `CreateStudentDialog`.

### Invalidation

Ordinary mutations invalidate their own resource:

```ts
onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }) }
```

Anything that can move money or change a lesson's paid/unpaid status **must** call
`invalidateMoneyQueries(queryClient, studentId)` (`src/lib/invalidate-money.ts`), which
invalidates `['lessons']`, `['payments']`, `['students']` and `['student', studentId]`.
The backend redistributes the balance across lessons on its own, so the client cannot predict
which rows changed. Cancelling a lesson, deleting a lesson, rescheduling, toggling "free",
changing a plan for a period, adjusting a balance, cancelling or applying a payment — all of
these qualify.

## Forms

Forms are plain controlled React state — **no react-hook-form, no zod**. The shape is stable
across the codebase (canonical: `src/components/students/CreateStudentDialog.tsx`):

- one `useState` per field;
- an `isFormValid` boolean derived from the fields;
- `useMutation` whose `onSuccess` invalidates, closes the dialog and resets the fields;
- `handleSubmit` calls `e.preventDefault()`, re-checks required fields, builds the typed input
  object, then `mutation.mutate(data)`;
- submit button `disabled={mutation.isPending || !isFormValid}` with pending/idle labels
  (`'Создание...'` / `'Создать'`).

Dialogs are controlled from the parent page via `open` / `onOpenChange` props and built from
`@/components/ui/dialog` (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`,
`DialogDescription`, `DialogFooter`).

Validation is server-side: the backend's `class-validator` messages surface through the
automatic error toast. There is no client-side schema validation layer.

## Types

`src/types/index.ts` is **hand-maintained**. Nothing generates it from `swagger.json`.
When a backend DTO changes, the corresponding interface here must be edited by hand or the
frontend will compile against a stale contract (TypeScript cannot catch it — the response is
cast via `apiClient.get<T>`).

Several fields carry comments explaining backend constraints that the type alone cannot show
(e.g. why `balance_currency` is absent from `CreateStudentInput`). Preserve those comments.

Domain constants and label maps live in `src/constants/`:
`currency.ts` (`formatMoney`/`formatMoneyValue`/`parseMoney` — **amounts are minor units: 4000 = 40,00**),
`payments.ts` (status/type labels + option arrays), `regions.ts`, `student-class.ts`,
`navigation.ts`.

## Real-time

`src/hooks/useTasksPendingCountStream.ts` subscribes to
`GET /tasks/pending-count/stream` (a Nest `@Sse` endpoint) and pushes each payload into the
react-query cache with `queryClient.setQueryData(['tasks', 'pending-count'], payload)`.
The backend re-emits on task events and on a 25 s interval, with `distinctUntilChanged()`.

## Verification

```bash
cd frontend-vite
npx tsc -b        # typecheck — clean today
npm run lint      # ESLint — 19 PRE-EXISTING errors today, see testing.md
npm run build     # tsc -b && vite build
```

There is **no frontend test runner**. Verification is typecheck + build + manual/browser check.
