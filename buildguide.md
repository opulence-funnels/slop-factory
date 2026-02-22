# AdForge — Build Guide

> **Version:** 3.0
> **Last Updated:** 2026-02-21
> **Codebase:** slop-factory monorepo
> **Status:** Pre-implementation blueprint

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Integration](#3-monorepo-integration)
4. [Data Model (Mongoose)](#4-data-model)
5. [Agent Architecture](#5-agent-architecture)
6. [User Flow — Phase by Phase](#6-user-flow)
7. [API Integration Reference](#7-api-integration)
8. [Frontend Specification](#8-frontend-specification)
9. [Workload Split](#9-workload-split)
10. [MVP Scope & Cut List](#10-mvp-scope)

---

## 1. Product Overview

AdForge is an AI-powered video advertisement builder. A marketer describes their product, and the system generates a 60-second AI video ad through a guided multi-agent workflow. It is built as an extension of the existing Slop Factory monorepo.

### Core Interaction Model

- **Chat + Canvas UI** — Left: chat copilot. Right: visual canvas showing generated assets.
- **Sequential Keyframe Selection** — For each of 5 ad sections, user picks START, MIDDLE, and END keyframe images from sets of 4. Each pick feeds the next generation.
- **Editable Transition Prompts** — Between each keyframe position, the system generates motion/camera descriptions. User can edit before video generation fires.
- **One Chat = One Ad** — ChatGPT-style interface. Offer, avatar, and ad format are locked at conversation creation time.

### Ad Structure

Every ad is composed of 5 sequential sections:

| Section | Duration | Purpose |
|---------|----------|---------|
| **Hook** | 3–5 seconds | Grabs attention. Bold claim, question, or visual shock. |
| **Problem** | 10–15 seconds | Shows the pain. The viewer's current struggle, dramatized. |
| **Solution** | 10–15 seconds | Introduces the product as the answer. |
| **Social Proof** | 10–15 seconds | Testimonials, stats, results. Third-party validation. |
| **CTA** | 10–15 seconds | What to do next. Free trial, signup, visit URL. |

Total duration: ~53–65 seconds (target 60s).

### Ad Formats

| Format | Style | Visual Approach |
|--------|-------|-----------------|
| **UGC Ad** | User-generated content | Informal, phone-camera, talking-head, raw/authentic |
| **Story Movie Ad** | Cinematic narrative | Polished, scene changes, environmental storytelling, "actors" in relatable situations |

Format choice affects every downstream agent's system prompt.

### Keyframe Model

Each ad section produces **3 keyframe images** (START, MIDDLE, END). The system generates **4 options per position**, user picks 1.

```
5 sections × 3 positions × 4 options = 60 images generated
5 sections × 3 positions × 1 selected = 15 keyframes in final storyboard
5 sections × 2 transitions = 10 transition prompts (editable)
```

### Reusable Entities

**Offers** and **Avatars** persist across conversations.

- **Offer** — Structured using the Hormozi Value Equation: Dream Outcome, Perceived Likelihood, Time Delay, Effort & Sacrifice.
- **Avatar** — Comprehensive psychological brief: demographics, psychographics, pain points, failed solutions, language patterns, objections, trigger events, aspirations, worldview.

---

## 2. Tech Stack

AdForge builds on top of the existing Slop Factory infrastructure. No new databases or runtimes are introduced.

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js >= 20 | Existing |
| Package Manager | pnpm 9+ (workspaces) | Existing |
| Language | TypeScript (strict, ES2022) | Existing |
| Server | Express 4 + Mongoose ODM | Existing |
| Database | MongoDB 7 | Existing (via docker-compose) |
| Client | Next.js 15 (App Router) + React 19 | Existing |
| Validation | Zod | Existing |
| File Storage | Local disk via Multer (existing) | Generated assets saved to `uploads/` |
| AI Orchestration | Vercel AI SDK v6 | **NEW** — `streamText`, `generateObject`, tool calls |
| LLM | Claude Sonnet 4 (via Anthropic provider) | **NEW** — all 9 agents |
| Image Generation | Freepik API (text-to-image) | **NEW** |
| Video Generation | Freepik API (image-to-video) | **NEW** |
| Prompt Enhancement | Freepik API (Improve Prompt) | **NEW** |
| Video Generation (Alt) | Sora 2 Pro API (OpenAI) | **NEW** — Optional secondary |
| Video Stitching | FFmpeg (P2) | **NEW** — Server-side in Docker |
| Deployment | Docker Compose (Coolify-compatible) | Existing |

### New Dependencies to Install

**Server (`packages/server`):**
```bash
pnpm add ai @ai-sdk/anthropic zod
```

**Client (`packages/client`):**
```bash
pnpm add ai
```

**Shared (`packages/shared`):**
No new deps. New types only.

---

## 3. Monorepo Integration

### Where AdForge Code Lives

AdForge extends the existing Slop Factory structure. No new packages are created — new code goes into the existing three packages.

```
slop-factory/
├── packages/
│   ├── shared/src/
│   │   └── types/
│   │       ├── media.ts          # Existing
│   │       ├── api.ts            # Existing
│   │       ├── stream.ts         # Existing (reserved — now used for chat streaming)
│   │       ├── adforge.ts        # NEW — All AdForge types (Offer, Avatar, Conversation, etc.)
│   │       └── adforge-agents.ts # NEW — Agent input/output schemas
│   │
│   ├── server/src/
│   │   ├── models/
│   │   │   ├── media.model.ts    # Existing
│   │   │   ├── text.model.ts     # Existing
│   │   │   ├── offer.model.ts    # NEW
│   │   │   ├── avatar.model.ts   # NEW
│   │   │   ├── conversation.model.ts # NEW
│   │   │   ├── message.model.ts  # NEW
│   │   │   ├── script.model.ts   # NEW
│   │   │   ├── keyframe.model.ts # NEW
│   │   │   ├── transition-prompt.model.ts # NEW
│   │   │   ├── storyboard.model.ts # NEW
│   │   │   └── video-segment.model.ts # NEW
│   │   ├── routes/
│   │   │   ├── media.routes.ts   # Existing
│   │   │   ├── text.routes.ts    # Existing
│   │   │   ├── adforge.routes.ts # NEW — Offer/Avatar/Conversation CRUD
│   │   │   └── chat.routes.ts    # NEW — Chat streaming endpoint (SSE)
│   │   ├── agents/               # NEW — All agent definitions
│   │   │   ├── copilot.ts        # Orchestrator
│   │   │   ├── offer-builder.ts
│   │   │   ├── avatar-researcher.ts
│   │   │   ├── script-writer.ts
│   │   │   ├── consistency-enforcer.ts
│   │   │   ├── image-prompt-engineer.ts
│   │   │   ├── transition-prompt-writer.ts
│   │   │   ├── storyboard-architect.ts
│   │   │   └── video-prompt-engineer.ts
│   │   ├── tools/                # NEW — Tool definitions for Vercel AI SDK
│   │   │   ├── generation-tools.ts   # Freepik API calls
│   │   │   ├── db-tools.ts           # Read/write conversation state
│   │   │   └── agent-tools.ts        # Tool wrappers that invoke sub-agents
│   │   └── lib/                  # NEW — Utility modules
│   │       ├── freepik.ts        # Freepik API client + video queue
│   │       └── sora.ts           # Sora API client (optional)
│   │
│   └── client/src/app/
│       ├── page.tsx              # Existing — media gallery
│       ├── upload/page.tsx       # Existing — upload form
│       └── adforge/              # NEW — AdForge UI
│           ├── page.tsx          # Main AdForge view (chat + canvas)
│           ├── layout.tsx        # AdForge-specific layout
│           └── components/
│               ├── ChatPanel.tsx
│               ├── Canvas.tsx
│               ├── SetupModal.tsx
│               ├── OfferCard.tsx
│               ├── AvatarBriefCard.tsx
│               ├── BriefCard.tsx
│               ├── ScriptCards.tsx
│               ├── ConsistencyLock.tsx
│               ├── KeyframeSelector.tsx
│               ├── StoryboardView.tsx
│               ├── VideoProgress.tsx
│               ├── VideoPlayer.tsx
│               └── ExportCard.tsx
```

### New Environment Variables (Server)

Add to `packages/server/.env`:

```bash
# AdForge — AI
ANTHROPIC_API_KEY=sk-ant-...
FREEPIK_API_KEY=fpk-...

# AdForge — Optional
OPENAI_API_KEY=sk-...          # Only if using Sora
FREEPIK_WEBHOOK_BASE_URL=https://your-domain.com  # For webhook callbacks

# Existing (unchanged)
PORT=4000
MONGODB_URI=mongodb://localhost:27017/slop-factory
UPLOAD_DIR=./uploads
```

Add to `packages/server/src/config/env.ts` (Zod schema):

```typescript
const envSchema = z.object({
  // ... existing fields ...
  ANTHROPIC_API_KEY: z.string().min(1),
  FREEPIK_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  FREEPIK_WEBHOOK_BASE_URL: z.string().url().optional(),
});
```

### New API Routes

All new routes are registered in `packages/server/src/index.ts` alongside existing routes.

| Route | Method | Description |
|-------|--------|-------------|
| `POST /api/adforge/offers` | POST | Create new offer |
| `GET /api/adforge/offers` | GET | List user's offers |
| `GET /api/adforge/offers/:id` | GET | Get single offer |
| `PUT /api/adforge/offers/:id` | PUT | Update offer |
| `DELETE /api/adforge/offers/:id` | DELETE | Delete offer |
| `POST /api/adforge/avatars` | POST | Create new avatar |
| `GET /api/adforge/avatars` | GET | List user's avatars |
| `GET /api/adforge/avatars/:id` | GET | Get single avatar |
| `PUT /api/adforge/avatars/:id` | PUT | Update avatar |
| `DELETE /api/adforge/avatars/:id` | DELETE | Delete avatar |
| `POST /api/adforge/conversations` | POST | Create conversation (locks offer + avatar + format) |
| `GET /api/adforge/conversations` | GET | List conversations |
| `GET /api/adforge/conversations/:id` | GET | Get conversation with full state |
| `POST /api/adforge/chat` | POST | Chat endpoint — SSE streaming response |
| `POST /api/adforge/webhooks/freepik` | POST | Freepik webhook receiver |

### File Storage for Generated Assets

Generated images and videos are stored in the existing `uploads/` directory using subdirectories:

```
uploads/
├── media/          # Existing user uploads
├── adforge/        # NEW
│   ├── keyframes/  # Generated keyframe images
│   ├── videos/     # Generated video segments
│   └── exports/    # Final stitched videos (P2)
```

Files are served at `/uploads/adforge/keyframes/<filename>` etc. via the existing Express static middleware. Add the subdirectory to the Multer config or use `fs.writeFile` directly for API-fetched assets (since Freepik returns URLs, not multipart uploads — we download and save).

---

## 4. Data Model (Mongoose)

All models follow existing Slop Factory conventions: Mongoose schemas in `packages/server/src/models/`, one file per collection, TypeScript interfaces in `packages/shared/src/types/adforge.ts`.

### Collection Overview

```
offers
avatars
conversations
  ├── messages (embedded array OR separate collection — see note)
  ├── scripts (separate collection, FK: conversationId)
  ├── consistency_specs (embedded in conversation document)
  ├── keyframes (separate collection, FK: conversationId)
  ├── transition_prompts (separate collection, FK: conversationId)
  ├── storyboards (embedded in conversation document)
  └── video_segments (separate collection, FK: conversationId)
```

**Embedding vs. separate collection decision:**
- **Embedded:** `consistencySpec`, `storyboard`, `durationAllocation` — small, 1:1, always loaded with conversation.
- **Separate collection:** `messages`, `scripts`, `keyframes`, `transitionPrompts`, `videoSegments` — large, 1:many, queried independently, can grow large (60+ keyframes).

---

### Offer

**File:** `packages/server/src/models/offer.model.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IOffer extends Document {
  name: string;
  productName: string;
  dreamOutcome: string;
  perceivedLikelihood: string;
  timeDelay: string;
  effortSacrifice: string;
  summary: string;
  keySellingPoints: string[];
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>({
  name:                 { type: String, required: true },
  productName:          { type: String, required: true },
  dreamOutcome:         { type: String, required: true },
  perceivedLikelihood:  { type: String, required: true },
  timeDelay:            { type: String, required: true },
  effortSacrifice:      { type: String, required: true },
  summary:              { type: String, default: '' },
  keySellingPoints:     { type: [String], default: [] },
}, { timestamps: true });

export const Offer = mongoose.model<IOffer>('Offer', OfferSchema);
```

---

### Avatar

**File:** `packages/server/src/models/avatar.model.ts`

```typescript
export interface IAvatar extends Document {
  name: string;
  demographics: {
    age: string;
    income: string;
    location: string;
    jobTitle: string;
    gender: string;
  };
  psychographics: {
    values: string[];
    fears: string[];
    worldview: string;
  };
  painPoints: string[];
  failedSolutions: string[];
  languagePatterns: string[];
  objections: string[];
  triggerEvents: string[];
  aspirations: string[];
  worldview: string;
  fullBriefMd: string;        // Complete markdown brief document
  createdAt: Date;
  updatedAt: Date;
}

const AvatarSchema = new Schema<IAvatar>({
  name:              { type: String, required: true },
  demographics: {
    age:             { type: String, required: true },
    income:          { type: String, default: '' },
    location:        { type: String, default: '' },
    jobTitle:        { type: String, default: '' },
    gender:          { type: String, default: '' },
  },
  psychographics: {
    values:          { type: [String], default: [] },
    fears:           { type: [String], default: [] },
    worldview:       { type: String, default: '' },
  },
  painPoints:        { type: [String], default: [] },
  failedSolutions:   { type: [String], default: [] },
  languagePatterns:  { type: [String], default: [] },
  objections:        { type: [String], default: [] },
  triggerEvents:     { type: [String], default: [] },
  aspirations:       { type: [String], default: [] },
  worldview:         { type: String, default: '' },
  fullBriefMd:       { type: String, default: '' },
}, { timestamps: true });

export const Avatar = mongoose.model<IAvatar>('Avatar', AvatarSchema);
```

---

### Conversation

**File:** `packages/server/src/models/conversation.model.ts`

This is the central document. `consistencySpec` and `storyboard` are embedded subdocuments. Everything else is a separate collection with `conversationId` FK.

```typescript
const AD_SECTIONS = ['hook', 'problem', 'solution', 'social_proof', 'cta'] as const;
type AdSection = typeof AD_SECTIONS[number];
type AdFormat = 'ugc' | 'story_movie';
type ConversationStatus = 'setup' | 'scripting' | 'keyframing' | 'storyboarding'
  | 'generating_video' | 'reviewing' | 'exported';

export interface IConsistencySpec {
  avatarSpec: {
    age: string;
    gender: string;
    hairColor: string;
    hairStyle: string;
    skinTone: string;
    clothing: string;
    distinguishingFeatures: string;
    fullDescription: string;   // Prompt-ready concatenated string
  };
  environmentSpec: {
    location: string;
    timeOfDay: string;
    lighting: string;
    keyProps: string[];
    colorScheme: string[];
    fullDescription: string;
  };
  visualStyle: string;
  colorPalette: string[];
  status: 'draft' | 'locked';
}

export interface IStoryboardSection {
  section: AdSection;
  startTime: number;
  endTime: number;
  keyframes: {
    start: { keyframeId: string; imageUrl: string };
    middle: { keyframeId: string; imageUrl: string };
    end: { keyframeId: string; imageUrl: string };
  };
  transitions: {
    startToMiddle: { promptId: string; text: string };
    middleToEnd: { promptId: string; text: string };
  };
  dialogue: string;
  textOverlay: string | null;
}

export interface IConversation extends Document {
  offerId: mongoose.Types.ObjectId;
  avatarId: mongoose.Types.ObjectId;
  adFormat: AdFormat;
  status: ConversationStatus;
  phase: number;
  durationAllocation: {
    hook: number;
    problem: number;
    solution: number;
    social_proof: number;
    cta: number;
  };
  consistencySpec: IConsistencySpec | null;
  storyboard: {
    sections: IStoryboardSection[];
    totalDuration: number;
    status: 'draft' | 'approved';
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConsistencySpecSchema = new Schema({
  avatarSpec: {
    age: String, gender: String, hairColor: String, hairStyle: String,
    skinTone: String, clothing: String, distinguishingFeatures: String,
    fullDescription: String,
  },
  environmentSpec: {
    location: String, timeOfDay: String, lighting: String,
    keyProps: [String], colorScheme: [String], fullDescription: String,
  },
  visualStyle: String,
  colorPalette: [String],
  status: { type: String, enum: ['draft', 'locked'], default: 'draft' },
}, { _id: false });

const StoryboardSectionSchema = new Schema({
  section:    { type: String, enum: AD_SECTIONS, required: true },
  startTime:  { type: Number, required: true },
  endTime:    { type: Number, required: true },
  keyframes: {
    start:  { keyframeId: String, imageUrl: String },
    middle: { keyframeId: String, imageUrl: String },
    end:    { keyframeId: String, imageUrl: String },
  },
  transitions: {
    startToMiddle: { promptId: String, text: String },
    middleToEnd:   { promptId: String, text: String },
  },
  dialogue:    { type: String, default: '' },
  textOverlay: { type: String, default: null },
}, { _id: false });

const ConversationSchema = new Schema<IConversation>({
  offerId:  { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
  avatarId: { type: Schema.Types.ObjectId, ref: 'Avatar', required: true },
  adFormat: { type: String, enum: ['ugc', 'story_movie'], required: true },
  status:   { type: String, enum: ['setup','scripting','keyframing','storyboarding','generating_video','reviewing','exported'], default: 'setup' },
  phase:    { type: Number, default: 0 },
  durationAllocation: {
    hook:         { type: Number, default: 5 },
    problem:      { type: Number, default: 13 },
    solution:     { type: Number, default: 14 },
    social_proof: { type: Number, default: 14 },
    cta:          { type: Number, default: 14 },
  },
  consistencySpec: { type: ConsistencySpecSchema, default: null },
  storyboard: {
    sections:      { type: [StoryboardSectionSchema], default: [] },
    totalDuration: { type: Number, default: 60 },
    status:        { type: String, enum: ['draft', 'approved'], default: 'draft' },
  },
}, { timestamps: true });

// Index for listing user's conversations (add userId field if auth is added)
ConversationSchema.index({ createdAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
```

---

### Message

**File:** `packages/server/src/models/message.model.ts`

Separate collection — chat history grows unbounded and is queried independently for context windowing.

```typescript
export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls: Record<string, unknown>[] | null;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  role:           { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
  content:        { type: String, required: true },
  toolCalls:      { type: Schema.Types.Mixed, default: null },
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
```

---

### Script

**File:** `packages/server/src/models/script.model.ts`

```typescript
export interface IScript extends Document {
  conversationId: mongoose.Types.ObjectId;
  section: AdSection;
  copyText: string;
  visualDescription: string;
  durationSeconds: number;
  status: 'draft' | 'approved';
  variantIndex: number;
  createdAt: Date;
}

const ScriptSchema = new Schema<IScript>({
  conversationId:   { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  section:          { type: String, enum: AD_SECTIONS, required: true },
  copyText:         { type: String, required: true },
  visualDescription:{ type: String, required: true },
  durationSeconds:  { type: Number, required: true },
  status:           { type: String, enum: ['draft', 'approved'], default: 'draft' },
  variantIndex:     { type: Number, default: 0 },
}, { timestamps: true });

ScriptSchema.index({ conversationId: 1, section: 1 });

export const Script = mongoose.model<IScript>('Script', ScriptSchema);
```

---

### Keyframe

**File:** `packages/server/src/models/keyframe.model.ts`

This is the busiest collection — 60 docs per conversation (4 options × 15 positions).

```typescript
export interface IKeyframe extends Document {
  conversationId: mongoose.Types.ObjectId;
  section: AdSection;
  position: 'start' | 'middle' | 'end';
  variantIndex: number;            // 0–3 (which option)
  promptText: string;
  imageUrl: string;                // Local path: /uploads/adforge/keyframes/<file>
  freepikTaskId: string;
  status: 'generating' | 'generated' | 'selected' | 'rejected';
  createdAt: Date;
}

const KeyframeSchema = new Schema<IKeyframe>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  section:        { type: String, enum: AD_SECTIONS, required: true },
  position:       { type: String, enum: ['start', 'middle', 'end'], required: true },
  variantIndex:   { type: Number, required: true },
  promptText:     { type: String, required: true },
  imageUrl:       { type: String, default: '' },
  freepikTaskId:  { type: String, default: '' },
  status:         { type: String, enum: ['generating','generated','selected','rejected'], default: 'generating' },
}, { timestamps: true });

KeyframeSchema.index({ conversationId: 1, section: 1, position: 1 });
KeyframeSchema.index({ freepikTaskId: 1 }); // For webhook lookups

export const Keyframe = mongoose.model<IKeyframe>('Keyframe', KeyframeSchema);
```

---

### TransitionPrompt

**File:** `packages/server/src/models/transition-prompt.model.ts`

```typescript
export interface ITransitionPrompt extends Document {
  conversationId: mongoose.Types.ObjectId;
  section: AdSection;
  fromPosition: 'start' | 'middle';
  toPosition: 'middle' | 'end';
  promptText: string;              // LLM-generated
  userEdited: boolean;
  userEditedText: string | null;   // User's version if edited
  createdAt: Date;
}

const TransitionPromptSchema = new Schema<ITransitionPrompt>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  section:        { type: String, enum: AD_SECTIONS, required: true },
  fromPosition:   { type: String, enum: ['start', 'middle'], required: true },
  toPosition:     { type: String, enum: ['middle', 'end'], required: true },
  promptText:     { type: String, required: true },
  userEdited:     { type: Boolean, default: false },
  userEditedText: { type: String, default: null },
}, { timestamps: true });

TransitionPromptSchema.index({ conversationId: 1, section: 1 });

export const TransitionPrompt = mongoose.model<ITransitionPrompt>('TransitionPrompt', TransitionPromptSchema);
```

---

### VideoSegment

**File:** `packages/server/src/models/video-segment.model.ts`

```typescript
export interface IVideoSegment extends Document {
  conversationId: mongoose.Types.ObjectId;
  section: AdSection;
  transition: 'start_to_middle' | 'middle_to_end';
  videoPrompt: string;
  sourceKeyframeUrl: string;
  videoUrl: string;                // Local path: /uploads/adforge/videos/<file>
  provider: 'freepik' | 'sora';
  model: string;                   // 'kling-v2' | 'seedance-pro' | 'sora-2-pro'
  freepikTaskId: string;
  durationSeconds: number;
  status: 'queued' | 'generating' | 'generated' | 'approved' | 'rejected';
  createdAt: Date;
}

const VideoSegmentSchema = new Schema<IVideoSegment>({
  conversationId:   { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  section:          { type: String, enum: AD_SECTIONS, required: true },
  transition:       { type: String, enum: ['start_to_middle', 'middle_to_end'], required: true },
  videoPrompt:      { type: String, required: true },
  sourceKeyframeUrl:{ type: String, required: true },
  videoUrl:         { type: String, default: '' },
  provider:         { type: String, enum: ['freepik', 'sora'], default: 'freepik' },
  model:            { type: String, default: 'kling-v2' },
  freepikTaskId:    { type: String, default: '' },
  durationSeconds:  { type: Number, required: true },
  status:           { type: String, enum: ['queued','generating','generated','approved','rejected'], default: 'queued' },
}, { timestamps: true });

VideoSegmentSchema.index({ conversationId: 1, section: 1 });
VideoSegmentSchema.index({ freepikTaskId: 1 }); // For webhook lookups

export const VideoSegment = mongoose.model<IVideoSegment>('VideoSegment', VideoSegmentSchema);
```

---

### MongoDB Index Summary

| Collection | Index | Purpose |
|------------|-------|---------|
| `messages` | `{ conversationId: 1, createdAt: 1 }` | Chat history retrieval |
| `scripts` | `{ conversationId: 1, section: 1 }` | Section-specific lookups |
| `keyframes` | `{ conversationId: 1, section: 1, position: 1 }` | Sequential selection flow |
| `keyframes` | `{ freepikTaskId: 1 }` | Webhook → doc resolution |
| `transition_prompts` | `{ conversationId: 1, section: 1 }` | Per-section prompt loading |
| `video_segments` | `{ conversationId: 1, section: 1 }` | Progress tracking |
| `video_segments` | `{ freepikTaskId: 1 }` | Webhook → doc resolution |
| `conversations` | `{ createdAt: -1 }` | Recent conversations list |

---

## 5. Agent Architecture

### Communication Model

All 9 agents communicate through the **Copilot Orchestrator** via Vercel AI SDK tool call chains. No agent-to-agent communication. MongoDB documents are the persistent state layer — agents read/write via Mongoose. Tool call returns are ephemeral within a single orchestration loop.

Human-in-the-loop: The Copilot streams its response via SSE. When a tool requires user input (keyframe selection, approval), the Copilot emits a structured message that the frontend interprets as a UI action (render keyframe grid, show approval button). The user's next chat message provides the selection/approval, and the Copilot continues.

### Agent 1: Copilot Orchestrator

| Field | Value |
|-------|-------|
| **Purpose** | Manages conversation, interprets intent, delegates to all other agents, synthesizes results. |
| **Type** | Orchestrator |
| **SDK Pattern** | `streamText` with tools |
| **Model** | Claude Sonnet 4 |
| **Tools** | `buildOffer`, `buildAvatar`, `generateScript`, `lockConsistency`, `generateKeyframePrompts`, `generateKeyframeImages`, `writeTransitionPrompts`, `assembleStoryboard`, `generateVideoPrompts`, `generateVideo`, `getConversationState`, `updateConversationState` |
| **Inputs** | User chat messages + conversation state from MongoDB |
| **Outputs** | Streamed text + tool invocations + canvas update commands |

**System prompt core:** "You are AdForge, an AI copilot for building video ads. Guide the user through phases in strict order. During keyframe selection, generate 4 options per position, wait for user pick, then proceed. The offer, avatar, and ad format are locked at conversation start. Never skip phases. Always confirm before advancing."

**State awareness:** On every message, loads `Conversation.findById(conversationId)` to check `.phase` and `.status`. Refuses to jump ahead.

**Streaming endpoint:** `POST /api/adforge/chat` accepts `{ conversationId, message }`, returns SSE stream using Vercel AI SDK's `toDataStreamResponse()`.

---

### Agent 2: Offer Builder

| Field | Value |
|-------|-------|
| **Purpose** | Generates a structured offer using the Hormozi Value Equation. |
| **Type** | Generator |
| **SDK Pattern** | `generateObject` → Zod `OfferSchema` |
| **Model** | Claude Sonnet 4 |
| **Tools** | None |
| **Inputs** | `{ productName, productDescription, targetAudience, userNotes? }` |
| **Outputs** | `IOffer` object (saved to MongoDB) |
| **HITL** | User reviews offer card on canvas. Edits via chat. Confirms. |

---

### Agent 3: Avatar Researcher

| Field | Value |
|-------|-------|
| **Purpose** | Produces a comprehensive psychological avatar brief. |
| **Type** | Generator |
| **SDK Pattern** | `generateObject` → Zod `AvatarSchema` |
| **Model** | Claude Sonnet 4 |
| **Tools** | None |
| **Inputs** | `{ offer: IOffer, targetDescription, industry, userNotes? }` |
| **Outputs** | `IAvatar` object with `fullBriefMd` (saved to MongoDB) |
| **HITL** | User reviews 9-panel brief. Edits via chat. Confirms. |

---

### Agent 4: Script Writer

| Field | Value |
|-------|-------|
| **Purpose** | Generates copy for all 5 ad sections. |
| **Type** | Generator |
| **SDK Pattern** | `generateObject` → Zod `AdScriptSchema` |
| **Model** | Claude Sonnet 4 |
| **Tools** | None |
| **Inputs** | `{ offer: IOffer, avatar: IAvatar, adFormat, durationTargets }` |
| **Outputs** | 5 `IScript` documents (saved to MongoDB) |
| **HITL** | User approves each section card. Can request per-section rewrites. |

**Format-specific behavior:**
- **UGC:** First-person, conversational, avatar's language patterns. Phone-camera framing.
- **Story Movie:** Third-person narrative. Cinematic framing, scene transitions.

---

### Agent 5: Consistency Enforcer

| Field | Value |
|-------|-------|
| **Purpose** | Creates and locks canonical visual descriptions for character + environment. Validates prompts. |
| **Type** | Evaluator |
| **SDK Pattern** | `generateObject` → `ConsistencySpecSchema` (creation). `generateText` (validation). |
| **Model** | Claude Sonnet 4 |
| **Tools** | DB read/write for `conversation.consistencySpec` |
| **Inputs** | Creation: `{ avatar, script, adFormat }`. Validation: `{ prompt, spec }`. |
| **Outputs** | `IConsistencySpec` embedded in conversation doc. Validation: `{ isConsistent, correctedPrompt? }`. |
| **HITL** | User approves avatar + environment specs. "Lock" buttons on canvas. |

**Validation mode runs inline** — before every image prompt is sent to Freepik. Not a user-facing step. If inconsistent, the enforcer returns a corrected prompt silently.

---

### Agent 6: Image Prompt Engineer

| Field | Value |
|-------|-------|
| **Purpose** | Generates 4 optimized image prompts per keyframe position. |
| **Type** | Generator |
| **SDK Pattern** | `generateObject` → `ImagePrompt[]` |
| **Model** | Claude Sonnet 4 |
| **Tools** | `freepikImprovePrompt` (Freepik Improve Prompt API) |
| **Inputs** | `{ section, position, visualDescription, consistencySpec, adFormat, previousKeyframe? }` |
| **Outputs** | 4 `ImagePrompt` objects: `{ promptText, negativePrompt, model, seed, style }` |
| **HITL** | None on prompts — gate is on the generated images. |

**Runs 15 times per ad.** Sequential context: MIDDLE receives selected START; END receives selected MIDDLE.

---

### Agent 7: Transition Prompt Writer

| Field | Value |
|-------|-------|
| **Purpose** | Generates motion/camera/action descriptions for transitions between keyframes. |
| **Type** | Generator |
| **SDK Pattern** | `generateObject` → `TransitionPrompt[]` |
| **Model** | Claude Sonnet 4 |
| **Tools** | None |
| **Inputs** | `{ section, fromKeyframe, toKeyframe, scriptSection, adFormat }` |
| **Outputs** | `ITransitionPrompt` documents (saved to MongoDB) |
| **HITL** | User can edit prompt text in canvas before storyboard approval. |

**Runs 5 times** — once per section, generating both transitions (START→MID, MID→END) simultaneously. Fires after all 3 keyframes for a section are selected.

---

### Agent 8: Storyboard Architect

| Field | Value |
|-------|-------|
| **Purpose** | Assembles 15 keyframes + 10 transition prompts into a unified storyboard with timing. |
| **Type** | Generator |
| **SDK Pattern** | `generateObject` → `StoryboardSchema` |
| **Model** | Claude Sonnet 4 |
| **Tools** | None |
| **Inputs** | `{ scripts, selectedKeyframes[15], transitionPrompts[10], durationTargets }` |
| **Outputs** | `storyboard` subdocument embedded in conversation |
| **HITL** | User reviews single storyboard. Edits transition prompts inline. Approves. |

---

### Agent 9: Video Prompt Engineer

| Field | Value |
|-------|-------|
| **Purpose** | Converts transition descriptions into API-ready video generation parameters. |
| **Type** | Generator |
| **SDK Pattern** | `generateObject` → `VideoPrompt[]` |
| **Model** | Claude Sonnet 4 |
| **Tools** | None |
| **Inputs** | `{ transition, sourceKeyframeUrl, targetKeyframeUrl, section, durationSeconds, provider }` |
| **Outputs** | `VideoPrompt`: `{ motionPrompt, cameraMovement, model, duration, imageUrl, apiParams }` |
| **HITL** | None — gate is on the generated video clips in Review phase. |

**Runs 10 times per ad.** Duration per clip = section duration / 2.

---

### Agent Communication Summary

```
User ↔ Copilot Orchestrator (Agent 1)
         │
         ├── tool: buildOffer ──────────→ Offer Builder (Agent 2) ──→ MongoDB: offers
         ├── tool: buildAvatar ─────────→ Avatar Researcher (Agent 3) ──→ MongoDB: avatars
         ├── tool: generateScript ──────→ Script Writer (Agent 4) ──→ MongoDB: scripts
         ├── tool: lockConsistency ─────→ Consistency Enforcer (Agent 5) ──→ MongoDB: conversations.consistencySpec
         ├── tool: generateKeyframePrompts → Image Prompt Engineer (Agent 6)
         │        └── sub-tool: freepikImprovePrompt → Freepik API
         │        └──→ MongoDB: keyframes (prompt text only, pre-generation)
         ├── tool: generateKeyframeImages → Freepik API (direct) ──→ MongoDB: keyframes (image URLs)
         ├── tool: writeTransitionPrompts → Transition Prompt Writer (Agent 7) ──→ MongoDB: transition_prompts
         ├── tool: assembleStoryboard ──→ Storyboard Architect (Agent 8) ──→ MongoDB: conversations.storyboard
         ├── tool: generateVideoPrompts → Video Prompt Engineer (Agent 9) ──→ MongoDB: video_segments (prompts)
         └── tool: generateVideo ───────→ Freepik/Sora API (direct) ──→ MongoDB: video_segments (video URLs)
```

---

## 6. User Flow

### Phase 0: New Chat Setup

**User sees:** Modal with 3 dropdowns: Offer, Avatar, Ad Format.

**User does:** Selects existing offer + avatar (or "Create New" for either). Selects UGC or Story Movie.

**System does:**
1. If "Create New Offer" → Copilot invokes Offer Builder. Canvas shows Value Equation card.
2. If "Create New Avatar" → Copilot invokes Avatar Researcher. Canvas shows 9-panel brief.
3. On "Start" → `Conversation.create({ offerId, avatarId, adFormat })`. Status: `setup`.

**DB writes:** Optional new `Offer` doc, optional new `Avatar` doc. Always new `Conversation` doc.

---

### Phase 1: Brief Confirmation

**User sees:** Brief card with locked Offer, Avatar, Format, 5 sections, duration ranges.

**User does:** Confirms or adjusts duration allocation.

**System does:** Updates `conversation.durationAllocation` and advances phase.

**DB writes:** `conversation.status = 'scripting'`, `conversation.phase = 2`.

---

### Phase 2: Script Generation

**User sees:** 5 script cards — one per section with copy, visual description, duration.

**User does:** Reviews, approves all 5 or requests per-section rewrites.

**System does:** Script Writer generates 5 `Script` docs. On rewrite: regenerates that section.

**DB writes:** 5 `Script` docs. Approved → `status: 'approved'`.

---

### Phase 3: Avatar & Environment Lock

**User sees:** Two cards — Avatar visual spec + Environment spec.

**User does:** Reviews, edits via chat, clicks "Lock" on each.

**System does:** Consistency Enforcer generates specs from avatar demographics + script visuals. On lock: `conversation.consistencySpec.status = 'locked'`.

**DB writes:** `conversation.consistencySpec` embedded subdocument updated.

---

### Phase 4: Keyframe Selection

15 sequential selection rounds. For each of 5 sections × 3 positions:

1. Image Prompt Engineer → 4 prompts (validated by Consistency Enforcer inline)
2. Freepik API → 4 images (queued, max 3 concurrent)
3. Canvas shows 4-option grid + progress bar (X/15)
4. User picks 1 → `status: 'selected'`, others → `status: 'rejected'`
5. After MIDDLE + END selections: Transition Prompt Writer generates the bridging prompt
6. Transition prompt appears, editable

**DB writes per round:** 4 `Keyframe` docs. After MIDDLE/END: 1 `TransitionPrompt` doc.

**Total:** 60 `Keyframe` docs, 10 `TransitionPrompt` docs.

---

### Phase 5: Storyboard Review

**User sees:** All 5 sections with 3 keyframe thumbnails each + transition prompts.

**User does:** Reviews. Edits any transition prompt. Approves.

**System does:** Storyboard Architect assembles timing + structure into `conversation.storyboard`.

**DB writes:** `conversation.storyboard` embedded subdocument.

---

### Phase 6: Video Generation

**User sees:** 5 progress bars (one per section).

**System does:**
1. Video Prompt Engineer → 10 API-ready prompts
2. Freepik image-to-video → 10 clips (queued, max 3 concurrent)
3. Webhooks or polling update `VideoSegment` docs

**DB writes:** 10 `VideoSegment` docs.

---

### Phase 7: Review & Iterate

**User sees:** Assembled video player (client-side sequential playback of 10 clips). 5 segment thumbnails.

**User does:** Watches. Regenerates individual segments if needed. Approves.

**DB writes:** Updated `VideoSegment` docs for regenerated clips. `conversation.status = 'reviewing'` → `'exported'`.

---

### Phase 8: Export

**User sees:** Download card with specs.

**System does:** FFmpeg stitches 10 clips (P2). For MVP: user downloads individual clips.

**DB writes:** `conversation.status = 'exported'`.

---

## 7. API Integration Reference

### Freepik API

**Auth:** `x-freepik-api-key` header.

**All endpoints async.** POST → task_id → poll or webhook.

#### Utility Module: `packages/server/src/lib/freepik.ts`

```typescript
import { env } from '../config/env.js';

const FREEPIK_BASE = 'https://api.freepik.com';
const headers = {
  'x-freepik-api-key': env.FREEPIK_API_KEY,
  'Content-Type': 'application/json',
};

export async function generateImage(params: {
  prompt: string;
  negative_prompt?: string;
  model?: string;
  seed?: number;
  size?: string;
}): Promise<string> {
  const model = params.model || 'flux-dev';
  const res = await fetch(`${FREEPIK_BASE}/v1/ai/text-to-image/${model}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed,
      image: { size: params.size || 'landscape_16_9' },
      webhook_url: env.FREEPIK_WEBHOOK_BASE_URL
        ? `${env.FREEPIK_WEBHOOK_BASE_URL}/api/adforge/webhooks/freepik`
        : undefined,
    }),
  });
  const data = await res.json();
  return data.data.task_id;
}

export async function generateVideo(params: {
  imageUrl: string;
  prompt: string;
  model?: string;
  duration?: number;
}): Promise<string> {
  const model = params.model || 'kling-v2';
  const res = await fetch(`${FREEPIK_BASE}/v1/ai/image-to-video/${model}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      image: params.imageUrl,
      prompt: params.prompt,
      duration: params.duration,
      webhook_url: env.FREEPIK_WEBHOOK_BASE_URL
        ? `${env.FREEPIK_WEBHOOK_BASE_URL}/api/adforge/webhooks/freepik`
        : undefined,
    }),
  });
  const data = await res.json();
  return data.data.task_id;
}

export async function improvePrompt(prompt: string): Promise<string> {
  const res = await fetch(`${FREEPIK_BASE}/v1/ai/improve-prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  return data.data.improved_prompt;
}

export async function pollTask(taskId: string, type: 'image' | 'video'): Promise<{
  status: string;
  url?: string;
}> {
  const endpoint = type === 'image' ? 'text-to-image' : 'image-to-video';
  const res = await fetch(`${FREEPIK_BASE}/v1/ai/${endpoint}/${taskId}`, { headers });
  const data = await res.json();
  const url = type === 'image'
    ? data.data?.images?.[0]?.url
    : data.data?.video?.url;
  return { status: data.data.status, url };
}

// Queue for 3-concurrent video limit
export class VideoQueue {
  private active = 0;
  private queue: Array<() => Promise<void>> = [];
  private readonly max = 3;

  async enqueue(fn: () => Promise<void>): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      try { await fn(); }
      finally { this.active--; this.drain(); }
    } else {
      return new Promise((resolve) => {
        this.queue.push(async () => { await fn(); resolve(); });
      });
    }
  }

  private drain() {
    if (this.queue.length > 0 && this.active < this.max) {
      const next = this.queue.shift()!;
      this.active++;
      next().finally(() => { this.active--; this.drain(); });
    }
  }
}

export const videoQueue = new VideoQueue();
```

### Webhook Handler

**File:** `packages/server/src/routes/adforge.routes.ts` (or dedicated webhook route)

```typescript
// POST /api/adforge/webhooks/freepik
router.post('/webhooks/freepik', async (req, res) => {
  const { task_id, status, data } = req.body;

  // Try keyframe first
  const keyframe = await Keyframe.findOne({ freepikTaskId: task_id });
  if (keyframe && status === 'completed') {
    // Download image from Freepik URL → save to uploads/adforge/keyframes/
    const localPath = await downloadAndSave(data.images[0].url, 'keyframes');
    keyframe.imageUrl = localPath;
    keyframe.status = 'generated';
    await keyframe.save();
    return res.json({ ok: true });
  }

  // Try video segment
  const segment = await VideoSegment.findOne({ freepikTaskId: task_id });
  if (segment && status === 'completed') {
    const localPath = await downloadAndSave(data.video.url, 'videos');
    segment.videoUrl = localPath;
    segment.status = 'generated';
    await segment.save();
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Unknown task_id' });
});
```

### Polling Fallback

If webhooks are unreliable (common in self-hosted/Docker setups without public URLs), implement polling:

```typescript
async function pollUntilDone(taskId: string, type: 'image' | 'video', maxAttempts = 60): Promise<string> {
  let delay = 1000;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, delay));
    const result = await pollTask(taskId, type);
    if (result.status === 'completed' && result.url) return result.url;
    if (result.status === 'failed') throw new Error(`Task ${taskId} failed`);
    delay = Math.min(delay * 1.5, 30000); // Exponential backoff, max 30s
  }
  throw new Error(`Task ${taskId} timed out`);
}
```

---

## 8. Frontend Specification

### Route

AdForge lives at `/adforge` in the existing Next.js app. The existing gallery (`/`) and upload (`/upload`) routes are untouched.

**File:** `packages/client/src/app/adforge/page.tsx`

### Layout

Split-screen, full viewport:
- **Left (370px fixed):** Chat panel
- **Right (flex):** Canvas panel — renders phase-appropriate component

### Chat Streaming

Uses Vercel AI SDK `useChat` hook pointed at the Express SSE endpoint:

```typescript
import { useChat } from 'ai/react';

