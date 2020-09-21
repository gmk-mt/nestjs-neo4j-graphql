const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

const SECRET = 'secret'
const SALT_ROUNDS = 10
const TOKEN_VALIDITY_TIME = 1 * 60 * 60 * 24

export const encryptPassword = async (password) => {
    const encrypted = await bcrypt.hash(password, SALT_ROUNDS)
    return encrypted
}

export const createUserToken = user => {
    return jwt.sign({ id: user.id, roles: [user.role] }, SECRET, { expiresIn: TOKEN_VALIDITY_TIME })
}

export const comparePassword = async (plain, hash) => {
    return await bcrypt.compare(plain, hash)
}

export const getTokenPayload = (token) => {
    return jwt.verify(token, SECRET)
}