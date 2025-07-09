const mongoose = require('mongoose')
const argon2 = require('argon2')

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email:{
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    password:{
        type: String,
        required: true,
    }
}, {timestamps: true})


userSchema.pre('save', async function (next) {
    if(this.isModified('password')){
        try {
            this.password = await argon2.hash(this.password)
        } catch (error) {
            next(error)
        }
    }
})

userSchema.methods.comparedPassword = async function (candidatePassword) {
    try {
        return await argon2.verify(this.password, candidatePassword)
    } catch (error) {
        throw error
    }
}

userSchema.index({username: 'text'})

module.exports = mongoose.model('User', userSchema)