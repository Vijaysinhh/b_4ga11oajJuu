# Voice sale release control

Voice sale is an experimental feature. It is hidden by default and must be
explicitly enabled at build time.

## Local development

Set this in `.env.local` and restart `npm run dev`:

```env
NEXT_PUBLIC_ENABLE_VOICE_SALE=true
```

The repository's ignored `.env.development.local` already enables it for this
workspace. The normal search and sale flow still work when voice is disabled.

## Production

Leave the variable unset, or set it explicitly in the hosting dashboard:

```env
NEXT_PUBLIC_ENABLE_VOICE_SALE=false
```

Environment variables prefixed with `NEXT_PUBLIC_` are included at build time.
After changing the value, create a new deployment. With the flag off, the Sell
page does not render the microphone, voice review, replacement prompt, or other
voice controls, and it does not request the separate voice-assistant UI chunk.

Do not delete the parser, recording code, tests, or Git history. They are kept
for local development and the planned Android native voice bridge.
