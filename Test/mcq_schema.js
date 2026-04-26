const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const mcqSchema = new mongoose.Schema({
    mcq_id: { type: String, default: uuidv4, unique: true },
    mcq_question: { type: String, required: true },
    mcq_options: [{ type: String, required: true }],
    mcq_answer: [{ type: String, required: true }], // Array to support both single & multi-choice
    mcq_type: { type: String, enum: ['single', 'multi'], default: 'single' }, // Question type
    mcq_tag: [{ type: String }]
});

const MCQ = mongoose.model('MCQ', mcqSchema);
module.exports = MCQ;