# Voice sale text matching

Speech stays in browser recognition using `mr-IN`; the app has no speaking-language selector. Marathi and English product names and aliases are matched together. Only transcript text and a bounded product shortlist are sent to Gemini, never microphone audio by this endpoint. The browser's own recognition service may still process audio remotely.

Consecutive equivalent quantity words are collapsed locally. Exact unique product matches skip AI. For uncertain names, up to six candidates per line are submitted, with server limits of 20 lines, 60 unique candidates and 2,000 transcript characters. The server obtains names, unit, selling price, available stock, expiry and price variants from the selected shop. Credentials, customer data and purchase prices are excluded from the model prompt.

## Configuration

Set `GEMINI_API_KEY` in server environment variables (`.env.local` locally). Optionally set `GEMINI_TEXT_MODEL`; default is `gemini-3.5-flash-lite`. Restart the app after changing environment variables. Never use a `NEXT_PUBLIC_` prefix for the Gemini key. Set provider quotas/budgets for spending control: the endpoint's per-instance rate limiter is not a distributed monthly limit.

The app uses a legacy custom users/password login, not Supabase Auth. This endpoint validates that existing user credential against the user's shop before calling Gemini; it does not trust the client-generated auth cookie. A synthetic super-admin login without a database user is not accepted and uses local matching. Migrating the application's legacy authentication to proper server sessions is separate work.

## Behaviour

- AI responses must reference existing shortlisted product IDs and include each submitted line exactly once.
- Ambiguous brands stay unresolved. Quantities, units, prices, stock and expiry are checked by the app before bill addition.
- Missing key, offline operation, timeouts, invalid responses and provider errors retain local candidate review and search.
- Cancel and unmount invalidate pending responses.
- Recording is manual Done/Cancel with browser-session restarts; it is capped at two minutes, preserving text for review after timeout.

## Verification

Run `npm run type-check` and `npm run test:voice`. Automated tests cover Marathi/English parsing, repeated quantities, decimal units, expiry and stock, recording lifecycle, and AI response validation. No live model call is made by the test suite.

Before rollout, test on the actual Android/browser and shop network with mixed Marathi-English orders, brand ambiguity, zero stock, expired stock, denied microphone permission, network interruption, correction, and cancellation. Measure time to bill and incorrect product/quantity selections. Browser speech accuracy and live Gemini interpretation cannot be certified by the synthetic tests.
