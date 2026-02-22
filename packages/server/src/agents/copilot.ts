import { streamText, tool } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import mongoose from 'mongoose'

// Models
import { Conversation } from '../models/conversation.model.js'
import { Offer } from '../models/offer.model.js'
import { Avatar } from '../models/avatar.model.js'
import { Script } from '../models/script.model.js'
import { Keyframe } from '../models/keyframe.model.js'
import { TransitionPrompt } from '../models/transition-prompt.model.js'
import { VideoSegment } from '../models/video-segment.model.js'

// Agents
import { buildOffer as buildOfferAgent } from './offer-builder.js'
import { buildAvatar as buildAvatarAgent } from './avatar-researcher.js'
import { writeScript } from './script-writer.js'
import { lockConsistency as lockConsistencyAgent } from './consistency-enforcer.js'
import { generateKeyframePrompts as generateKeyframePromptsAgent } from './image-prompt-engineer.js'
import { writeTransitionPrompts } from './transition-prompt-writer.js'
import { assembleStoryboard as assembleStoryboardAgent } from './storyboard-architect.js'
import { generateVideoPrompt } from './video-prompt-engineer.js'

// Lib
import * as googleImagen from '../lib/google-imagen.js'
import * as falAi from '../lib/fal-ai.js'
import * as sora from '../lib/sora.js'

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

## Workflow Phases
1. **Setup**: User selects or creates Offer + Avatar + Ad Format (ALREADY DONE if campaign context is provided)
2. **Hook Selection**: Generate 4 hook options for user to choose from using generateHookOptions tool
3. **Script Generation**: Once hook is selected, generate full script for all 5 sections
4. **Keyframe Selection**: After scripts approved, use generateKeyframeImagesDirect to generate 4 image options directly
5. **Storyboard Review**: Assemble all keyframes + transition prompts
6. **Video Generation**: Generate video segments from keyframes
7. **Export**: Final download

NOTE: Skip the consistency spec phase - go directly from script approval to keyframe generation.

## IMPORTANT: Hook Generation Flow
When the user asks to "create hooks" or "generate hooks" or similar:
1. FIRST use the generateHookOptions tool to create 4 hook variations
2. The hook options will appear in the canvas for the user to review
3. WAIT for the user to select their preferred hook
4. ONLY THEN proceed to generateScript with the full ad copy

## Rules
- ALWAYS check current phase before taking action. Refuse to skip ahead.
- When generating keyframes, ALWAYS wait for user selection before proceeding to next position.
- Confirm major decisions before executing (script approval, consistency lock, storyboard approval).
- Be concise but helpful. Explain what's happening and what comes next.
- If the user asks to do something out of order, explain why the workflow requires the current phase first.

## CRITICAL: Canvas Display Rules
- **DO NOT output full script content, hook text, or visual descriptions in chat messages**
- All generated content (hooks, scripts, keyframes) is automatically displayed in the canvas on the right
- After calling a generation tool, simply say something like "I've generated your [content type] - check the canvas to review them. Let me know if you'd like any changes."
- Keep chat messages SHORT and conversational - the user sees the real content in the canvas
- Example good response after generateScript: "Your 5-part script is ready in the canvas. Take a look and click 'Approve All' when you're happy with it, or let me know which sections need revisions."
- Example bad response: [Outputting the full script text in the chat] - DON'T do this!

## Keyframe Selection Flow (15 rounds)
After scripts are approved, immediately begin keyframe generation:
1. Start with Hook section, START position
2. Call generateKeyframeImagesDirect to generate 4 images directly (this skips consistency spec)
3. The 4 images appear in the canvas for user selection
4. After user selects one, move to next position (start → middle → end) then next section
5. Total: 5 sections × 3 positions = 15 rounds

IMPORTANT: When user says "approve all scripts" or "skip consistency" or similar:
- Use generateKeyframeImagesDirect tool immediately - do NOT use generateConsistencySpec or lockConsistency
- This tool generates images directly from the script's visual description
- Start with Hook section, START position

