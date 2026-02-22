import mongoose, { Schema, type Document } from 'mongoose'
import type { AdSection } from '@slop-factory/shared'

const AD_SECTIONS = ['hook', 'problem', 'solution', 'social_proof', 'cta'] as const

export interface IScript extends Document {
  conversationId: mongoose.Types.ObjectId
  section: AdSection
  copyText: string
  visualDescription: string
  durationSeconds: number
  status: 'draft' | 'approved'
  variantIndex: number
  createdAt: Date
}

const ScriptSchema = new Schema<IScript>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    section: { type: String, enum: AD_SECTIONS, required: true },
    copyText: { type: String, required: true },
    visualDescription: { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'approved'], default: 'draft' },
    variantIndex: { type: Number, default: 0 },
  },
  { timestamps: true },
)

ScriptSchema.index({ conversationId: 1, section: 1 })

export const Script = mongoose.model<IScript>('Script', ScriptSchema)
