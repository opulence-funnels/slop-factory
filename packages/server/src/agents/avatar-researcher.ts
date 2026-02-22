import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { Avatar } from '../models/avatar.model.js'
import type { IOffer } from '../models/offer.model.js'

const AvatarOutputSchema = z.object({
  name: z.string(),
  demographics: z.object({
    age: z.string(),
    income: z.string(),
    location: z.string(),
    jobTitle: z.string(),
    gender: z.string(),
  }),
  psychographics: z.object({
    values: z.array(z.string()),
    fears: z.array(z.string()),
    worldview: z.string(),
  }),
  painPoints: z.array(z.string()),
  failedSolutions: z.array(z.string()),
  languagePatterns: z.array(z.string()),
  objections: z.array(z.string()),
  triggerEvents: z.array(z.string()),
  aspirations: z.array(z.string()),
  worldview: z.string(),
  fullBriefMd: z.string(),
})

export async function buildAvatar(input: {
  offer: IOffer
  targetDescription: string
  industry: string
  userNotes?: string
}) {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: AvatarOutputSchema,
    prompt: `You are an expert customer research analyst. Create a psychological avatar brief.

Offer: ${input.offer.productName} — ${input.offer.dreamOutcome}
Target: ${input.targetDescription}
Industry: ${input.industry}
${input.userNotes ? `Notes: ${input.userNotes}` : ''}

Create a comprehensive psychological avatar with:
- demographics: Specific age range, income bracket, location, job title, gender
- psychographics: Core values (3), deep fears (3), overall worldview sentence
- painPoints: 4-6 specific daily frustrations related to the offer's problem space
- failedSolutions: 3-5 things they've already tried that didn't work
- languagePatterns: 4-6 exact phrases they use to describe their problem
- objections: 3-5 reasons they'd hesitate to buy
- triggerEvents: 2-4 specific events that made their pain acute (loss, failure, embarrassment)
- aspirations: 3-5 what success looks like to them
- worldview: One sentence capturing their core belief about work/effort/technology
- fullBriefMd: Complete markdown summary of the avatar (2-3 paragraphs)
- name: A first name for this persona (e.g. "Mike" or "Sarah")`,
  })

  const avatar = await Avatar.create(object)
  return avatar
}