const { messages, input, handleInputChange, handleSubmit } = useChat({
  api: '/api/adforge/chat',
  body: { conversationId },
});
```

The Next.js client proxies `/api/adforge/*` to the Express server via the existing rewrite config in `next.config.ts`:

```typescript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `${process.env.INTERNAL_API_URL || 'http://localhost:4000'}/api/:path*`,
    },
  ];
},
```

### Canvas Components

| Component | Phase | Description |
|-----------|-------|-------------|
| `SetupModal` | 0 | 3 dropdowns + start button. Fetches `GET /api/adforge/offers` and `GET /api/adforge/avatars`. |
| `OfferCard` | 0 | Hormozi 4-quadrant grid |
| `AvatarBriefCard` | 0 | 9-panel psych brief |
| `BriefCard` | 1 | Key-value campaign params |
| `ScriptCards` | 2 | 5 section cards with approve checkmarks |
| `ConsistencyLock` | 3 | Avatar + environment spec cards with lock buttons |
| `KeyframeSelector` | 4 | Progress bar (X/15) + section markers + 4-option grid + transition prompt editor |
| `StoryboardView` | 5 | 5 sections × 3 thumbnails + transition text |
| `VideoProgress` | 6 | 5 progress bars |
| `VideoPlayer` | 7 | Sequential `<video>` playback + segment thumbnails + regenerate buttons |
| `ExportCard` | 8 | Download button + specs |

### State Management

React state in the top-level `page.tsx`:

```typescript
const [conversationId, setConversationId] = useState<string | null>(null);
const [phase, setPhase] = useState(0);
const [canvasData, setCanvasData] = useState<CanvasState>(initialState);
```

The `canvasData` object holds whatever the current phase needs (offer data, keyframe images, progress percentages, etc.). Updated when the chat stream includes tool results.

### Generation Status Updates

Since we don't have Supabase Realtime, use **polling** from the client:

```typescript
// Poll keyframe status during Phase 4
useEffect(() => {
  if (phase !== 4) return;
  const interval = setInterval(async () => {
    const res = await fetch(`/api/adforge/conversations/${conversationId}/keyframes?status=generating`);
    const data = await res.json();
    if (data.data.length === 0) clearInterval(interval); // All done
    setCanvasData(prev => ({ ...prev, keyframes: data.data }));
  }, 2000);
  return () => clearInterval(interval);
}, [phase, conversationId]);
```

Same pattern for video generation progress in Phase 6.

---

## 9. Workload Split

### Team

| Person | Role | Strengths |
|--------|------|-----------|
| A | Software Engineer | Backend, DB, agent orchestration, API integrations |
| B | Vibe Coder | Frontend UI, React, Tailwind |
| C | Vibe Coder | Prompt engineering, agent logic, testing |

### Task Breakdown

| # | Task | Person | Hours | Deps | Priority |
|---|------|--------|-------|------|----------|
| 1 | Mongoose models (all 7 new models) + indexes | A | 0.75 | — | P0 |
| 2 | Freepik API utility module (`lib/freepik.ts` — image gen, video gen, improve prompt, polling, video queue) | A | 1.25 | — | P0 |
| 3 | Express routes (`adforge.routes.ts` — offer/avatar/conversation CRUD, webhook handler) | A | 0.75 | 1 | P0 |
| 4 | Chat SSE endpoint + Copilot Orchestrator agent (system prompt, all tool defs, phase gating) | A | 1.75 | 1, 2, 3 | P0 |
| 5 | Offer Builder + Avatar Researcher agents | C | 1.0 | 1 | P0 |
| 6 | Script Writer + Consistency Enforcer agents | C | 1.0 | 5 | P0 |
| 7 | Image Prompt Engineer + Transition Prompt Writer agents | C | 1.25 | 6 | P0 |
| 8 | Storyboard Architect + Video Prompt Engineer agents | C | 0.5 | 7 | P0 |
| 9 | Setup Modal + Offer/Avatar creation UI | B | 0.75 | 3 | P0 |
| 10 | Chat panel (streaming messages, `useChat`, input) | B | 1.0 | 4 | P0 |
| 11 | KeyframeSelector (progress bar, 4-option grid, transition prompt editor) | B | 1.25 | 10 | P0 |
| 12 | StoryboardView + VideoProgress + VideoPlayer + ExportCard | B | 0.75 | 11 | P0 |
| 13 | FFmpeg export pipeline | A | — | 2 | P2 (CUT) |
| 14 | Audio pipeline (TTS, lip sync) | — | — | — | P2 (CUT) |

### Hour Totals

| Person | Hours | Focus |
|--------|-------|-------|
| A | 4.5 | Backend: models, API layer, Freepik integration, orchestrator |
| B | 3.75 | Frontend: modal, chat, all canvas components |
| C | 3.75 | All 8 sub-agents + prompt engineering |
| **Total** | **12.0** | |

### Hitting the 10-Hour Budget

Over by 2 hours. Cuts:

| Cut | Saves | Trade-off |
|-----|-------|-----------|
| Hardcode 1 offer + 1 avatar for demo. Skip CRUD list/edit/delete routes and Setup Modal dropdowns. New offers/avatars created via chat only. | A: -0.5h, B: -0.25h | No polished entity management UI. Chat-based creation still works. |
| Merge Transition Prompt Writer into Image Prompt Engineer (Agent 7 absorbs Agent 6's transition work) | C: -0.25h | Messier agent but fewer moving parts. |
| Simplify StoryboardView — vertical card list, no visual timeline grid | B: -0.25h | Functional but less polished. |
| Skip VideoPlayer component — user views clips individually in canvas grid | B: -0.25h | No assembled preview. Segment-by-segment only. |
| Reduce Express routes — skip pagination, skip update/delete for MVP | A: -0.5h | CRUD is create + read only. |

**Revised totals:**

| Person | Hours |
|--------|-------|
| A | 3.5 |
| B | 3.0 |
| C | 3.5 |
| **Total** | **10.0** |

### Critical Path

```
[1: Mongoose Models] ──┬──→ [4: Chat SSE + Orchestrator] ──→ [10: Chat UI] ──→ [11: KF Selector] ──→ [12: Remaining UI]
                       │           ↑
                       ├──→ [2: Freepik API] ─┘
                       │
                       ├──→ [3: Express Routes] ──→ [9: Setup Modal]
                       │
                       └──→ [5: Offer + Avatar agents] ──→ [6: Script + Consistency] ──→ [7: Img Prompt + Transition] ──→ [8: Storyboard + Video]
```

**Parallelism:** A starts tasks 1 → 2 → 3 → 4. B starts task 9 once routes exist (task 3), then 10 → 11 → 12. C starts task 5 once models exist (task 1), then 6 → 7 → 8. All three streams run in parallel after task 1.

**A must share the Mongoose model files with B and C immediately after task 1.** That's the single blocking dependency for the whole team.

---

## 10. MVP Scope

### P0 — Must Ship

- Mongoose models for all 7 new collections
- Freepik API integration (image gen, video gen, improve prompt, polling)
- Express CRUD routes for offers, avatars, conversations
- Chat SSE endpoint with Copilot Orchestrator
- All 8 sub-agents (Offer Builder, Avatar Researcher, Script Writer, Consistency Enforcer, Image Prompt Engineer, Transition Prompt Writer, Storyboard Architect, Video Prompt Engineer)
- Chat panel with streaming
- Keyframe selection UI with progress bar (X/15)
- Storyboard review UI
- Video generation progress UI

### P1 — Next Sprint

- Offer/Avatar CRUD UI (list, edit, delete)
- Conversation history sidebar
- Sora 2 Pro as secondary video provider
- Drag-to-reorder in storyboard
- Video player with assembled preview

### P2 — Nice to Have

- FFmpeg stitching pipeline (server-side export to single MP4)
- Audio pipeline (TTS voiceover, lip sync, music)
- Text overlay rendering in video
- A/B variant generation
- Image upscaling via Freepik Magnific

### Degradation Ladder

| Hours Behind | What to Cut |
|-------------|-------------|
| 1 hour | Skip transition prompt editing UI. Auto-approve prompts. |
| 2 hours | Skip storyboard review. Keyframes → video directly. |
| 3 hours | Reduce keyframe options from 4 to 2. Halves image generation. |
| 4 hours | Drop video gen. Ship as storyboard generator (15 keyframe images + script). |
| 5+ hours | Script + consistency spec only. Useful as ad script writing tool. |