const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Media', mediaSchema)