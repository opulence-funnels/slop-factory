import { streamText, tool } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

// Phase constants
export const AD_SECTIONS = ['hook', 'problem', 'solution', 'social_proof', 'cta'] as const
export type AdSection = (typeof AD_SECTIONS)[number]
export type AdFormat = 'ugc' | 'story_movie'
export type ConversationPhase =
  | 'setup'
  | 'brief'
  | 'scripting'
  | 'consistency'
  | 'keyframing'
  | 'storyboarding'
  | 'generating_video'
  | 'reviewing'
  | 'exported'

// System prompt for the Copilot Orchestrator
const SYSTEM_PROMPT = `You are AdForge, an AI copilot for building professional video advertisements.

## Your Role
Guide marketers through creating a 60-second AI video ad via a structured multi-phase workflow. You manage the entire process, delegating to specialized tools when needed.

## Ad Structure
Every ad has 5 sequential sections:
1. **Hook** (3-5s): Grabs attention with a bold claim, question, or visual shock
2. **Problem** (10-15s): Shows the viewer's current struggle, dramatized
3. **Solution** (10-15s): Introduces the product as the answer
4. **Social Proof** (10-15s): Testimonials, stats, third-party validation
5. **CTA** (10-15s): Clear call-to-action - signup, free trial, visit URL

## Ad Formats
- **UGC Ad**: User-generated content style. Informal, phone-camera, talking-head, raw/authentic feel.
- **Story Movie Ad**: Cinematic narrative. Polished, scene changes, environmental storytelling, actors in relatable situations.

## Workflow Phases (STRICT ORDER - NEVER SKIP)
1. **Setup**: User selects or creates Offer + Avatar + Ad Format
2. **Brief Confirmation**: Review locked parameters, confirm duration allocation
3. **Script Generation**: Generate copy for all 5 sections, get approval
4. **Consistency Lock**: Define and lock avatar appearance + environment specs
5. **Keyframe Selection**: For each section, generate START/MIDDLE/END keyframes (4 options each, user picks 1)
6. **Storyboard Review**: Assemble all keyframes + transition prompts, get approval
7. **Video Generation**: Generate video segments from keyframes
8. **Review & Iterate**: User reviews video, can regenerate segments
9. **Export**: Final download

## Rules
- ALWAYS check current phase before taking action. Refuse to skip ahead.
- When generating keyframes, ALWAYS wait for user selection before proceeding to next position.
- Confirm major decisions before executing (script approval, consistency lock, storyboard approval).
- Be concise but helpful. Explain what's happening and what comes next.
- If the user asks to do something out of order, explain why the workflow requires the current phase first.

## Canvas Updates
When you complete a tool call that produces visual content (offer card, avatar brief, scripts, keyframes, etc.), mention that the canvas has been updated so the user knows to look at the right panel.`

