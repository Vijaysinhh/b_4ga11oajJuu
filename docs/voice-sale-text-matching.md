# Voice sale text matching

Speech uses browser recognition with `mr-IN`; there is no speaking-language selector. Marathi and English product names and aliases are matched together by local rules. The sale flow makes no Gemini calls and requires no model API key. The browser's speech service may still process microphone audio remotely; this is not a guarantee of offline recognition.

## Local algorithm

- Always capture → clean text → parse quantities/units → find products → check stock. Both finished speech and manual corrections use the same cleanup, before product lookup; interim guesses never trigger lookup.
- Remove invisible formatting characters and normalize Unicode/spacing without translating the readable Marathi transcript.
- Collapse consecutive equivalent quantities, including mixed `one / १ / एक`. For example, `एक एक एक बिस्किट` becomes `एक बिस्किट`, quantity 1, before lookup.
- Collapse adjacent repetitions of known grocery words (such as `दूध दूध`) and repeated units after a quantity. Unknown names and whole item phrases are not deduplicated.
- Preserve explicit additional items, decimals, units, and quantity-plus-price phrases.
- Preserve punctuation/newline order boundaries. `दोन दूध आणि आणखी दोन दूध` remains two requests of quantity 2, combined to 4 in the review; `दोन दोन रुपयांचे बिस्किट` retains quantity 2 and the ₹2 variant.
- Automatically select only unique exact bilingual/alias product matches.
- Offer approximate matches as choices, never silently guess a product or invent IDs.
- Validate stock, expiry, compatible units and quantities before bill addition. Price variants continue through the normal product card.

## Recording lifecycle

One tap starts one browser session with `continuous = false`. There is no automatic microphone restart, and no previous-session transcript is prepended. This returns to the earlier single-session capture approach; it reduces app-side opportunities to replay words, but is not proof that the browser will never emit repetitions.

Final speech slots are committed once. Interim guesses are replaced, including when the browser removes a previous guess. Cleanup always derives from the original current snapshot so a revised quantity or a later price marker can replace the earlier interpretation. The main live display shows confirmed text only.

When the browser ends recognition, confirmed speech is processed immediately. If it ends with unconfirmed words, save the complete text for explicit correction. The browser controls when a pause ends the utterance; use **Speak more** to append another utterance without losing reviewed products. Done/Cancel remain available, and recording is capped at two minutes. No-speech ends the recording without retry loops. Network failures and timeouts retain recovery text. Completion, cancellation and unmount invalidate old callbacks.

API behavior references: [single-result recognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/continuous) and [final/interim result snapshots](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionEvent/results).

## Configuration

No model configuration is needed. Previously configured Gemini environment variables are unused and can be removed from deployment settings. Shop authentication remains unchanged; voice parsing no longer sends credentials to a matching endpoint.

## Verification

Run `npm run type-check`, `npm run test:voice`, and `npm run test:sale`. Tests cover cleanup → parsing → matching → stock validation, long Marathi/mixed-script quantity loops, legitimate additions, price variants, final/interim revisions, one-session completion, late callbacks, cancellation, and absence of AI service calls. They do not use a live microphone.

Before rollout, verify the deployed build loaded by the installed PWA. Test across supported mobile browsers with Marathi-English orders, brand ambiguity, quiet pauses, background noise, denied microphone permission, network interruption and cancellation. Measure time to bill and incorrect product/quantity selections. Synthetic tests cannot certify browser recognition accuracy.
