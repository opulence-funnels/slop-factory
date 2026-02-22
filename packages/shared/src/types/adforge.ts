export const AD_SECTIONS = ['hook', 'problem', 'solution', 'social_proof', 'cta'] as const
export type AdSection = typeof AD_SECTIONS[number]
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
  createdAt: string
  updatedAt: string
}

export interface Avatar {
  _id: string
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
  createdAt: string
  updatedAt: string
}

export interface ConsistencySpec {
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

export interface StoryboardSection {
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

export interface Conversation {
  _id: string
  offerId: string
  avatarId: string
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
  consistencySpec: ConsistencySpec | null
  storyboard: {
    sections: StoryboardSection[]
    totalDuration: number
    status: 'draft' | 'approved'
  } | null
  createdAt: string
  updatedAt: string
}

export interface AdScript {
  _id: string
  conversationId: string
  section: AdSection
  copyText: string
  visualDescription: string
  durationSeconds: number
  status: 'draft' | 'approved'
  variantIndex: number
  createdAt: string
}

export interface Keyframe {
  _id: string
  conversationId: string
  section: AdSection
  position: 'start' | 'middle' | 'end'
  variantIndex: number
  promptText: string
  imageUrl: string
  freepikTaskId: string
  status: 'generating' | 'generated' | 'selected' | 'rejected'
  createdAt: string
}

export interface TransitionPrompt {
  _id: string
  conversationId: string
  section: AdSection
  fromPosition: 'start' | 'middle'
  toPosition: 'middle' | 'end'
  promptText: string
  userEdited: boolean
  userEditedText: string | null
  createdAt: string
}

export interface VideoSegment {
  _id: string
  conversationId: string
  section: AdSection
  transition: 'start_to_middle' | 'middle_to_end'
  videoPrompt: string
  sourceKeyframeUrl: string
  videoUrl: string
  provider: 'freepik' | 'sora'
  model: string
  freepikTaskId: string
  durationSeconds: number
  status: 'queued' | 'generating' | 'generated' | 'approved' | 'rejected'
  createdAt: string
}
