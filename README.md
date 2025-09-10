# MultiAiApp Backend

A secure RPC backend for the MultiAiApp iOS application that proxies requests to various AI services.

## Architecture

This backend serves as a secure proxy layer between the iOS app and AI services:
- Keeps API keys secure on the server
- Provides unified API interface for all AI services
- Handles authentication and rate limiting
- Transforms requests/responses for different AI provider formats

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your API keys to `.env`:
```
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
MISTRAL_API_KEY=your_key_here
```

4. Run development server:
```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

### Available Services
```
GET /api/ai/services
```
Returns list of configured AI services.

### Chat Completion
```
POST /api/ai/chat/:service
POST /api/ai/chat
```

Request body:
```json
{
  "service": "openai",  // For /api/ai/chat endpoint only
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "model": "gpt-3.5-turbo",  // Optional
  "temperature": 0.7,        // Optional
  "max_tokens": 1000         // Optional
}
```

Supported services:
- `openai` - OpenAI GPT models
- `anthropic` - Claude models
- `google` - Gemini models
- `perplexity` - Perplexity models
- `groq` - Groq hosted models
- `mistral` - Mistral models

## iOS App Integration

Update your iOS app to point to this backend:
```swift
let backendURL = "http://localhost:3000/api/ai"
```

For production, deploy this backend and update the URL accordingly.

## Security Notes

- Never commit `.env` file
- Use environment variables in production
- Consider adding authentication middleware
- Implement rate limiting for production use
- Add request validation and sanitization

## Deployment

For production deployment:
1. Build TypeScript: `npm run build`
2. Set environment variables on your hosting platform
3. Run: `npm start`

Consider deploying to:
- Heroku
- AWS Lambda
- Google Cloud Functions
- Vercel
- Railway