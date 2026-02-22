import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { TransitionPrompt } from '../models/transition-prompt.model.js'
import type { AdSection, AdFormat } from '@slop-factory/shared'

const TransitionOutputSchema = z.object({
  startToMiddle: z.string(),
  middleToEnd: z.string(),
})

export async function writeTransitionPrompts(input: {
  conversationId: string
  section: AdSection
  startKeyframePrompt: string
  middleKeyframePrompt: string
  endKeyframePrompt: string
  scriptSection: string
  adFormat: AdFormat
}) {
  const motionStyle =
    input.adFormat === 'ugc'
      ? 'handheld, naturalistic movement, zoom-in'
      : 'cinematic camera moves: push-in, dolly, crane, rack focus'

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: TransitionOutputSchema,
    prompt: `You are a cinematographer writing motion/transition descriptions for AI video generation.

Write two transition descriptions for the ${input.section.toUpperCase()} section.

MOTION STYLE: ${motionStyle}

START frame: ${input.startKeyframePrompt}
MIDDLE frame: ${input.middleKeyframePrompt}
END frame: ${input.endKeyframePrompt}

SCRIPT/DIALOGUE: ${input.scriptSection}

For each transition, write a single sentence describing:
- The camera movement (type + direction + speed)
- Any subject action/change happening during the move
- The emotional/pacing intent

Examples:
- "Slow push-in from medium to close-up as character looks down at phone, frustration building"
- "Rapid rack focus from background chaos to foreground face, moment of realization"
- "Smooth crane up revealing full job site, golden light sweeping across frame"

startToMiddle: Transition from START → MIDDLE frame
middleToEnd: Transition from MIDDLE → END frame`,
  })

  const [tp1, tp2] = await Promise.all([
    TransitionPrompt.create({
      conversationId: input.conversationId,
      section: input.section,
      fromPosition: 'start',
      toPosition: 'middle',
      promptText: object.startToMiddle,
      userEdited: false,
      userEditedText: null,
    }),
    TransitionPrompt.create({
      conversationId: input.conversationId,
      section: input.section,
      fromPosition: 'middle',
      toPosition: 'end',
      promptText: object.middleToEnd,
      userEdited: false,
      userEditedText: null,
    }),
  ])

  return [tp1, tp2]
}
