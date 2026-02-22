import mongoose, { Schema, type Document } from 'mongoose'

export interface IAvatar extends Document {
  name: string
  demographics: {
    age: string
    income: string
    location: string
    jobTitle: string
    gender: string
  }
  psychographics: {
    values: string[]
    fears: string[]
    worldview: string
  }
  painPoints: string[]
  failedSolutions: string[]
  languagePatterns: string[]
  objections: string[]
  triggerEvents: string[]
  aspirations: string[]
  worldview: string
  fullBriefMd: string
  createdAt: Date
  updatedAt: Date
}

const AvatarSchema = new Schema<IAvatar>(
  {
    name: { type: String, required: true },
    demographics: {
      age: { type: String, required: true },
      income: { type: String, default: '' },
      location: { type: String, default: '' },
      jobTitle: { type: String, default: '' },
      gender: { type: String, default: '' },
    },
    psychographics: {
      values: { type: [String], default: [] },
      fears: { type: [String], default: [] },
      worldview: { type: String, default: '' },
    },
    painPoints: { type: [String], default: [] },
    failedSolutions: { type: [String], default: [] },
    languagePatterns: { type: [String], default: [] },
    objections: { type: [String], default: [] },
    triggerEvents: { type: [String], default: [] },
    aspirations: { type: [String], default: [] },
    worldview: { type: String, default: '' },
    fullBriefMd: { type: String, default: '' },
  },
  { timestamps: true },
)

export const Avatar = mongoose.model<IAvatar>('Avatar', AvatarSchema)
