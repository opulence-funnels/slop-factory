import mongoose, { Schema, type Document } from 'mongoose'
import type { AdSection } from '@slop-factory/shared'

const AD_SECTIONS = ['hook', 'problem', 'solution', 'social_proof', 'cta'] as const

export interface IVideoSegment extends Document {
  conversationId: mongoose.Types.ObjectId
  section: AdSection
  transition: 'start_to_middle' | 'middle_to_end'
  videoPrompt: string
  sourceKeyframeUrl: string
  videoUrl: string
  provider: 'freepik' | 'sora'
  aiModel: string
  freepikTaskId: string
  durationSeconds: number
  status: 'queued' | 'generating' | 'generated' | 'approved' | 'rejected'
  createdAt: Date
}

const VideoSegmentSchema = new Schema<IVideoSegment>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    section: { type: String, enum: AD_SECTIONS, required: true },
    transition: { type: String, enum: ['start_to_middle', 'middle_to_end'], required: true },
    videoPrompt: { type: String, required: true },
    sourceKeyframeUrl: { type: String, required: true },
    videoUrl: { type: String, default: '' },
    provider: { type: String, enum: ['freepik', 'sora'], default: 'freepik' },
    aiModel: { type: String, default: 'kling-v2' },
    freepikTaskId: { type: String, default: '' },
    durationSeconds: { type: Number, required: true },
    status: { type: String, enum: ['queued', 'generating', 'generated', 'approved', 'rejected'], default: 'queued' },
  },
  { timestamps: true },
)

VideoSegmentSchema.index({ conversationId: 1, section: 1 })
VideoSegmentSchema.index({ freepikTaskId: 1 })

export const VideoSegment = mongoose.model<IVideoSegment>('VideoSegment', VideoSegmentSchema)
