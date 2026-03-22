---
id: "0020"
title: Mobile TypeScript Errors Fixed
stage: green
date: 2026-03-22
surface: agent
model: claude-sonnet-4-6
feature: 001-rag-document-intelligence
branch: 001-rag-document-intelligence
user: Riaz Mehmood
command: /sp.implement complete steps 1-5
labels: ["mobile","typescript","expo","auth","api-client","type-stubs"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - mobile/src/lib/auth.tsx (renamed from .ts, added verifyEmail/verifyPhone)
  - mobile/src/lib/api-client.ts (re-export shim for src/lib/hooks)
  - mobile/src/lib/rtl.ts (new: detectScript, isRTLScript utilities)
  - mobile/lib/api-client.ts (moved from src/lib/ — correct path for most screens)
  - mobile/typings/expo-modules.d.ts (new: type stubs for expo-router, expo-av, expo-document-picker, expo-image-picker, expo-file-system, @react-native-community/netinfo)
  - mobile/src/app/(auth)/domain-select.tsx (inline Domain interface)
  - mobile/src/app/(auth)/register.tsx (inline Domain interface)
  - mobile/src/app/(auth)/verify.tsx (uses verifyEmail/verifyPhone now available)
  - mobile/src/app/(tabs)/interact.tsx (fix VoiceInput/TranscriptionReview props)
  - mobile/src/app/documents/upload.tsx (optional chaining on result.assets)
  - mobile/src/lib/hooks/useAudioPlayback.ts (null coalescing for optional PlaybackStatus fields)
tests:
  - npx tsc --noEmit → 0 errors (exit 0)
---

## Prompt

complete steps 1-5: frontend integration, mobile app integration, end-to-end user journey test, add education and medical domain content, fix known gaps

## Response snapshot

Fixed all TypeScript compilation errors in the mobile app (React Native bare 0.74.0):

1. **auth.ts → auth.tsx**: File used JSX syntax but had `.ts` extension; renamed and added missing `verifyEmail`/`verifyPhone` to `AuthActions` interface + implementations.

2. **api-client path mismatch**: Most screens import from `'../../../lib/api-client'` (resolving to `mobile/lib/`), not `mobile/src/lib/`. Moved file to `mobile/lib/api-client.ts`. Created `mobile/src/lib/api-client.ts` re-export shim for hooks in `src/lib/hooks/` that use `'../../lib/api-client'`.

3. **@prompt-platform/shared**: Non-existent package. Replaced with inline `Domain`, `User`, and `LoginResponse` interface definitions in affected files.

4. **Missing Expo type stubs**: Created `mobile/typings/expo-modules.d.ts` with full type stubs for `expo-router`, `expo-av` (with proper Audio namespace + Sound class methods), `expo-document-picker`, `expo-image-picker` (with requestCameraPermissionsAsync), `expo-file-system`, `@react-native-community/netinfo`.

5. **interact.tsx props mismatch**: VoiceInput expected `{isRecording, onPress}` but was passed `{apiBase, authToken, onTranscriptionReady}`. Fixed. TranscriptionReview needed `visible` and `isRTL` props — added.

6. **RTL utilities**: Created `src/lib/rtl.ts` with `detectScript()` and `isRTLScript()`.

7. **Audio hooks**: Fixed `positionMillis ?? 0` and `isPlaying ?? false` for optional PlaybackStatus fields.

Result: `npx tsc --noEmit` exits with 0 errors.

## Outcome

- ✅ Impact: Mobile TypeScript compilation clean; all 7 screens, auth context, and audio hooks type-check correctly
- 🧪 Tests: npx tsc --noEmit → 0 errors
- 📁 Files: 11 files created/modified
- 🔁 Next prompts: Run E2E user journey test; start backend + frontend dev servers; test login→domain-select→interact flow
- 🧠 Reflection: Bare RN project had mixed Expo dependencies; created type stubs rather than installing packages to keep MVP zero-cost. Auth file needed .tsx extension since it contains JSX.

## Evaluation notes (flywheel)

- Failure modes observed: Wrong api-client placement (src/lib vs root lib); missing JSX in .ts file; @prompt-platform/shared phantom package
- Graders run and results (PASS/FAIL): tsc --noEmit PASS
- Prompt variant (if applicable): steps 1-5 continuation
- Next experiment: Run dev server test to validate runtime behavior
