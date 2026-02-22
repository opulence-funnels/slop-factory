export type AdSection = 'hook' | 'problem' | 'solution' | 'social_proof' | 'cta'
export type AdFormat = 'ugc' | 'story_movie'
export type ConversationStatus =
  | 'setup'
  | 'scripting'
  | 'keyframing'
  | 'storyboarding'
  | 'generating_video'
  | 'reviewing'
  | 'exported'

export interface Offer {
  _id: string
  name: string
  productName: string
  dreamOutcome: string
  perceivedLikelihood: string
  timeDelay: string
  effortSacrifice: string
  summary: string
  keySellingPoints: string[]
}

export interface Avatar {
  _id: string
  name: string
  demographics: { age: string; income: string; location: string; jobTitle: string; gender: string }
  psychographics: { values: string[]; fears: string[]; worldview: string }
  painPoints: string[]
  failedSolutions: string[]
  languagePatterns: string[]
  objections: string[]
  triggerEvents: string[]
  aspirations: string[]
  worldview: string
  fullBriefMd: string
}

export interface Script {
  _id: string
  section: AdSection
  copyText: string
  visualDescription: string
  durationSeconds: number
  status: 'draft' | 'approved'
}

export interface HookOption {
  _id: string
  index: number
  hookText: string
  style: string
  rationale: string
  status: 'pending' | 'selected' | 'rejected'
}

export interface Keyframe {
  _id: string
  section: AdSection
  position: 'start' | 'middle' | 'end'
  variantIndex: number
  promptText: string
  imageUrl: string
  status: 'generating' | 'generated' | 'selected' | 'rejected'
}

export interface TransitionPromptDoc {
  _id: string
  section: AdSection
  fromPosition: 'start' | 'middle'
  toPosition: 'middle' | 'end'
  promptText: string
  userEdited: boolean
  userEditedText: string | null
}

export interface VideoSegment {
  _id: string
  section: AdSection
  transition: 'start_to_middle' | 'middle_to_end'
  videoUrl: string
  durationSeconds: number
  status: 'queued' | 'generating' | 'generated' | 'approved' | 'rejected'
}

export interface Conversation {
  _id: string
  offerId: string
  avatarId: string
  adFormat: AdFormat
  status: ConversationStatus
  phase: number
  durationAllocation: Record<AdSection, number>
  consistencySpec: null | {
    avatarSpec: {
      age?: string
      gender?: string
      hairColor?: string
      hairStyle?: string
      skinTone?: string
      clothing?: string
      distinguishingFeatures?: string
      fullDescription: string
    }
    environmentSpec: {
      location?: string
      timeOfDay?: string
      lighting?: string
      keyProps?: string[]
      colorScheme?: string[]
      fullDescription: string
    }
    visualStyle: string
    colorPalette?: string[]
    status: 'draft' | 'locked'
  }
  storyboard: null | {
    sections: Array<{
      section: AdSection
      startTime: number
      endTime: number
      keyframes: {
        start: { imageUrl: string }
        middle: { imageUrl: string }
        end: { imageUrl: string }
      }
      transitions: {
        startToMiddle: { text: string }
        middleToEnd: { text: string }
      }
      dialogue: string
    }>
    totalDuration: number
    status: 'draft' | 'approved'
  }
}

export type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface CanvasState {
  offer: Offer | null
  avatar: Avatar | null
  hookOptions: HookOption[]
  scripts: Script[]
  keyframes: Keyframe[]
  transitions: TransitionPromptDoc[]
  segments: VideoSegment[]
  conversation: Conversation | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}
