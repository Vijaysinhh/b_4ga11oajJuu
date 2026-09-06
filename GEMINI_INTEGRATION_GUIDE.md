# Gemini AI Integration for Dukan

This document explains how to integrate and use Google's Gemini AI in your Dukan inventory management system for intelligent input understanding.

## Overview

The Gemini integration adds AI-powered understanding of user inputs, including:

- **Voice Commands**: Parse and understand natural language sale commands
- **Search Queries**: Generate intelligent search suggestions
- **Text Input**: Understand user intent from typed commands
- **Multilingual Support**: Works with English and Marathi mixed input

## Setup

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Configure Environment Variables

Add your Gemini API key to `.env.local`:

```bash
# .env.local
GEMINI_API_KEY=your-api-key-here
```

**Important**: This key should NEVER be exposed to the client. It's server-only.

### 3. Verify Setup

To check if Gemini is configured:

```bash
# In your browser console or with curl:
curl http://localhost:3000/api/gemini/understand -X GET
```

Expected response:

```json
{
  "ok": true,
  "message": "Gemini API is configured and ready",
  "configured": true
}
```

## Features

### 1. Voice Command Parsing

Parse complex voice commands into structured sale items:

**Example Input**: "दोन Milk आणि 3 Parle-G आणि half लिटर oil"

**Parsed Output**:

```json
[
  { "productName": "Milk", "quantity": 2 },
  { "productName": "Parle-G", "quantity": 3 },
  { "productName": "Oil", "quantity": 0.5 }
]
```

**Features**:

- Understands number words in English and Marathi
- Handles unit conversions (दीड = 1.5, अर्धा = 0.5, etc.)
- Supports product name variations
- Works with brand names

### 2. Input Understanding

Identify what the user is trying to do:

```typescript
const result = await understandUserInput("I need to know which items are running low", {
  language: "en"
});

// Result:
{
  intent: "inventory",
  confidence: 0.95,
  action: "check low stock items",
  details: {
    action: "check",
    // ... more details
  }
}
```

**Supported Intents**:

- `sale` - Selling products
- `search` - Searching for items
- `inventory` - Inventory operations
- `report` - Generating reports
- `unknown` - Unable to determine

### 3. Search Suggestions

Get intelligent search suggestions:

```typescript
const suggestions = await generateSearchSuggestions(
  "dairy",
  items, // Your inventory items
);

// Result: ["Milk", "Yogurt", "Cheese", "Dairy Products"]
```

## API Endpoints

### POST /api/gemini/understand

Understand user input and extract intent.

**Request**:

```json
{
  "input": "add 2 milk and 3 bread",
  "type": "text|voice|search",
  "items": [
    { "id": 1, "name": "Milk", "nameMarathi": "दूध", "quantity": 50 },
    { "id": 2, "name": "Bread", "nameMarathi": "ब्रेड", "quantity": 30 }
  ],
  "units": [
    { "id": 1, "shortForm": "L", "name": "Liter" },
    { "id": 2, "shortForm": "pcs", "name": "Pieces" }
  ],
  "language": "en"
}
```

**Response**:

```json
{
  "ok": true,
  "type": "understanding|voice|search",
  "data": {
    "intent": "sale",
    "confidence": 0.95,
    "details": {
      /* ... */
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/gemini/understand (Health Check)

Check if Gemini API is configured.

**Response**:

```json
{
  "ok": true,
  "configured": true,
  "message": "Gemini API is configured and ready"
}
```

## Using Gemini in Components

### Using the Hook

```typescript
import { useGeminiUnderstanding } from '@/hooks/use-gemini';

