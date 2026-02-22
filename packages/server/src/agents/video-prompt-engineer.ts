import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { VideoSegment } from '../models/video-segment.model.js'
import type { AdSection, AdFormat } from '@slop-factory/shared'

const VideoPromptSchema = z.object({
  motionPrompt: z.string(),
  cameraMovement: z.string(),
  model: z.string(),
  apiParams: z.record(z.unknown()),
})

export async function generateVideoPrompt(input: {
  conversationId: string
  section: AdSection
  transition: 'start_to_middle' | 'middle_to_end'
  transitionText: string
  sourceKeyframeUrl: string
  targetKeyframeUrl: string
  durationSeconds: number
  adFormat: AdFormat
}) {
  const provider = 'sora'
  const model = 'sora-2-pro'

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: VideoPromptSchema,
    prompt: `You are a video AI prompt engineer. Convert a transition description into an API-ready video generation prompt.

SECTION: ${input.section}
TRANSITION: ${input.transition}
TRANSITION DESCRIPTION: ${input.transitionText}
DURATION: ${input.durationSeconds} seconds
FORMAT: ${input.adFormat}
PROVIDER: ${provider} (model: ${model})

Write a tight, specific video generation prompt optimized for ${model}.
Focus on: subject motion, camera movement, pacing, lighting changes.
Keep under 150 words. Be specific about motion direction and speed.

cameraMovement: Just the camera move type (push-in, pull-back, pan-left, etc.)
model: "${model}"
apiParams: Provider-specific params (duration, etc.) as a flat object`,
  })

  const segment = await VideoSegment.create({
    conversationId: input.conversationId,
    section: input.section,
    transition: input.transition,
    videoPrompt: object.motionPrompt,
    sourceKeyframeUrl: input.sourceKeyframeUrl,
    videoUrl: '',
    provider,
    aiModel: object.model,
    generationTaskId: '',
    durationSeconds: input.durationSeconds,
    status: 'queued',
  })

  return { segment, videoPrompt: object }
}
