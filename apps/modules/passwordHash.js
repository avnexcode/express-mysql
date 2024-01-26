const bcrypt = require('bcrypt')

const passwordHash = async (password) => {
    try {
        return await bcrypt.hash(password, 10)
    } catch (err) {
        throw err
    }
}

module.exports = passwordHash
