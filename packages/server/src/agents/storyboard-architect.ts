import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { Conversation } from '../models/conversation.model.js'
import type { IKeyframe } from '../models/keyframe.model.js'
import type { ITransitionPrompt } from '../models/transition-prompt.model.js'
import type { IScript } from '../models/script.model.js'
import type { AdSection } from '@slop-factory/shared'

const StoryboardSchema = z.object({
  sections: z.array(
    z.object({
      section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
      startTime: z.number(),
      endTime: z.number(),
      dialogue: z.string(),
      textOverlay: z.string().nullable(),
    }),
  ),
  totalDuration: z.number(),
})

export async function assembleStoryboard(input: {
  conversationId: string
  scripts: IScript[]
  selectedKeyframes: IKeyframe[]
  transitionPrompts: ITransitionPrompt[]
  durationTargets: Record<AdSection, number>
}) {
  const sectionSummary = input.scripts
    .map((s) => `${s.section}: "${s.copyText}" (${s.durationSeconds}s)`)
    .join('\n')

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: StoryboardSchema,
    prompt: `You are a video editor assembling a storyboard. Calculate exact timecodes and finalize dialogue.

SECTIONS AND COPY:
${sectionSummary}

DURATION TARGETS (seconds):
${JSON.stringify(input.durationTargets)}

Assemble the storyboard:
- Calculate startTime/endTime for each section (cumulative, starting at 0)
- dialogue: The final on-screen copy/voiceover text (cleaned up, broadcast-ready)
- textOverlay: Any text that should appear as on-screen graphic (product name, URL, stat) or null
- totalDuration: Total video length in seconds

Keep it tight. Target ~60s total. Hook can be 3-5s, others 10-15s.`,
  })

  // Build the full storyboard with keyframe references
  const sections = object.sections.map((s) => {
    const sectionKeyframes = input.selectedKeyframes.filter(
      (kf) => kf.section === s.section && kf.status === 'selected',
    )
    const sectionTransitions = input.transitionPrompts.filter(
      (tp) => tp.section === s.section,
    )

    const startKf = sectionKeyframes.find((kf) => kf.position === 'start')
    const middleKf = sectionKeyframes.find((kf) => kf.position === 'middle')
    const endKf = sectionKeyframes.find((kf) => kf.position === 'end')
    const s2m = sectionTransitions.find((tp) => tp.fromPosition === 'start')
    const m2e = sectionTransitions.find((tp) => tp.fromPosition === 'middle')

    return {
      section: s.section as AdSection,
      startTime: s.startTime,
      endTime: s.endTime,
      keyframes: {
        start: { keyframeId: startKf?._id?.toString() ?? '', imageUrl: startKf?.imageUrl ?? '' },
        middle: { keyframeId: middleKf?._id?.toString() ?? '', imageUrl: middleKf?.imageUrl ?? '' },
        end: { keyframeId: endKf?._id?.toString() ?? '', imageUrl: endKf?.imageUrl ?? '' },
      },
      transitions: {
        startToMiddle: {
          promptId: s2m?._id?.toString() ?? '',
          text: s2m ? (s2m.userEditedText ?? s2m.promptText) : '',
        },
        middleToEnd: {
          promptId: m2e?._id?.toString() ?? '',
          text: m2e ? (m2e.userEditedText ?? m2e.promptText) : '',
        },
      },
      dialogue: s.dialogue,
      textOverlay: s.textOverlay,
    }
  })

  await Conversation.findByIdAndUpdate(input.conversationId, {
    storyboard: {
      sections,
      totalDuration: object.totalDuration,
      status: 'draft',
    },
  })

  return sections
}