export function MyComponent() {
  const { understand, parseVoiceCommand, searchItems, isLoading, error } = useGeminiUnderstanding({
    onSuccess: (result) => console.log('Success:', result),
    onError: (error) => console.error('Error:', error),
  });

  const handleParse = async () => {
    const result = await parseVoiceCommand(
      "दोन milk आणि 3 bread",
      items,
      units
    );
  };

  return (
    <div>
      {isLoading && <p>Processing...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <button onClick={handleParse}>Parse Voice</button>
    </div>
  );
}
```

### Direct Service Usage (Server-side)

```typescript
import {
  understandUserInput,
  parseVoiceCommandWithGemini,
  generateSearchSuggestions,
} from "@/lib/gemini-service";

// Understand input
const result = await understandUserInput("show me all expired items", {
  language: "en",
});

// Parse voice command
const commands = await parseVoiceCommandWithGemini(
  "दोन Milk आणि 3 Bread",
  items,
  units,
);

// Get search suggestions
const suggestions = await generateSearchSuggestions("dairy products", items);
```

## Voice Sale Assistant Integration

The `VoiceSaleAssistant` component now has an AI toggle:

1. **Standard Mode** (Default):
   - Uses the existing rule-based voice parser
   - Fast and offline-capable
   - Good for simple commands

2. **AI Mode** (Powered by Gemini):
   - Uses Gemini to parse complex commands
   - Better at understanding natural language
   - Requires internet and API key
   - Better multilingual support

**Toggle**:

- Click the "AI" button in the voice assistant panel
- When enabled, the Add button shows a processing spinner
- Falls back to standard mode if AI parsing fails

## Performance & Optimization

### Reduce Token Usage

1. **Limit Context**: Don't pass all 10,000 items to Gemini

   ```typescript
   // Good: Pass top 50 items
   const topItems = items.slice(0, 50);

   // Avoid: Passing all items
   ```

2. **Batch Processing**: Group multiple requests

   ```typescript
   // Process multiple voice commands in one API call
   ```

3. **Caching**: Cache suggestions and parsing results
   ```typescript
   const [cachedSuggestions, setCachedSuggestions] = useState({});
   ```

## Cost Considerations

Google's Gemini API is priced per token. Typical operations:

- **Voice parsing**: 100-300 tokens
- **Search suggestions**: 50-150 tokens
- **Input understanding**: 80-200 tokens

**Estimate**: ₹0.002-0.01 per operation with Gemini 2.0 Flash

## Troubleshooting

### API Key Not Configured

```
Error: GEMINI_API_KEY is not set
```

**Solution**: Add `GEMINI_API_KEY` to `.env.local`

### API Returns 503

```
"Gemini API is not configured"
```

**Solution**: Check if `GEMINI_API_KEY` is set in environment

### Parsing Fails with "Invalid JSON"

**Solution**: The API might return markdown. Check the response handling in `gemini-service.ts`

### Poor Recognition Results

- Make sure to pass inventory items for better context
- Provide units information
- Use specific product names (with brands if possible)

## Advanced Usage

### Custom Intent Detection

Create your own intent detector:

```typescript
export async function detectCustomIntent(input: string) {
  const prompt = `Analyze this input for custom business intent: "${input}"
  
  Respond with JSON:
  { "intent": "custom_intent", "confidence": 0.9 }`;

  const response = await model.generateContent(prompt);
  return JSON.parse(response.response.text());
}
```

### Multi-language Support

The system automatically handles:

- English input
- Marathi input
- Mixed English-Marathi input
- Number words in both languages

Specify language:

```typescript
await understandUserInput(userInput, { language: "mr" });
```

## Security Notes

1. **Server-only**: GEMINI_API_KEY should only be in server environment
2. **No Client Exposure**: Never send API key to frontend
3. **Input Validation**: Always validate user input before sending to Gemini
4. **Rate Limiting**: Consider implementing rate limiting for API calls

## Future Enhancements

- [ ] Response caching to reduce API calls
- [ ] Batch processing for multiple commands
- [ ] Custom model fine-tuning for shop-specific vocabulary
- [ ] Fallback to offline parsing if API fails
- [ ] Usage tracking and cost monitoring
- [ ] Support for more languages
- [ ] Audio-to-intent pipeline

## Support & Debugging

Enable debug logging:

```typescript
// In your component
const { understand, result } = useGeminiUnderstanding();

// Log result details
console.log("Gemini Response:", result);
```

For issues, check:

1. API key validity: https://aistudio.google.com/app/apikey
2. Network connectivity
3. Gemini service status: https://status.google.com
4. Browser console for error messages
5. Server logs for detailed errors

## References

- [Google Generative AI Docs](https://ai.google.dev/)
- [Gemini API Guide](https://ai.google.dev/tutorials/python_quickstart)
- [Rate Limiting & Quotas](https://ai.google.dev/docs/quota)
