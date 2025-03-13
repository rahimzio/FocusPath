import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['incomplete', 'in-progress', 'completed'], default: 'incomplete' },
  dueDate: { type: Date },
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null }, // Kann null sein, wenn keine Verknüpfung
  repeatInterval: { type: Number, default: null }, // Benutzerdefinierte Anzahl von Tagen
  priority: { type: Number, enum: [1, 2, 3, 4, 5], default: 3 },
  weight: { type: Number, default: 1 }, // Gewichtung für Fortschritt
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Task = mongoose.model('Task', TaskSchema);