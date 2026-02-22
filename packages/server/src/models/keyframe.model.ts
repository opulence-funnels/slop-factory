import mongoose, { Schema, type Document } from 'mongoose'
import type { AdSection } from '@slop-factory/shared'

const AD_SECTIONS = ['hook', 'problem', 'solution', 'social_proof', 'cta'] as const

export interface IKeyframe extends Document {
  conversationId: mongoose.Types.ObjectId
  section: AdSection
  position: 'start' | 'middle' | 'end'
  variantIndex: number
  promptText: string
  imageUrl: string
  generationTaskId: string
  status: 'generating' | 'generated' | 'selected' | 'rejected'
  createdAt: Date
}

const KeyframeSchema = new Schema<IKeyframe>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    section: { type: String, enum: AD_SECTIONS, required: true },
    position: { type: String, enum: ['start', 'middle', 'end'], required: true },
    variantIndex: { type: Number, required: true },
    promptText: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    generationTaskId: { type: String, default: '' },
    status: { type: String, enum: ['generating', 'generated', 'selected', 'rejected'], default: 'generating' },
  },
  { timestamps: true },
)

KeyframeSchema.index({ conversationId: 1, section: 1, position: 1 })
KeyframeSchema.index({ generationTaskId: 1 })

export const Keyframe = mongoose.model<IKeyframe>('Keyframe', KeyframeSchema)
