# Quick Start: Gemini Integration in Dukan

Get AI-powered input understanding working in 5 minutes.

## Step 1: Get API Key (1 min)

1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy the key

## Step 2: Add to Environment (1 min)

Create `.env.local` in your project root:

```bash
# .env.local
GEMINI_API_KEY=your-api-key-here
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
```

## Step 3: Test (1 min)

Start the dev server:

```bash
npm run dev
# or
pnpm dev
```

Test the API:

```bash
curl http://localhost:3000/api/gemini/understand -X GET
```

Should return:

```json
{ "ok": true, "configured": true }
```

## Step 4: Use in Voice Assistant (2 min)

Go to Sales page → Voice Sale Assistant:

1. Click the **AI** toggle button
2. Say a command: "दोन milk आणि 3 bread"
3. Click **Add**

The system will parse with Gemini instead of the standard parser.

## Features Enabled

✅ **Voice Parsing**: "दोन Milk, एक Bread, अर्धा Oil"

✅ **Smart Matching**: Finds products even with typos or alternate names

✅ **Bilingual**: Works with English, Marathi, or mixed

✅ **Unit Conversion**: Understands "दीड" (1.5), "अर्धा" (0.5), etc.

## Usage Examples

### Via Hook (Client Component)

```typescript
import { useGeminiUnderstanding } from '@/hooks/use-gemini';

export function MyComponent() {
  const { parseVoiceCommand, isLoading, error } = useGeminiUnderstanding();

  const handleCommand = async () => {
    const result = await parseVoiceCommand(
      "दोन milk आणि 3 bread",
      items, // Your inventory
      units  // Your units
    );
    console.log(result);
  };

  return <button onClick={handleCommand}>Parse</button>;
}
```

### Via Service (Server Route)

```typescript
// app/api/my-route/route.ts
import { understandUserInput } from "@/lib/gemini-service";

export async function POST(request: Request) {
  const { input } = await request.json();

  const result = await understandUserInput(input, {
    language: "mr",
  });

  return Response.json(result);
}
```

## Common Commands to Try

| Voice Input            | What it does                |
| ---------------------- | --------------------------- |
| "दोन milk आणि 3 bread" | Add 2 milk, 3 bread         |
| "show low stock"       | List low inventory items    |
| "daily report"         | Generate daily sales report |
| "search dairy"         | Find dairy products         |
| "एक किलो sugar"        | Add 1 kg sugar              |

## Fallback Behavior

If Gemini fails or API is down:

- Falls back to standard parser automatically
- Voice assistant still works normally
- No data loss

## Monitor Usage & Costs

Track your API usage:

1. Visit: https://aistudio.google.com/app/usage
2. Check requests and token count
3. Set up alerts if needed

Typical cost: ₹0.002 - 0.01 per operation

## Troubleshooting

**Issue**: "API key not configured"

- **Fix**: Check `.env.local` has `GEMINI_API_KEY`

**Issue**: AI toggle doesn't work

- **Fix**: Restart dev server after adding API key

**Issue**: Parsing still shows errors

- **Fix**: Check browser console (F12) for error details

**Issue**: Slow responses

- **Fix**: Make sure inventory list isn't too large (keep it < 100 items)

## Next Steps

1. ✅ Enable AI for voice in Sales
2. Try it with your actual inventory data
3. Experiment with different voice commands
4. Check the full guide: [GEMINI_INTEGRATION_GUIDE.md](./GEMINI_INTEGRATION_GUIDE.md)

## Need Help?

- Full documentation: `GEMINI_INTEGRATION_GUIDE.md`
- API docs: https://ai.google.dev/
- Issues? Check browser console (F12 → Console tab)

---

**You're ready!** Start using AI-powered voice commands in your inventory system.
