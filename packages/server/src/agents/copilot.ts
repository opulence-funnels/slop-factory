import { streamText, tool } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { Conversation } from '../models/conversation.model.js'
import { Offer } from '../models/offer.model.js'
import { Avatar } from '../models/avatar.model.js'
import { Script } from '../models/script.model.js'
import { Keyframe } from '../models/keyframe.model.js'
import { TransitionPrompt } from '../models/transition-prompt.model.js'
import { VideoSegment } from '../models/video-segment.model.js'
import { Message } from '../models/message.model.js'
import { writeScript } from './script-writer.js'
import { lockConsistency } from './consistency-enforcer.js'
import { generateKeyframePrompts } from './image-prompt-engineer.js'
import { writeTransitionPrompts } from './transition-prompt-writer.js'
import { assembleStoryboard } from './storyboard-architect.js'
import { generateVideoPrompt } from './video-prompt-engineer.js'
import {
  generateImage,
  generateVideo,
  pollUntilDone,
  downloadAndSave,
  videoQueue,
} from '../lib/freepik.js'
import type { AdSection } from '@slop-factory/shared'
import type { Response } from 'express'

const PHASE_NAMES = [
  'Setup',
  'Brief Confirmation',
  'Script Generation',
  'Character Lock',
  'Keyframe Selection',
  'Storyboard Review',
  'Video Generation',
  'Review',
  'Export',
]

