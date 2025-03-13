// models/goalModel.ts
import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
    progress: { type: Number, default: 0 },
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    subGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
    weight: { type: Number, default: 1 }, // Gewichtung für Fortschrittsberechnung
    priority: { type: Number, enum: [1, 2, 3, 4, 5], default: 3 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  
  export const Goal = mongoose.model('Goal', GoalSchema);
  