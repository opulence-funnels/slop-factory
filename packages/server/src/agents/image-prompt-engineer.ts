import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type { AdSection, AdFormat } from '@slop-factory/shared'
import type { IConsistencySpec } from '../models/conversation.model.js'

const ImagePromptArraySchema = z.object({
  prompts: z.array(
    z.object({
      promptText: z.string(),
      negativePrompt: z.string(),
      style: z.string(),
    }),
  ),
})

export async function generateKeyframePrompts(input: {
  section: AdSection
  position: 'start' | 'middle' | 'end'
  visualDescription: string
  consistencySpec: IConsistencySpec
  adFormat: AdFormat
  previousKeyframePrompt?: string
}) {
  const contextNote = input.previousKeyframePrompt
    ? `This follows from: "${input.previousKeyframePrompt}". Maintain visual continuity.`
    : ''

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: ImagePromptArraySchema,
    prompt: `You are an expert image prompt engineer for AI video ad production.

Generate 4 DIFFERENT image prompt options for a keyframe.

SECTION: ${input.section.toUpperCase()}
POSITION: ${input.position.toUpperCase()} (${input.position === 'start' ? 'opening frame' : input.position === 'middle' ? 'midpoint/peak action' : 'closing/transitional frame'})
VISUAL DESCRIPTION: ${input.visualDescription}
${contextNote}

LOCKED CHARACTER: ${input.consistencySpec.avatarSpec.fullDescription}
LOCKED ENVIRONMENT: ${input.consistencySpec.environmentSpec.fullDescription}
VISUAL STYLE: ${input.consistencySpec.visualStyle}

Rules:
1. Each prompt must include the locked character description verbatim
2. Each prompt must match the environment and visual style
3. Each option should offer a DIFFERENT angle/framing/moment while capturing the same emotional beat
4. Include specific camera direction (wide shot, close-up, over-shoulder, etc.)
5. Include lighting and mood details
6. negativePrompt: artifacts, blur, text, watermarks, multiple people, cartoon

Return exactly 4 prompts.`,
  })

  return object.prompts
}
