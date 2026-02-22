import mongoose, { Schema, type Document } from 'mongoose'
import type { AdSection } from '@slop-factory/shared'

const AD_SECTIONS = ['hook', 'problem', 'solution', 'social_proof', 'cta'] as const

export interface ITransitionPrompt extends Document {
  conversationId: mongoose.Types.ObjectId
  section: AdSection
  fromPosition: 'start' | 'middle'
  toPosition: 'middle' | 'end'
  promptText: string
  userEdited: boolean
  userEditedText: string | null
  createdAt: Date
}

const TransitionPromptSchema = new Schema<ITransitionPrompt>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    section: { type: String, enum: AD_SECTIONS, required: true },
    fromPosition: { type: String, enum: ['start', 'middle'], required: true },
    toPosition: { type: String, enum: ['middle', 'end'], required: true },
    promptText: { type: String, required: true },
    userEdited: { type: Boolean, default: false },
    userEditedText: { type: String, default: null },
  },
  { timestamps: true },
)

TransitionPromptSchema.index({ conversationId: 1, section: 1 })

export const TransitionPrompt = mongoose.model<ITransitionPrompt>('TransitionPrompt', TransitionPromptSchema)
