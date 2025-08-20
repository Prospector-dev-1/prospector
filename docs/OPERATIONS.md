# Operations Guide

This guide covers development setup, testing procedures, and zero-error validation for the Prospector AI Cold Call Training application.

## Development Setup

### Prerequisites
- Node.js 18+ 
- Bun or npm package manager
- Supabase CLI (optional for local development)

### Environment Configuration

1. **Copy environment template**:
   ```bash
   cp env/.env.example .env
   ```

2. **Configure required variables**:
   ```bash
   # Supabase (required)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   
   # Additional keys as needed
   VAPI_PUBLIC_KEY=your-vapi-public-key
   OPENAI_API_KEY=sk-your-openai-key
   ```

3. **Verify environment validation**:
   ```bash
   npm run dev
   # Should start without environment validation errors
   ```

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run with TypeScript checking
npm run build

# Lint and fix code
npm run lint
```

## Testing Procedures

### Environment Validation Testing

**Test missing environment variables**:
```bash
# Temporarily rename .env
mv .env .env.backup

# Start app - should fail with descriptive error
npm run dev

# Restore environment
mv .env.backup .env
```

**Expected behavior**: App should fail to start with clear error message listing missing variables.

### Error Boundary Testing

**Test React error boundary**:
1. Navigate to any protected route
2. Open browser dev tools → Console
3. Execute: `throw new Error("Test error")`
4. Verify error boundary fallback UI appears
5. Click "Refresh Page" - should recover

**Expected behavior**: Graceful error UI with copy diagnostics and refresh options.

### Console Monitoring

**Access audit dashboard**:
1. Ensure development mode: `npm run dev`
2. Navigate to `http://localhost:8080/__audit`
3. Verify console logs are captured
4. Test download functionality

**Expected behavior**: Real-time log capture with error grouping and download capability.

### VAPI Integration Testing

**Test call initialization**:
1. Navigate to call simulation
2. Start a call session  
3. Check browser console for KrispSDK errors
4. Verify single VAPI instance creation

**Expected behavior**: No KrispSDK duplication warnings, smooth call startup.

## Production Build Validation

### Zero-Error Build Process

```bash
# Clean build with type checking
npm run build

# Expected output: No TypeScript errors
# ✓ All type checks passed
# ✓ Build completed successfully
```

### Runtime Error Validation

```bash
# Preview production build
npm run preview

# Navigate critical paths:
# 1. Authentication flow
# 2. Call simulation start/end
# 3. File upload and analysis
# 4. Credit management

# Check console for errors/warnings
```

**Success criteria**:
- ✅ Zero TypeScript compilation errors
- ✅ Zero console errors in critical user flows  
- ✅ Zero console warnings in production preview
- ✅ Graceful error boundaries on unhandled exceptions

## Edge Function Validation

### Local Function Testing

```bash
# Test environment validation
supabase functions serve

# Test each function with missing env:
curl -X POST http://localhost:54321/functions/v1/get-vapi-key
# Should return 500 with descriptive error

# Test with proper env:
# Should return 200 with expected response format
```

### Function-Specific Tests

**get-vapi-key**:
```bash
curl -X POST http://localhost:54321/functions/v1/get-vapi-key \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"

# Expected: {"publicKey": "your-vapi-public-key"}
```

**start-enhanced-ai-conversation**:
```bash
curl -X POST http://localhost:54321/functions/v1/start-enhanced-ai-conversation \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test", "prospectPersonality": "professional"}'

# Expected: {"assistantId": "...", "sessionConfig": {...}}
```

## Error Monitoring

### Console Capture System

**Development monitoring**:
- Real-time error capture via `src/utils/consoleCapture.ts`
- Access via `/__audit` route in development
- Automatic grouping by frequency and type

**Production monitoring**:
- Console capture disabled in production builds
- Error boundaries provide user-friendly fallbacks
- Critical errors logged for external monitoring integration

### Zero-Error Validation Checklist

**Pre-deployment validation**:
- [ ] `npm run build` completes without TypeScript errors
- [ ] Critical user flows produce zero console errors
- [ ] Error boundaries render on forced errors  
- [ ] Environment validation catches missing vars
- [ ] Edge functions return proper HTTP status codes
- [ ] VAPI calls initialize without KrispSDK duplication

## Troubleshooting

### Common Issues

**Environment validation errors**:
```
Environment validation failed. Missing variables: VITE_SUPABASE_URL
```
→ Check `.env` file exists and contains required variables

**KrispSDK duplication**:
```
KrispSDK - The KrispSDK is duplicated
```
→ Fixed in current implementation via VAPI singleton pattern

**Build failures**:
```
TypeScript error in strict mode
```
→ Enable strict mode gradually, fix type issues incrementally

### Debug Resources

- **Development audit**: `http://localhost:8080/__audit`
- **Browser dev tools**: Console, Network, Application tabs
- **Supabase dashboard**: Edge function logs and database monitoring
- **Error boundaries**: Copy error details for investigation

## Continuous Integration

### Recommended CI Checks

```yaml
# Example GitHub Actions validation
- name: Environment validation
  run: npm run build
  
- name: Lint and type check  
  run: npm run lint
  
- name: Test edge functions
  run: supabase functions deploy --dry-run
```

### Success Metrics

- Zero TypeScript compilation errors
- Zero ESLint warnings in production code
- Console error count < 1 per user session
- Error boundary activation rate < 0.1%
- Edge function 5xx error rate < 1%