// Tool definitions using AI SDK v4 syntax
export const orchestratorTools = {
  // === State Management Tools ===
  getConversationState: tool({
    description: 'Get the current conversation state including phase, offer, avatar, scripts, keyframes, etc.',
    parameters: z.object({
      conversationId: z.string().describe('The conversation ID'),
    }),
    execute: async ({ conversationId }) => {
      console.log(`[tool] getConversationState: ${conversationId}`)
      return {
        phase: 'setup',
        offer: null,
        avatar: null,
        adFormat: null,
        scripts: [],
        consistencySpec: null,
        keyframes: [],
        storyboard: null,
      }
    },
  }),

  updateConversationPhase: tool({
    description: 'Update the conversation phase after completing a workflow step',
    parameters: z.object({
      conversationId: z.string(),
      phase: z.enum([
        'setup',
        'brief',
        'scripting',
        'consistency',
        'keyframing',
        'storyboarding',
        'generating_video',
        'reviewing',
        'exported',
      ]),
    }),
    execute: async ({ conversationId, phase }) => {
      console.log(`[tool] updateConversationPhase: ${conversationId} -> ${phase}`)
      return { success: true, phase }
    },
  }),

  // === Offer & Avatar Tools ===
  buildOffer: tool({
    description:
      'Generate a structured offer using the Hormozi Value Equation. Use when user describes their product.',
    parameters: z.object({
      productName: z.string().describe('Name of the product or service'),
      productDescription: z.string().describe('Description of what the product does'),
      targetAudience: z.string().describe('Who the product is for'),
      userNotes: z.string().optional().describe('Any additional context from the user'),
    }),
    execute: async (params) => {
      console.log(`[tool] buildOffer:`, params)
      return {
        id: 'offer_placeholder',
        name: params.productName,
        productName: params.productName,
        dreamOutcome: 'Placeholder dream outcome',
        perceivedLikelihood: 'High - proven system',
        timeDelay: 'See results in 30 days',
        effortSacrifice: 'Minimal effort required',
        summary: `${params.productName} helps ${params.targetAudience} achieve their goals.`,
        keySellingPoints: ['Point 1', 'Point 2', 'Point 3'],
      }
    },
  }),

  buildAvatar: tool({
    description:
      'Generate a comprehensive psychological avatar brief. Use after offer is created.',
    parameters: z.object({
      offerId: z.string().describe('The offer ID to base the avatar on'),
      targetDescription: z.string().describe('Description of the target customer'),
      industry: z.string().describe('Industry or niche'),
      userNotes: z.string().optional(),
    }),
    execute: async (params) => {
      console.log(`[tool] buildAvatar:`, params)
      return {
        id: 'avatar_placeholder',
        name: 'Target Customer',
        demographics: {
          age: '30-45',
          income: '$75k-150k',
          location: 'Urban US',
          jobTitle: 'Professional',
          gender: 'Mixed',
        },
        psychographics: {
          values: ['Success', 'Efficiency', 'Growth'],
          fears: ['Falling behind', 'Wasting time', 'Missing opportunities'],
          worldview: 'Hard work should lead to results',
        },
        painPoints: ['Pain point 1', 'Pain point 2'],
        aspirations: ['Aspiration 1', 'Aspiration 2'],
        fullBriefMd: '# Avatar Brief\n\nPlaceholder content...',
      }
    },
  }),

  // === Script Tools ===
  generateScript: tool({
    description: 'Generate ad copy for all 5 sections based on offer, avatar, and format.',
    parameters: z.object({
      conversationId: z.string(),
      offerId: z.string(),
      avatarId: z.string(),
      adFormat: z.enum(['ugc', 'story_movie']),
      durationTargets: z
        .object({
          hook: z.number(),
          problem: z.number(),
          solution: z.number(),
          social_proof: z.number(),
          cta: z.number(),
        })
        .optional(),
    }),
    execute: async (params) => {
      console.log(`[tool] generateScript:`, params)
      return {
        scripts: AD_SECTIONS.map((section) => ({
          id: `script_${section}`,
          section,
          copyText: `[${section.toUpperCase()}] Placeholder copy text...`,
          visualDescription: `Visual description for ${section}...`,
          durationSeconds: section === 'hook' ? 5 : 13,
          status: 'draft',
        })),
      }
    },
  }),

  approveScript: tool({
    description: 'Mark a script section as approved.',
    parameters: z.object({
      scriptId: z.string(),
      section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
    }),
    execute: async ({ scriptId, section }) => {
      console.log(`[tool] approveScript: ${scriptId} (${section})`)
      return { success: true, scriptId, section, status: 'approved' }
    },
  }),

  // === Consistency Tools ===
  generateConsistencySpec: tool({
    description: 'Generate avatar appearance and environment specs for visual consistency.',
    parameters: z.object({
      conversationId: z.string(),
      avatarId: z.string(),
      adFormat: z.enum(['ugc', 'story_movie']),
    }),
    execute: async (params) => {
      console.log(`[tool] generateConsistencySpec:`, params)
      return {
        avatarSpec: {
          age: '35',
          gender: 'female',
          hairColor: 'dark brown',
          hairStyle: 'shoulder-length, natural waves',
          skinTone: 'medium',
          clothing: 'casual professional - blazer over t-shirt',
          distinguishingFeatures: 'warm smile, expressive eyes',
          fullDescription:
            'A 35-year-old woman with dark brown shoulder-length wavy hair, medium skin tone, wearing a casual blazer over a t-shirt, with a warm approachable smile.',
        },
        environmentSpec: {
          location: 'modern home office',
          timeOfDay: 'daytime, natural light',
          lighting: 'soft natural light from window, warm tone',
          keyProps: ['laptop', 'coffee mug', 'plant'],
          colorScheme: ['warm neutrals', 'soft greens', 'white'],
          fullDescription:
            'A modern home office with natural daylight streaming through a window, featuring a clean desk with laptop, coffee mug, and green plant accents.',
        },
        visualStyle: params.adFormat === 'ugc' ? 'authentic, phone-camera aesthetic' : 'cinematic, polished',
        colorPalette: ['#F5F5F0', '#4A7C59', '#2C3E50', '#E8D5B7'],
        status: 'draft',
      }
    },
  }),

  lockConsistency: tool({
    description: 'Lock the consistency spec after user approval. No changes allowed after this.',
    parameters: z.object({
      conversationId: z.string(),
    }),
    execute: async ({ conversationId }) => {
      console.log(`[tool] lockConsistency: ${conversationId}`)
      return { success: true, status: 'locked' }
    },
  }),

  // === Keyframe Tools ===
  generateKeyframePrompts: tool({
    description: 'Generate 4 image prompts for a specific keyframe position.',
    parameters: z.object({
      conversationId: z.string(),
      section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
      position: z.enum(['start', 'middle', 'end']),
      previousKeyframeId: z.string().optional().describe('ID of the previously selected keyframe for continuity'),
    }),
    execute: async (params) => {
      console.log(`[tool] generateKeyframePrompts:`, params)
      return {
        prompts: Array.from({ length: 4 }, (_, i) => ({
          variantIndex: i,
          promptText: `[Variant ${i + 1}] Image prompt for ${params.section} ${params.position}...`,
          negativePrompt: 'blurry, low quality, distorted',
          style: 'photorealistic',
        })),
      }
    },
  }),

  generateKeyframeImages: tool({
    description: 'Generate images from prompts using the image generation API.',
    parameters: z.object({
      conversationId: z.string(),
      section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
      position: z.enum(['start', 'middle', 'end']),
      prompts: z.array(
        z.object({
          variantIndex: z.number(),
          promptText: z.string(),
          negativePrompt: z.string().optional(),
        })
      ),
    }),
    execute: async (params) => {
      console.log(`[tool] generateKeyframeImages:`, params)
      return {
        keyframes: params.prompts.map((p) => ({
          id: `kf_${params.section}_${params.position}_${p.variantIndex}`,
          section: params.section,
          position: params.position,
          variantIndex: p.variantIndex,
          promptText: p.promptText,
          imageUrl: `/uploads/adforge/keyframes/placeholder_${p.variantIndex}.jpg`,
          status: 'generated',
        })),
      }
    },
  }),

  selectKeyframe: tool({
    description: 'Mark a keyframe as selected and reject the others.',
    parameters: z.object({
      conversationId: z.string(),
      selectedKeyframeId: z.string(),
      section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
      position: z.enum(['start', 'middle', 'end']),
    }),
    execute: async (params) => {
      console.log(`[tool] selectKeyframe:`, params)
      const sectionIndex = AD_SECTIONS.indexOf(params.section)
      return {
        success: true,
        selectedKeyframeId: params.selectedKeyframeId,
        nextPosition:
          params.position === 'start'
            ? 'middle'
            : params.position === 'middle'
              ? 'end'
              : null,
        nextSection:
          params.position === 'end'
            ? AD_SECTIONS[sectionIndex + 1] || null
            : null,
      }
    },
  }),

  // === Transition Tools ===
  generateTransitionPrompts: tool({
    description: 'Generate motion/camera descriptions for transitions between keyframes.',
    parameters: z.object({
      conversationId: z.string(),
      section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
      startKeyframeId: z.string(),
      middleKeyframeId: z.string(),
      endKeyframeId: z.string(),
    }),
    execute: async (params) => {
      console.log(`[tool] generateTransitionPrompts:`, params)
      return {
        transitions: [
          {
            id: `trans_${params.section}_start_middle`,
            fromPosition: 'start',
            toPosition: 'middle',
            promptText: 'Slow zoom in, camera pushes forward gently, maintaining eye contact...',
          },
          {
            id: `trans_${params.section}_middle_end`,
            fromPosition: 'middle',
            toPosition: 'end',
            promptText: 'Pan right to reveal product, smooth dolly movement...',
          },
        ],
      }
    },
  }),

  // === Storyboard Tools ===
  assembleStoryboard: tool({
    description: 'Assemble all keyframes and transitions into a unified storyboard with timing.',
    parameters: z.object({
      conversationId: z.string(),
    }),
    execute: async ({ conversationId }) => {
      console.log(`[tool] assembleStoryboard: ${conversationId}`)
      return {
        storyboard: {
          totalDuration: 60,
          sections: AD_SECTIONS.map((section, i) => ({
            section,
            startTime: i * 12,
            endTime: (i + 1) * 12,
            keyframes: {
              start: { keyframeId: `kf_${section}_start`, imageUrl: '/placeholder.jpg' },
              middle: { keyframeId: `kf_${section}_middle`, imageUrl: '/placeholder.jpg' },
              end: { keyframeId: `kf_${section}_end`, imageUrl: '/placeholder.jpg' },
            },
            transitions: {
              startToMiddle: { promptId: `trans_${section}_1`, text: 'Transition 1...' },
              middleToEnd: { promptId: `trans_${section}_2`, text: 'Transition 2...' },
            },
          })),
          status: 'draft',
        },
      }
    },
  }),

  approveStoryboard: tool({
    description: 'Approve the storyboard to proceed to video generation.',
    parameters: z.object({
      conversationId: z.string(),
    }),
    execute: async ({ conversationId }) => {
      console.log(`[tool] approveStoryboard: ${conversationId}`)
      return { success: true, status: 'approved' }
    },
  }),

  // === Video Tools ===
  generateVideoPrompts: tool({
    description: 'Convert transition descriptions into API-ready video generation parameters.',
    parameters: z.object({
      conversationId: z.string(),
      section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
      transition: z.enum(['start_to_middle', 'middle_to_end']),
      sourceKeyframeUrl: z.string(),
      transitionPrompt: z.string(),
      durationSeconds: z.number(),
    }),
    execute: async (params) => {
      console.log(`[tool] generateVideoPrompts:`, params)
      return {
        videoPrompt: {
          motionPrompt: params.transitionPrompt,
          cameraMovement: 'smooth dolly forward',
          duration: params.durationSeconds,
          sourceImageUrl: params.sourceKeyframeUrl,
          model: 'sora-2-pro',
        },
      }
    },
  }),

  generateVideo: tool({
    description: 'Generate a video segment using Sora 2 Pro.',
    parameters: z.object({
      conversationId: z.string(),
      section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
      transition: z.enum(['start_to_middle', 'middle_to_end']),
      sourceImageUrl: z.string(),
      motionPrompt: z.string(),
      durationSeconds: z.number(),
    }),
    execute: async (params) => {
      console.log(`[tool] generateVideo:`, params)
      return {
        videoSegment: {
          id: `vid_${params.section}_${params.transition}`,
          section: params.section,
          transition: params.transition,
          videoUrl: `/uploads/adforge/videos/placeholder_${params.section}_${params.transition}.mp4`,
          status: 'generating',
          provider: 'sora',
          model: 'sora-2-pro',
        },
      }
    },
  }),
}

// Copilot result interface
export interface CopilotResultHandle {
  readonly text: PromiseLike<string>
  readonly steps: PromiseLike<unknown[]>
}

// Main orchestrator function
export function runCopilot(params: {
  conversationId: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  onChunk?: (chunk: string) => void
}): CopilotResultHandle {
  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: SYSTEM_PROMPT,
    messages: params.messages,
    tools: orchestratorTools,
    maxSteps: 10,
    onChunk: ({ chunk }) => {
      if (chunk.type === 'text-delta' && params.onChunk) {
        params.onChunk(chunk.textDelta)
      }
    },
  })

  return {
    text: result.text,
    steps: result.steps,
  }
}