## Storyboard Assembly (CRITICAL)
After all 15 keyframes are selected (CTA END is the last one):
1. The user will ask to "create storyboard", "assemble storyboard", or similar
2. You MUST call the **assembleStoryboard** tool with just the conversationId
3. This tool assembles all selected keyframes and generates transition prompts
4. The storyboard will appear in the canvas for review
5. Do NOT just say the storyboard is ready - you must CALL THE TOOL

Example:
- User: "create storyboard"
- You: Call assembleStoryboard tool, then say "Storyboard assembled! Review it in the canvas."

NEVER skip the assembleStoryboard tool call - the canvas depends on the tool result to display the storyboard.`

// Helper function to generate hook text based on style
function generateHookText(
  offer: { productName?: string; dreamOutcome?: string; keySellingPoints?: string[]; summary?: string },
  avatar: { painPoints?: string[]; aspirations?: string[]; name?: string },
  style: string,
  adFormat: string
): string {
  const product = offer.productName || 'this solution'
  const outcome = offer.dreamOutcome || 'achieve your goals'
  const painPoint = avatar.painPoints?.[0] || 'struggling with this problem'
  const aspiration = avatar.aspirations?.[0] || 'success'

  const isUgc = adFormat === 'ugc'

  switch (style) {
    case 'Question':
      return isUgc
        ? `What if I told you there's a way to ${outcome.toLowerCase()} without ${painPoint.toLowerCase()}?`
        : `What would your life look like if you could ${outcome.toLowerCase()}?`
    case 'Bold Claim':
      return isUgc
        ? `I used to ${painPoint.toLowerCase()}... until I discovered ${product}. Here's what changed.`
        : `${product} is revolutionizing the way people ${outcome.toLowerCase()}.`
    case 'Pain Point':
      return isUgc
        ? `Tired of ${painPoint.toLowerCase()}? Yeah, me too. But not anymore.`
        : `Every day, thousands of people struggle with ${painPoint.toLowerCase()}. There's a better way.`
    case 'Transformation':
      return isUgc
        ? `3 months ago, I was ${painPoint.toLowerCase()}. Today? ${aspiration}. Let me show you how.`
        : `From ${painPoint.toLowerCase()} to ${aspiration.toLowerCase()} — this is the ${product} story.`
    default:
      return `Discover how ${product} can help you ${outcome.toLowerCase()}.`
  }
}

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

      // Try to find existing conversation
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
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
      }

      const conversation = await Conversation.findById(conversationId)
        .populate('offerId')
        .populate('avatarId')
        .lean()

      if (!conversation) {
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
      }

      // Fetch related data
      const [scripts, keyframes] = await Promise.all([
        Script.find({ conversationId }).lean(),
        Keyframe.find({ conversationId, status: { $in: ['generated', 'selected'] } }).lean(),
      ])

      return {
        phase: conversation.status,
        offer: conversation.offerId,
        avatar: conversation.avatarId,
        adFormat: conversation.adFormat,
        scripts,
        consistencySpec: conversation.consistencySpec,
        keyframes,
        storyboard: conversation.storyboard,
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

      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return { success: false, error: 'Invalid conversation ID' }
      }

      const updated = await Conversation.findByIdAndUpdate(
        conversationId,
        { status: phase },
        { new: true },
      )

      if (!updated) {
        return { success: false, error: 'Conversation not found' }
      }

      return { success: true, phase: updated.status }
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

      const offer = await buildOfferAgent({
        productName: params.productName,
        productDescription: params.productDescription,
        targetAudience: params.targetAudience,
        userNotes: params.userNotes,
      })

      return {
        id: offer._id.toString(),
        name: offer.name,
        productName: offer.productName,
        dreamOutcome: offer.dreamOutcome,
        perceivedLikelihood: offer.perceivedLikelihood,
        timeDelay: offer.timeDelay,
        effortSacrifice: offer.effortSacrifice,
        summary: offer.summary,
        keySellingPoints: offer.keySellingPoints,
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

      // Fetch the offer to pass to the avatar builder
      const offer = await Offer.findById(params.offerId)
      if (!offer) {
        throw new Error(`Offer not found: ${params.offerId}`)
      }

      const avatar = await buildAvatarAgent({
        offer,
        targetDescription: params.targetDescription,
        industry: params.industry,
        userNotes: params.userNotes,
      })

      return {
        id: avatar._id.toString(),
        name: avatar.name,
        demographics: avatar.demographics,
        psychographics: avatar.psychographics,
        painPoints: avatar.painPoints,
        aspirations: avatar.aspirations,
        fullBriefMd: avatar.fullBriefMd,
      }
    },
  }),

  // === Hook Options Tool ===
  generateHookOptions: tool({
    description: 'Generate 4 hook options for the user to choose from. Use this FIRST when the user asks to create hooks, before generating the full script.',
    parameters: z.object({
      conversationId: z.string(),
      offerId: z.string(),
      avatarId: z.string(),
      adFormat: z.enum(['ugc', 'story_movie']),
    }),
    execute: async (params) => {
      console.log(`[tool] generateHookOptions:`, params)

      // Fetch offer and avatar
      const [offer, avatar] = await Promise.all([
        Offer.findById(params.offerId),
        Avatar.findById(params.avatarId),
      ])

      if (!offer) throw new Error(`Offer not found: ${params.offerId}`)
      if (!avatar) throw new Error(`Avatar not found: ${params.avatarId}`)

      // Generate 4 different hook styles
      const hookStyles = [
        { style: 'Question', description: 'Opens with a provocative question that makes viewer stop scrolling' },
        { style: 'Bold Claim', description: 'Starts with a surprising statistic or bold statement' },
        { style: 'Pain Point', description: 'Leads with the viewer\'s frustration or struggle' },
        { style: 'Transformation', description: 'Shows the before/after or possibility' },
      ]

      const hooks = hookStyles.map((hookStyle, index) => ({
        _id: `hook-${Date.now()}-${index}`,
        index,
        hookText: generateHookText(offer, avatar, hookStyle.style, params.adFormat),
        style: hookStyle.style,
        rationale: hookStyle.description,
        status: 'pending' as const,
      }))

      return { hooks }
    },
  }),

  // === Script Tools ===
  generateScript: tool({
    description: 'Generate ad copy for all 5 sections based on offer, avatar, and format. Use AFTER the user has selected their preferred hook. Pass the selected hook text to use it.',
    parameters: z.object({
      conversationId: z.string(),
      offerId: z.string(),
      avatarId: z.string(),
      adFormat: z.enum(['ugc', 'story_movie']),
      selectedHookText: z.string().optional().describe('The hook text the user selected, to use as the hook section'),
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

      // Fetch offer and avatar
      const [offer, avatar] = await Promise.all([
        Offer.findById(params.offerId),
        Avatar.findById(params.avatarId),
      ])

      if (!offer) throw new Error(`Offer not found: ${params.offerId}`)
      if (!avatar) throw new Error(`Avatar not found: ${params.avatarId}`)

      // Default duration targets
      const durationTargets = params.durationTargets ?? {
        hook: 5,
        problem: 13,
        solution: 14,
        social_proof: 14,
        cta: 14,
      }

      const scripts = await writeScript({
        conversationId: params.conversationId,
        offer,
        avatar,
        adFormat: params.adFormat,
        durationTargets,
        selectedHookText: params.selectedHookText,
      })

      return {
        scripts: scripts.map((s) => ({
          _id: s._id.toString(),
          section: s.section,
          copyText: s.copyText,
          visualDescription: s.visualDescription,
          durationSeconds: s.durationSeconds,
          status: s.status,
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

      const updated = await Script.findByIdAndUpdate(
        scriptId,
        { status: 'approved' },
        { new: true },
      )

      if (!updated) {
        return { success: false, error: 'Script not found' }
      }

      return {
        success: true,
        scriptId: updated._id.toString(),
        section: updated.section,
        status: updated.status,
      }
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

      // Fetch avatar and scripts
      const [avatar, scripts] = await Promise.all([
        Avatar.findById(params.avatarId),
        Script.find({ conversationId: params.conversationId }),
      ])

      if (!avatar) throw new Error(`Avatar not found: ${params.avatarId}`)

      const spec = await lockConsistencyAgent({
        conversationId: params.conversationId,
        avatar,
        scripts,
        adFormat: params.adFormat,
      })

      return {
        avatarSpec: spec.avatarSpec,
        environmentSpec: spec.environmentSpec,
        visualStyle: spec.visualStyle,
        colorPalette: spec.colorPalette,
        status: spec.status,
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

      const updated = await Conversation.findByIdAndUpdate(
        conversationId,
        { 'consistencySpec.status': 'locked' },
        { new: true },
      )

      if (!updated) {
        return { success: false, error: 'Conversation not found' }
      }

      return { success: true, status: 'locked' }
    },
  }),

  // === Keyframe Tools ===

  // Direct image generation tool - bypasses consistency spec for quick testing
  generateKeyframeImagesDirect: tool({
    description: 'Generate keyframe images directly from script visual description. Use this to skip consistency spec and go straight to image generation. Returns 4 image options. For sequential storyboard positions (middle, end), it references the previously selected keyframe for visual continuity.',
    parameters: z.object({
      conversationId: z.string(),
      section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
      position: z.enum(['start', 'middle', 'end']),
    }),
    execute: async (params) => {
      console.log(`[tool] generateKeyframeImagesDirect:`, params)

      // Fetch script for visual description
      const script = await Script.findOne({
        conversationId: params.conversationId,
        section: params.section
      })

      if (!script) throw new Error(`Script not found for section: ${params.section}`)

      // Find previously selected keyframe for storyboard continuity
      // For START position, look at END of previous section
      // For MIDDLE/END position, look at previous position in same section
      let referenceKeyframe = null
      if (params.position === 'start') {
        // Look for the END keyframe of the previous section
        const sectionOrder = ['hook', 'problem', 'solution', 'social_proof', 'cta']
        const currentIdx = sectionOrder.indexOf(params.section)
        if (currentIdx > 0) {
          const prevSection = sectionOrder[currentIdx - 1]
          referenceKeyframe = await Keyframe.findOne({
            conversationId: params.conversationId,
            section: prevSection,
            position: 'end',
            status: 'selected',
          })
        }
      } else {
        // Look for the previous position in the same section
        const prevPosition = params.position === 'middle' ? 'start' : 'middle'
        referenceKeyframe = await Keyframe.findOne({
          conversationId: params.conversationId,
          section: params.section,
          position: prevPosition,
          status: 'selected',
        })
      }

      const referenceImageUrl = referenceKeyframe?.imageUrl || undefined
      console.log(`[keyframe] Reference image for continuity:`, referenceImageUrl || 'none (first frame)')

      // Build a base prompt optimized for photorealistic output
      const basePrompt = script.visualDescription || `Professional ad scene for ${params.section} section`

      // Add storyboard context to the prompt
      const positionContext = params.position === 'start'
        ? 'opening shot establishing the scene'
        : params.position === 'middle'
          ? 'mid-action sequence showing progression'
          : 'concluding shot with emotional payoff'

      // Generate 4 variations with photorealistic styling
      const promptVariations = [
        `${basePrompt}. ${positionContext}. Photorealistic, shot on RED camera, 8K resolution, cinematic color grading, shallow depth of field`,
        `${basePrompt}. ${positionContext}. Hyper-realistic photography, natural lighting, professional commercial shoot, ARRI Alexa quality`,
        `${basePrompt}. ${positionContext}. Ultra-realistic, documentary style, authentic human emotion, Sony A7R IV quality`,
        `${basePrompt}. ${positionContext}. Photorealistic, golden hour lighting, lifestyle photography, Canon EOS R5 quality`,
      ]

      // Create keyframes and generate images
      const keyframes = await Promise.all(
        promptVariations.map(async (promptText, variantIndex) => {
          // Create keyframe record
          const keyframe = await Keyframe.create({
            conversationId: params.conversationId,
            section: params.section,
            position: params.position,
            variantIndex,
            promptText,
            imageUrl: '',
            generationTaskId: '',
            status: 'generating',
          })

          // Generate image async using fal.ai Flux Pro for hyper-realistic output
          void (async () => {
            try {
              console.log(`[keyframe] Generating image ${variantIndex + 1}/4 for ${params.section}/${params.position}`)
              const localUrl = await falAi.generateImage({
                prompt: promptText,
                referenceImageUrl,
                aspectRatio: '16:9',
              })
              console.log(`[keyframe] Image ${variantIndex + 1} generated: ${localUrl}`)
              await Keyframe.findByIdAndUpdate(keyframe._id, {
                imageUrl: localUrl,
                status: 'generated',
              })
            } catch (err) {
              console.error(`[keyframe] fal.ai generation failed for ${keyframe._id}:`, err)
              // Fallback to DALL-E if fal.ai fails
              try {
                console.log(`[keyframe] Falling back to DALL-E for ${keyframe._id}`)
                const localUrl = await googleImagen.generateImage({
                  prompt: promptText,
                  aspectRatio: '16:9',
                })
                await Keyframe.findByIdAndUpdate(keyframe._id, {
                  imageUrl: localUrl,
                  status: 'generated',
                })
              } catch (fallbackErr) {
                console.error(`[keyframe] Fallback also failed for ${keyframe._id}:`, fallbackErr)
                await Keyframe.findByIdAndUpdate(keyframe._id, { status: 'rejected' })
              }
            }
          })()

          return {
            id: keyframe._id.toString(),
            _id: keyframe._id.toString(),
            section: params.section,
            position: params.position,
            variantIndex,
            promptText,
            imageUrl: '',
            status: 'generating',
          }
        }),
      )

      // Update conversation phase to keyframing
      await Conversation.findByIdAndUpdate(params.conversationId, { status: 'keyframing' })

      return { keyframes }
    },
  }),

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

      // Fetch conversation for consistency spec and script for visual description
      const [conversation, script] = await Promise.all([
        Conversation.findById(params.conversationId),
        Script.findOne({ conversationId: params.conversationId, section: params.section }),
      ])

      if (!conversation) throw new Error(`Conversation not found: ${params.conversationId}`)
      if (!conversation.consistencySpec) throw new Error('Consistency spec not set')
      if (!script) throw new Error(`Script not found for section: ${params.section}`)

      // Get previous keyframe prompt for continuity
      let previousKeyframePrompt: string | undefined
      if (params.previousKeyframeId) {
        const prevKf = await Keyframe.findById(params.previousKeyframeId)
        previousKeyframePrompt = prevKf?.promptText
      }

      const prompts = await generateKeyframePromptsAgent({
        section: params.section,
        position: params.position,
        visualDescription: script.visualDescription,
        consistencySpec: conversation.consistencySpec,
        adFormat: conversation.adFormat,
        previousKeyframePrompt,
      })

      return {
        prompts: prompts.map((p, i) => ({
          variantIndex: i,
          promptText: p.promptText,
          negativePrompt: p.negativePrompt,
          style: p.style,
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

      // Generate images using Google Imagen (synchronous - returns images directly)
      const keyframes = await Promise.all(
        params.prompts.map(async (p) => {
          // Create keyframe record in DB first
          const keyframe = await Keyframe.create({
            conversationId: params.conversationId,
            section: params.section,
            position: params.position,
            variantIndex: p.variantIndex,
            promptText: p.promptText,
            imageUrl: '',
            generationTaskId: '',
            status: 'generating',
          })

          // Generate image with Google Imagen (async in background)
          void (async () => {
            try {
              const localUrl = await googleImagen.generateImage({
                prompt: p.promptText,
                negative_prompt: p.negativePrompt,
                aspectRatio: '16:9',
              })
              await Keyframe.findByIdAndUpdate(keyframe._id, {
                imageUrl: localUrl,
                status: 'generated',
              })
            } catch (err) {
              console.error(`[keyframe] Generation failed for ${keyframe._id}:`, err)
              await Keyframe.findByIdAndUpdate(keyframe._id, { status: 'rejected' })
            }
          })()

          return {
            id: keyframe._id.toString(),
            section: params.section,
            position: params.position,
            variantIndex: p.variantIndex,
            promptText: p.promptText,
            imageUrl: '',
            status: 'generating',
            generationTaskId: '',
          }
        }),
      )

      return { keyframes }
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

      // Mark the selected keyframe
      await Keyframe.findByIdAndUpdate(params.selectedKeyframeId, { status: 'selected' })

      // Reject other keyframes for the same section/position
      await Keyframe.updateMany(
        {
          conversationId: params.conversationId,
          section: params.section,
          position: params.position,
          _id: { $ne: params.selectedKeyframeId },
        },
        { status: 'rejected' },
      )

      const sectionIndex = AD_SECTIONS.indexOf(params.section)
      return {
        success: true,
        selectedKeyframeId: params.selectedKeyframeId,
        section: params.section,
        position: params.position,
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

      // Fetch keyframes and conversation
      const [startKf, middleKf, endKf, conversation, script] = await Promise.all([
        Keyframe.findById(params.startKeyframeId),
        Keyframe.findById(params.middleKeyframeId),
        Keyframe.findById(params.endKeyframeId),
        Conversation.findById(params.conversationId),
        Script.findOne({ conversationId: params.conversationId, section: params.section }),
      ])

      if (!startKf || !middleKf || !endKf) {
        throw new Error('One or more keyframes not found')
      }
      if (!conversation) throw new Error(`Conversation not found: ${params.conversationId}`)
      if (!script) throw new Error(`Script not found for section: ${params.section}`)

      const transitions = await writeTransitionPrompts({
        conversationId: params.conversationId,
        section: params.section,
        startKeyframePrompt: startKf.promptText,
        middleKeyframePrompt: middleKf.promptText,
        endKeyframePrompt: endKf.promptText,
        scriptSection: script.copyText,
        adFormat: conversation.adFormat,
      })

      return {
        transitions: transitions.map((t) => ({
          id: t._id.toString(),
          fromPosition: t.fromPosition,
          toPosition: t.toPosition,
          promptText: t.promptText,
        })),
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

      // Fetch all required data
      const [conversation, scripts, selectedKeyframes, transitionPrompts] = await Promise.all([
        Conversation.findById(conversationId),
        Script.find({ conversationId }),
        Keyframe.find({ conversationId, status: 'selected' }),
        TransitionPrompt.find({ conversationId }),
      ])

      if (!conversation) throw new Error(`Conversation not found: ${conversationId}`)

      const durationTargets = conversation.durationAllocation ?? {
        hook: 5,
        problem: 13,
        solution: 14,
        social_proof: 14,
        cta: 14,
      }

      const sections = await assembleStoryboardAgent({
        conversationId,
        scripts,
        selectedKeyframes,
        transitionPrompts,
        durationTargets,
      })

      // Get updated conversation with storyboard
      const updated = await Conversation.findById(conversationId)

      return {
        storyboard: {
          totalDuration: updated?.storyboard?.totalDuration ?? 60,
          sections: sections.map((s) => ({
            section: s.section,
            startTime: s.startTime,
            endTime: s.endTime,
            keyframes: s.keyframes,
            transitions: s.transitions,
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

      const updated = await Conversation.findByIdAndUpdate(
        conversationId,
        { 'storyboard.status': 'approved' },
        { new: true },
      )

      if (!updated) {
        return { success: false, error: 'Conversation not found' }
      }

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

      // Fetch conversation for ad format
      const conversation = await Conversation.findById(params.conversationId)
      if (!conversation) throw new Error(`Conversation not found: ${params.conversationId}`)

      // Get target keyframe URL
      const position = params.transition === 'start_to_middle' ? 'middle' : 'end'
      const targetKeyframe = await Keyframe.findOne({
        conversationId: params.conversationId,
        section: params.section,
        position,
        status: 'selected',
      })

      const { segment, videoPrompt } = await generateVideoPrompt({
        conversationId: params.conversationId,
        section: params.section,
        transition: params.transition,
        transitionText: params.transitionPrompt,
        sourceKeyframeUrl: params.sourceKeyframeUrl,
        targetKeyframeUrl: targetKeyframe?.imageUrl ?? '',
        durationSeconds: params.durationSeconds,
        adFormat: conversation.adFormat,
      })

      return {
        videoPrompt: {
          segmentId: segment._id.toString(),
          motionPrompt: videoPrompt.motionPrompt,
          cameraMovement: videoPrompt.cameraMovement,
          duration: params.durationSeconds,
          sourceImageUrl: params.sourceKeyframeUrl,
          model: videoPrompt.model,
        },
      }
    },
  }),

  generateVideo: tool({
    description: 'Generate a video segment using Sora.',
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

      const provider = 'sora'
      const model = 'sora-2-pro'

      // Find or create the video segment
      let segment = await VideoSegment.findOne({
        conversationId: params.conversationId,
        section: params.section,
        transition: params.transition,
      })

      if (!segment) {
        segment = await VideoSegment.create({
          conversationId: params.conversationId,
          section: params.section,
          transition: params.transition,
          videoPrompt: params.motionPrompt,
          sourceKeyframeUrl: params.sourceImageUrl,
          videoUrl: '',
          provider,
          aiModel: model,
          generationTaskId: '',
          durationSeconds: params.durationSeconds,
          status: 'queued',
        })
      }

      // Start video generation with Sora
      const taskId = await sora.generateVideo({
        prompt: params.motionPrompt,
        imageUrl: params.sourceImageUrl,
        duration: params.durationSeconds,
      })

      await VideoSegment.findByIdAndUpdate(segment._id, {
        generationTaskId: taskId,
        status: 'generating',
      })

      // Poll for completion in background
      void (async () => {
        try {
          const videoUrl = await sora.pollUntilComplete(taskId)
          const localUrl = await googleImagen.downloadAndSave(videoUrl, 'videos')
          await VideoSegment.findByIdAndUpdate(segment!._id, {
            videoUrl: localUrl,
            status: 'generated',
          })
        } catch (err) {
          console.error(`[video] Sora generation failed for ${segment!._id}:`, err)
          await VideoSegment.findByIdAndUpdate(segment!._id, { status: 'rejected' })
        }
      })()

      return {
        videoSegment: {
          id: segment._id.toString(),
          section: params.section,
          transition: params.transition,
          videoUrl: '',
          status: 'generating',
          provider: 'sora',
          model: 'sora-2-pro',
        },
      }
    },
  }),
}

// Copilot result interface
export interface CopilotResult {
  text: string
  steps: unknown[]
}

// Main orchestrator function - now async
export async function runCopilot(params: {
  conversationId: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  campaignContext?: string | null
  onChunk?: (chunk: string) => void
}): Promise<CopilotResult> {
  console.log('[copilot] Starting with conversationId:', params.conversationId)
  console.log('[copilot] ANTHROPIC_API_KEY available:', !!process.env['ANTHROPIC_API_KEY'])
  console.log('[copilot] Campaign context provided:', !!params.campaignContext)

  // Build system prompt with campaign context if available
  let systemPrompt = SYSTEM_PROMPT
  if (params.campaignContext) {
    systemPrompt = `${SYSTEM_PROMPT}

---

${params.campaignContext}`
  }

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages: params.messages,
    tools: orchestratorTools,
    maxSteps: 10,
  })

  // Consume the stream properly
  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
    if (params.onChunk) {
      params.onChunk(chunk)
    }
  }

  // Get steps after stream is consumed
  const steps = await result.steps

  console.log('[copilot] Completed, text length:', fullText.length)
  return { text: fullText, steps }
}