export async function runCopilot(params: {
  conversationId: string
  userMessage: string
  res: Response
}) {
  const { conversationId, userMessage, res } = params

  const conv = await Conversation.findById(conversationId)
  if (!conv) throw new Error('Conversation not found')

  const recentMessages = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
  recentMessages.reverse()

  await Message.create({ conversationId, role: 'user', content: userMessage })

  const offer = await Offer.findById(conv.offerId)
  const avatar = await Avatar.findById(conv.avatarId)

  const systemPrompt = `You are AdForge, an AI copilot for building 60-second video advertisements.

CURRENT PHASE: ${conv.phase} — ${PHASE_NAMES[conv.phase] ?? 'Unknown'}
CONVERSATION ID: ${conversationId}
AD FORMAT: ${conv.adFormat}
OFFER: ${offer ? `${offer.productName} — ${offer.dreamOutcome}` : 'Not set'}
AVATAR: ${avatar ? `${avatar.name}` : 'Not set'}
STATUS: ${conv.status}

You guide users through these phases IN ORDER:
0. Setup (done — conversation created)
1. Brief Confirmation — present campaign brief, confirm duration allocation
2. Script Generation — generate 5 section scripts, user approves each
3. Character Lock — generate consistency spec, user locks avatar + environment
4. Keyframe Selection — 15 sequential picks (5 sections × 3 positions), 4 options each
5. Storyboard Review — assembled storyboard with transitions
6. Video Generation — generate 10 video clips from keyframes
7. Review — user watches and approves segments
8. Export — provide download

RULES:
- Never skip phases. Always confirm before advancing to the next phase.
- During keyframe selection, generate images and present them as options.
- Be concise and action-oriented. Guide decisively.
- When tools complete, summarize results briefly and ask for the next action.
- Phase transitions happen when user explicitly confirms/approves.`

  const messages = recentMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: systemPrompt,
    messages: [...messages, { role: 'user' as const, content: userMessage }],
    maxSteps: 10,
    tools: {
      generateScript: tool({
        description: 'Generate ad scripts for all 5 sections using the Script Writer agent',
        parameters: z.object({}),
        execute: async () => {
          if (!offer || !avatar) return { error: 'Offer or avatar not loaded' }
          const scripts = await writeScript({
            conversationId,
            offer,
            avatar,
            adFormat: conv.adFormat,
            durationTargets: conv.durationAllocation,
          })
          await Conversation.findByIdAndUpdate(conversationId, { phase: 2, status: 'scripting' })
          return {
            scripts: scripts.map((s) => ({
              section: s.section,
              copyText: s.copyText,
              visualDescription: s.visualDescription,
              durationSeconds: s.durationSeconds,
            })),
          }
        },
      }),

      lockCharacter: tool({
        description: 'Generate and lock the visual consistency spec for character and environment',
        parameters: z.object({}),
        execute: async () => {
          if (!avatar) return { error: 'Avatar not loaded' }
          const scripts = await Script.find({ conversationId })
          const spec = await lockConsistency({
            conversationId,
            avatar,
            scripts,
            adFormat: conv.adFormat,
          })
          await Conversation.findByIdAndUpdate(conversationId, { phase: 3 })
          return { spec }
        },
      }),

      generateKeyframeOptions: tool({
        description: 'Generate 4 keyframe image options for a specific section and position',
        parameters: z.object({
          section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
          position: z.enum(['start', 'middle', 'end']),
        }),
        execute: async ({ section, position }) => {
          const freshConv = await Conversation.findById(conversationId)
          if (!freshConv?.consistencySpec) return { error: 'Consistency spec not locked' }

          const scripts = await Script.find({ conversationId, section })
          const script = scripts[0]
          if (!script) return { error: `No script for section ${section}` }

          const prevKf =
            position !== 'start'
              ? await Keyframe.findOne({
                  conversationId,
                  section,
                  position: position === 'middle' ? 'start' : 'middle',
                  status: 'selected',
                })
              : null

          const prompts = await generateKeyframePrompts({
            section: section as AdSection,
            position,
            visualDescription: script.visualDescription,
            consistencySpec: freshConv.consistencySpec,
            adFormat: freshConv.adFormat,
            previousKeyframePrompt: prevKf?.promptText,
          })

          const keyframeDocs = await Promise.all(
            prompts.map(async (p, i) => {
              const kf = await Keyframe.create({
                conversationId,
                section,
                position,
                variantIndex: i,
                promptText: p.promptText,
                imageUrl: '',
                freepikTaskId: '',
                status: 'generating',
              })

              void (async () => {
                try {
                  const taskId = await generateImage({ prompt: p.promptText })
                  kf.freepikTaskId = taskId
                  await kf.save()
                  const url = await pollUntilDone(taskId, 'image')
                  const localUrl = await downloadAndSave(url, 'keyframes')
                  kf.imageUrl = localUrl
                  kf.status = 'generated'
                  await kf.save()
                } catch (err) {
                  console.error('[copilot] keyframe gen failed', err)
                  kf.status = 'rejected'
                  await kf.save()
                }
              })()

              return { id: kf._id.toString(), section, position, variantIndex: i, promptText: p.promptText }
            }),
          )

          await Conversation.findByIdAndUpdate(conversationId, { phase: 4, status: 'keyframing' })
          return {
            keyframes: keyframeDocs,
            message: 'Images generating — poll /api/adforge/conversations/:id/keyframes for status',
          }
        },
      }),

      selectKeyframe: tool({
        description: 'Mark a keyframe as selected and others as rejected',
        parameters: z.object({
          keyframeId: z.string(),
          section: z.enum(['hook', 'problem', 'solution', 'social_proof', 'cta']),
          position: z.enum(['start', 'middle', 'end']),
        }),
        execute: async ({ keyframeId, section, position }) => {
          await Keyframe.updateMany(
            { conversationId, section, position, _id: { $ne: keyframeId } },
            { status: 'rejected' },
          )
          await Keyframe.findByIdAndUpdate(keyframeId, { status: 'selected' })

          if (position === 'middle' || position === 'end') {
            const fromPos = position === 'middle' ? 'start' : 'middle'
            const toPos = position
            const existing = await TransitionPrompt.findOne({
              conversationId,
              section,
              fromPosition: fromPos,
              toPosition: toPos,
            })

            if (!existing) {
              const startKf = await Keyframe.findOne({ conversationId, section, position: 'start', status: 'selected' })
              const midKf = await Keyframe.findOne({ conversationId, section, position: 'middle', status: 'selected' })
              const endKf = await Keyframe.findOne({ conversationId, section, position: 'end', status: 'selected' })
              const script = await Script.findOne({ conversationId, section })

              if (startKf && midKf && script) {
                await writeTransitionPrompts({
                  conversationId,
                  section: section as AdSection,
                  startKeyframePrompt: startKf.promptText,
                  middleKeyframePrompt: midKf.promptText,
                  endKeyframePrompt: endKf?.promptText ?? '',
                  scriptSection: script.copyText,
                  adFormat: conv.adFormat,
                })
              }
            }
          }

          return { selected: keyframeId, section, position }
        },
      }),

      assembleStoryboard: tool({
        description: 'Assemble all selected keyframes and transitions into a storyboard',
        parameters: z.object({}),
        execute: async () => {
          const scripts = await Script.find({ conversationId })
          const selectedKfs = await Keyframe.find({ conversationId, status: 'selected' })
          const transitions = await TransitionPrompt.find({ conversationId })

          const sections = await assembleStoryboard({
            conversationId,
            scripts,
            selectedKeyframes: selectedKfs,
            transitionPrompts: transitions,
            durationTargets: conv.durationAllocation,
          })

          await Conversation.findByIdAndUpdate(conversationId, { phase: 5, status: 'storyboarding' })
          return { sections: sections.length, status: 'storyboard assembled' }
        },
      }),

      generateVideos: tool({
        description: 'Generate all video segments from the approved storyboard',
        parameters: z.object({}),
        execute: async () => {
          const freshConv = await Conversation.findById(conversationId)
          if (!freshConv?.storyboard) return { error: 'No storyboard found' }

          await Conversation.findByIdAndUpdate(conversationId, { phase: 6, status: 'generating_video' })

          const jobs: Array<() => Promise<void>> = []

          for (const section of freshConv.storyboard.sections) {
            const transitions = [
              {
                trans: 'start_to_middle' as const,
                kfUrl: section.keyframes.start.imageUrl,
                text: section.transitions.startToMiddle.text,
              },
              {
                trans: 'middle_to_end' as const,
                kfUrl: section.keyframes.middle.imageUrl,
                text: section.transitions.middleToEnd.text,
              },
            ]

            for (const t of transitions) {
              jobs.push(async () => {
                const dur = Math.round((section.endTime - section.startTime) / 2)
                const { segment } = await generateVideoPrompt({
                  conversationId,
                  section: section.section as AdSection,
                  transition: t.trans,
                  transitionText: t.text,
                  sourceKeyframeUrl: t.kfUrl,
                  targetKeyframeUrl: t.kfUrl,
                  durationSeconds: dur,
                  adFormat: freshConv.adFormat,
                })

                try {
                  const taskId = await generateVideo({
                    imageUrl: t.kfUrl,
                    prompt: segment.videoPrompt,
                    model: segment.model,
                    duration: segment.durationSeconds,
                  })
                  await VideoSegment.findByIdAndUpdate(segment._id, {
                    freepikTaskId: taskId,
                    status: 'generating',
                  })
                  const url = await pollUntilDone(taskId, 'video', 120)
                  const localUrl = await downloadAndSave(url, 'videos')
                  await VideoSegment.findByIdAndUpdate(segment._id, {
                    videoUrl: localUrl,
                    status: 'generated',
                  })
                } catch (err) {
                  console.error('[copilot] video gen failed', err)
                }
              })
            }
          }

          await Promise.all(jobs.map((job) => videoQueue.enqueue(job)))
          await Conversation.findByIdAndUpdate(conversationId, { phase: 7, status: 'reviewing' })
          return { segments: jobs.length, status: 'all video segments generated' }
        },
      }),

      getConversationState: tool({
        description: 'Get the current full state of the conversation including all assets',
        parameters: z.object({}),
        execute: async () => {
          const c = await Conversation.findById(conversationId).lean()
          const scripts = await Script.find({ conversationId }).lean()
          const keyframes = await Keyframe.find({ conversationId, status: { $in: ['generated', 'selected'] } }).lean()
          const transitions = await TransitionPrompt.find({ conversationId }).lean()
          const segments = await VideoSegment.find({ conversationId }).lean()
          return {
            conversation: c,
            scripts,
            keyframes: keyframes.length,
            transitions: transitions.length,
            segments: segments.length,
          }
        },
      }),

      advancePhase: tool({
        description: 'Advance to the next phase of the workflow',
        parameters: z.object({
          toPhase: z.number(),
        }),
        execute: async ({ toPhase }) => {
          await Conversation.findByIdAndUpdate(conversationId, { phase: toPhase })
          return { phase: toPhase, name: PHASE_NAMES[toPhase] ?? 'Unknown' }
        },
      }),
    },
  })

  let fullText = ''

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') {
      fullText += part.textDelta
      res.write(`data: ${JSON.stringify({ type: 'text', text: part.textDelta })}\n\n`)
    } else if (part.type === 'tool-result') {
      res.write(
        `data: ${JSON.stringify({ type: 'tool-result', toolName: part.toolName, result: part.result })}\n\n`,
      )
    }
  }

  res.write('data: [DONE]\n\n')
  res.end()

  await Message.create({
    conversationId,
    role: 'assistant',
    content: fullText || '[tool call]',
  })
}
