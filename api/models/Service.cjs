const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Service title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            required: [true, 'Service description is required'],
            trim: true,
            maxlength: [3000, 'Description cannot exceed 3000 characters'],
        },
        icon: {
            type: String,
            trim: true,
            default: 'Leaf',
            enum: ['BarChart4', 'GraduationCap', 'Leaf', 'Building', 'Users', 'PenTool', 'FileCheck'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

serviceSchema.index({ isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);
