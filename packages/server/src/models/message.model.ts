import mongoose, { Schema, type Document } from 'mongoose'

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls: Record<string, unknown>[] | null
  createdAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, required: true },
    toolCalls: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
)

MessageSchema.index({ conversationId: 1, createdAt: 1 })

export const Message = mongoose.model<IMessage>('Message', MessageSchema)
