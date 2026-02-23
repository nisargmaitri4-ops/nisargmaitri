const mongoose = require('mongoose');

const workSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Work title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
            default: '',
        },
        details: {
            type: String,
            trim: true,
            maxlength: [5000, 'Details cannot exceed 5000 characters'],
            default: '',
        },
        results: {
            type: String,
            trim: true,
            maxlength: [2000, 'Results cannot exceed 2000 characters'],
            default: '',
        },
        image: {
            type: String,
            trim: true,
            default: '',
        },
        gallery: {
            type: [String],
            default: [],
        },
        tags: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

workSchema.index({ isActive: 1 });

module.exports = mongoose.model('Work', workSchema);
