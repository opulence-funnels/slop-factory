import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { Script } from '../models/script.model.js'
import type { IOffer } from '../models/offer.model.js'
import type { IAvatar } from '../models/avatar.model.js'
import type { AdFormat, AdSection } from '@slop-factory/shared'

const SectionScriptSchema = z.object({
  section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
  copyText: z.string(),
  visualDescription: z.string(),
  durationSeconds: z.number(),
})

const AdScriptSchema = z.object({
  sections: z.array(SectionScriptSchema),
})

export async function writeScript(input: {
  conversationId: string
  offer: IOffer
  avatar: IAvatar
  adFormat: AdFormat
  durationTargets: Record<AdSection, number>
  selectedHookText?: string
}) {
  const formatInstructions =
    input.adFormat === 'ugc'
      ? 'UGC Style: First-person, conversational, raw/authentic. Written as if the avatar is speaking directly to camera on their phone. Use their exact language patterns.'
      : 'Story Movie Style: Third-person cinematic narrative. Scene-based storytelling with the avatar as protagonist. Polished, emotionally driven.'

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: AdScriptSchema,
    prompt: `You are an expert direct-response copywriter. Write a 60-second video ad script.

${formatInstructions}

OFFER:
- Product: ${input.offer.productName}
- Dream Outcome: ${input.offer.dreamOutcome}
- Likelihood: ${input.offer.perceivedLikelihood}
- Time Delay: ${input.offer.timeDelay}
- Effort: ${input.offer.effortSacrifice}
- Key Points: ${input.offer.keySellingPoints.join(', ')}

AVATAR: ${input.avatar.name}
- Pain Points: ${input.avatar.painPoints.join('; ')}
- Failed Solutions: ${input.avatar.failedSolutions.join('; ')}
- Language: ${input.avatar.languagePatterns.join('; ')}
- Trigger Event: ${input.avatar.triggerEvents[0] ?? ''}
- Objections: ${input.avatar.objections.join('; ')}

SECTIONS (write all 5):
1. Hook (${input.durationTargets['hook']}s): ${input.selectedHookText ? `USE THIS EXACT HOOK: "${input.selectedHookText}"` : 'Bold attention-grabbing opening. Question or bold claim using avatar\'s language.'}
2. Problem (${input.durationTargets['problem']}s): Dramatize their pain. Use trigger event. Make them feel seen.
3. Solution (${input.durationTargets['solution']}s): Introduce product as the answer. Mechanism. Why it works when others didn't.
4. Social Proof (${input.durationTargets['social_proof']}s): Testimonial/stat. Third-party validation. Specific, believable.
5. CTA (${input.durationTargets['cta']}s): Clear action. Eliminate risk (free trial, no credit card). Urgency if natural.

For each section, provide:
- copyText: The actual spoken/on-screen words
- visualDescription: What the camera shows (scene, action, props, framing)
- durationSeconds: Exact seconds for this section`,
  })

  const scripts = await Script.insertMany(
    object.sections.map((s) => ({
      conversationId: input.conversationId,
      section: s.section,
      copyText: s.copyText,
      visualDescription: s.visualDescription,
      durationSeconds: s.durationSeconds,
      status: 'draft',
      variantIndex: 0,
    })),
  )

  return scripts
}
