# Voice sale text matching

Speech uses browser recognition with `mr-IN`; there is no speaking-language selector. Marathi and English product names and aliases are matched together by local rules. The sale flow makes no Gemini calls and requires no model API key. The browser's speech service may still process microphone audio remotely; this is not a guarantee of offline recognition.

## Local algorithm

- Collapse consecutive equivalent quantities, including mixed `one / १ / एक`.
- Preserve explicit additional items, decimals, units, and quantity-plus-price phrases.
- Automatically select only unique exact bilingual/alias product matches.
- Offer approximate matches as choices, never silently guess a product or invent IDs.
- Validate stock, expiry, compatible units and quantities before bill addition. Price variants continue through the normal product card.

## Recording lifecycle

Final speech slots are committed once per browser session. Interim guesses are replaced, including when the browser removes a previous guess. The main live display shows confirmed text only.

A browser restart carries confirmed words only. If a session ends with unconfirmed words, save the complete text for explicit correction rather than promote those words into the next session. Done/Cancel remain available. Two empty restarts after a confirmed order finish it; recording is capped at two minutes. Network failures and timeouts retain recovery text. Cancel and unmount invalidate old callbacks.

## Configuration

No model configuration is needed. Previously configured Gemini environment variables are unused and can be removed from deployment settings. Shop authentication remains unchanged; voice parsing no longer sends credentials to a matching endpoint.

## Verification

Run `npm run type-check`, `npm run test:voice`, and `npm run test:sale`. Tests cover local parsing, matching, stock validation, final/interim results, restart boundaries, cancellation, and absence of AI service calls. They do not use a live microphone.

Before rollout, verify the deployed build loaded by the installed PWA. Test across supported mobile browsers with Marathi-English orders, brand ambiguity, quiet pauses, background noise, denied microphone permission, network interruption and cancellation. Measure time to bill and incorrect product/quantity selections. Synthetic tests cannot certify browser recognition accuracy.
