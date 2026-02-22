import { generateObject, generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { Conversation } from '../models/conversation.model.js'
import type { IAvatar } from '../models/avatar.model.js'
import type { IScript } from '../models/script.model.js'
import type { AdFormat } from '@slop-factory/shared'

const ConsistencySpecSchema = z.object({
  avatarSpec: z.object({
    age: z.string(),
    gender: z.string(),
    hairColor: z.string(),
    hairStyle: z.string(),
    skinTone: z.string(),
    clothing: z.string(),
    distinguishingFeatures: z.string(),
    fullDescription: z.string(),
  }),
  environmentSpec: z.object({
    location: z.string(),
    timeOfDay: z.string(),
    lighting: z.string(),
    keyProps: z.array(z.string()),
    colorScheme: z.array(z.string()),
    fullDescription: z.string(),
  }),
  visualStyle: z.string(),
  colorPalette: z.array(z.string()),
})

export async function lockConsistency(input: {
  conversationId: string
  avatar: IAvatar
  scripts: IScript[]
  adFormat: AdFormat
}) {
  const scriptSummary = input.scripts
    .map((s) => `${s.section}: ${s.visualDescription}`)
    .join('\n')

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: ConsistencySpecSchema,
    prompt: `You are a visual consistency director for video production. Create locked visual specs.

AVATAR: ${input.avatar.name}
Demographics: ${JSON.stringify(input.avatar.demographics)}
Psychographics worldview: ${input.avatar.worldview}

SCRIPT VISUAL DESCRIPTIONS:
${scriptSummary}

AD FORMAT: ${input.adFormat}

Create precise, reusable visual specifications that will be injected into EVERY image prompt to ensure consistency:

avatarSpec.fullDescription: A single sentence usable verbatim in image prompts, e.g. "42-year-old stocky white male, short dark brown hair, weathered tan skin, wearing orange hi-vis vest and Carhartt work pants, steel-toed boots"

environmentSpec.fullDescription: Environment context sentence, e.g. "active residential construction site, golden hour natural light, steel framing background, sawdust and blueprints visible"

visualStyle: Photographic style, e.g. "cinematic 4K, shallow depth of field, golden hour warm tones, documentary-style handheld" or for UGC: "vertical 9:16, phone camera quality, natural indoor lighting, authentic and unpolished"

colorPalette: 4-5 hex colors that define the visual palette`,
  })

  const spec = {
    ...object,
    status: 'draft' as const,
  }

  await Conversation.findByIdAndUpdate(input.conversationId, {
    consistencySpec: spec,
  })

  return spec
}

export async function validatePrompt(input: {
  prompt: string
  spec: {
    avatarSpec: { fullDescription: string }
    environmentSpec: { fullDescription: string }
    visualStyle: string
  }
}): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-5'),
    prompt: `You are a prompt consistency validator. Check if this image prompt matches the locked visual spec.

LOCKED AVATAR SPEC: ${input.spec.avatarSpec.fullDescription}
LOCKED ENVIRONMENT SPEC: ${input.spec.environmentSpec.fullDescription}
LOCKED VISUAL STYLE: ${input.spec.visualStyle}

IMAGE PROMPT TO VALIDATE:
${input.prompt}

If the prompt is consistent, return it unchanged.
If it's inconsistent or missing key details, return a corrected version that:
1. Preserves the creative intent of the original prompt
2. Injects the avatar description naturally
3. Matches the environment spec
4. Matches the visual style

Return ONLY the final prompt text, no explanation.`,
  })

  return text.trim()
}
