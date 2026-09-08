const mongoose = require('mongoose');

const STATUSES = ['pending', 'in-progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: STATUSES, default: 'pending' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    dueDate: { type: Date, default: null },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    completedAt: { type: Date, default: null },
    comments: [commentSchema],
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });

module.exports = mongoose.model('Task', taskSchema);
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
