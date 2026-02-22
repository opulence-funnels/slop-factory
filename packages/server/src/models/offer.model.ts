import mongoose, { Schema, type Document } from 'mongoose'

export interface IOffer extends Document {
  name: string
  productName: string
  dreamOutcome: string
  perceivedLikelihood: string
  timeDelay: string
  effortSacrifice: string
  summary: string
  keySellingPoints: string[]
  createdAt: Date
  updatedAt: Date
}

const OfferSchema = new Schema<IOffer>(
  {
    name: { type: String, required: true },
    productName: { type: String, required: true },
    dreamOutcome: { type: String, required: true },
    perceivedLikelihood: { type: String, required: true },
    timeDelay: { type: String, required: true },
    effortSacrifice: { type: String, required: true },
    summary: { type: String, default: '' },
    keySellingPoints: { type: [String], default: [] },
  },
  { timestamps: true },
)

export const Offer = mongoose.model<IOffer>('Offer', OfferSchema)
