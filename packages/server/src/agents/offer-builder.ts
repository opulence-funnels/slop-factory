import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { Offer } from '../models/offer.model.js'

const OfferOutputSchema = z.object({
  name: z.string(),
  productName: z.string(),
  dreamOutcome: z.string(),
  perceivedLikelihood: z.string(),
  timeDelay: z.string(),
  effortSacrifice: z.string(),
  summary: z.string(),
  keySellingPoints: z.array(z.string()),
})

export async function buildOffer(input: {
  productName: string
  productDescription: string
  targetAudience: string
  userNotes?: string
}) {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: OfferOutputSchema,
    prompt: `You are an expert direct-response marketer using the Hormozi Value Equation.

Build a structured offer for:
Product: ${input.productName}
Description: ${input.productDescription}
Target Audience: ${input.targetAudience}
${input.userNotes ? `Additional Notes: ${input.userNotes}` : ''}

For each field, be specific and compelling:
- dreamOutcome: The vivid, emotional result the customer desires
- perceivedLikelihood: Why they'll believe this actually works (proof, mechanism, trial)
- timeDelay: Exact timeline to first result and full ROI
- effortSacrifice: Minimal steps required, what they DON'T have to do
- summary: One punchy sentence combining all four
- keySellingPoints: 3-5 bullet points for ad copy

Make the value equation obvious: (High Dream × High Likelihood) / (Low Time × Low Effort) = Maximum Value`,
  })

  const offer = await Offer.create({
    ...object,
  })

  return offer
}
