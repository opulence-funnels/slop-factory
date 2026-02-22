import mongoose, { Schema, type Document } from 'mongoose'
import type { AdSection, AdFormat, ConversationStatus } from '@slop-factory/shared'

export interface IConsistencySpec {
  avatarSpec: {
    age: string
    gender: string
    hairColor: string
    hairStyle: string
    skinTone: string
    clothing: string
    distinguishingFeatures: string
    fullDescription: string
  }
  environmentSpec: {
    location: string
    timeOfDay: string
    lighting: string
    keyProps: string[]
    colorScheme: string[]
    fullDescription: string
  }
  visualStyle: string
  colorPalette: string[]
  status: 'draft' | 'locked'
}

export interface IStoryboardSection {
  section: AdSection
  startTime: number
  endTime: number
  keyframes: {
    start: { keyframeId: string; imageUrl: string }
    middle: { keyframeId: string; imageUrl: string }
    end: { keyframeId: string; imageUrl: string }
  }
  transitions: {
    startToMiddle: { promptId: string; text: string }
    middleToEnd: { promptId: string; text: string }
  }
  dialogue: string
  textOverlay: string | null
}

export interface IConversation extends Document {
  offerId: mongoose.Types.ObjectId
  avatarId: mongoose.Types.ObjectId
  adFormat: AdFormat
  status: ConversationStatus
  phase: number
  durationAllocation: {
    hook: number
    problem: number
    solution: number
    social_proof: number
    cta: number
  }
  consistencySpec: IConsistencySpec | null
  storyboard: {
    sections: IStoryboardSection[]
    totalDuration: number
    status: 'draft' | 'approved'
  } | null
  createdAt: Date
  updatedAt: Date
}

const AD_SECTIONS = ['hook', 'problem', 'solution', 'social_proof', 'cta'] as const

const ConsistencySpecSchema = new Schema(
  {
    avatarSpec: {
      age: String,
      gender: String,
      hairColor: String,
      hairStyle: String,
      skinTone: String,
      clothing: String,
      distinguishingFeatures: String,
      fullDescription: String,
    },
    environmentSpec: {
      location: String,
      timeOfDay: String,
      lighting: String,
      keyProps: [String],
      colorScheme: [String],
      fullDescription: String,
    },
    visualStyle: String,
    colorPalette: [String],
    status: { type: String, enum: ['draft', 'locked'], default: 'draft' },
  },
  { _id: false },
)

const StoryboardSectionSchema = new Schema(
  {
    section: { type: String, enum: AD_SECTIONS, required: true },
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },
    keyframes: {
      start: { keyframeId: String, imageUrl: String },
      middle: { keyframeId: String, imageUrl: String },
      end: { keyframeId: String, imageUrl: String },
    },
    transitions: {
      startToMiddle: { promptId: String, text: String },
      middleToEnd: { promptId: String, text: String },
    },
    dialogue: { type: String, default: '' },
    textOverlay: { type: String, default: null },
  },
  { _id: false },
)

const ConversationSchema = new Schema<IConversation>(
  {
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
    avatarId: { type: Schema.Types.ObjectId, ref: 'Avatar', required: true },
    adFormat: { type: String, enum: ['ugc', 'story_movie'], required: true },
    status: {
      type: String,
      enum: ['setup', 'scripting', 'keyframing', 'storyboarding', 'generating_video', 'reviewing', 'exported'],
      default: 'setup',
    },
    phase: { type: Number, default: 0 },
    durationAllocation: {
      hook: { type: Number, default: 5 },
      problem: { type: Number, default: 13 },
      solution: { type: Number, default: 14 },
      social_proof: { type: Number, default: 14 },
      cta: { type: Number, default: 14 },
    },
    consistencySpec: { type: ConsistencySpecSchema, default: null },
    storyboard: {
      sections: { type: [StoryboardSectionSchema], default: [] },
      totalDuration: { type: Number, default: 60 },
      status: { type: String, enum: ['draft', 'approved'], default: 'draft' },
    },
  },
  { timestamps: true },
)

ConversationSchema.index({ createdAt: -1 })

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema)
