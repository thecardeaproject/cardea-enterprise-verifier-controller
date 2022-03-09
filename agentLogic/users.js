const bcrypt = require('bcryptjs')
require('dotenv').config()
// const AdminAPI = require('../adminAPI')

const ControllerError = require('../errors.js')

const jwt = require('jsonwebtoken')
const NodeMailer = require('../nodeMailer')
const SMTP = require('./settings')
const Util = require('../util')

const Websockets = require('../adminwebsockets.js')
let Users = require('../orm/users')

// Perform Agent Business Logic

// Verify SMTP connection and return an error message witht the prompt to set up SMTP server.
async function smtpCheck() {
  // Accessing transporter
  const transporter = await NodeMailer.emailService()

  // Verifying SMTP configs
  return new Promise((resolve, reject) => {
    transporter.verify(function (error, success) {
      if (error) {
        console.log(error)
        reject(false)
      } else {
        console.log('Server is ready to take our messages')
        resolve(success)
      }
    })
  })
}

const getUser = async (userID) => {
  try {
    const user = await Users.readUser(userID)
    console.log('User:', user)
    return user
  } catch (error) {
    console.error('Error Fetching User')
    throw error
  }
}

const getUserByToken = async (userToken) => {
  try {
    const user = await Users.readUserByToken(userToken)
    console.log('User:', user)
    return user
  } catch (error) {
    console.error('Error Fetching User by Token')
    throw error
  }
}

const getUserByEmail = async (userEmail) => {
  try {
    const user = await Users.readUserByEmail(userEmail)
    console.log('User:', user)
    return user
  } catch (error) {
    console.error('Error Fetching User by Email')
    throw error
  }
}

const getUserByUsername = async (username) => {
  try {
    const user = await Users.readUserByUsername(username)
    console.log('User:', user)
    return user
  } catch (error) {
    console.error('Error Fetching User by Email')
    throw error
  }
}

const getAll = async () => {
  try {
    const users = await Users.readUsers()
    console.log('Users API:', users)
    console.log(users.length)

    // Trim password and JWT
    for (let i = 0; i < users.length; i++) {
      delete users[i].dataValues.password
      delete users[i].dataValues.token
    }

    return users
  } catch (error) {
    console.error('Error Fetching Users')
    throw error
  }
}

const createUser = async function (email, roles) {
  // Resolving SMTP check promise
  try {
    await smtpCheck()
  } catch (error) {
    console.error(
      "USER ERROR: can't verify SMTP configurations. Error code: ",
      error,
    )
    return {
      error:
        "USER ERROR: The confirmation email can't be sent. Please, check your SMTP configurations.",
    }
  }

  // Empty/data checks
  if (!email || !Array.isArray(roles) || !roles.length)
    return {error: 'USER ERROR: All fields must be filled out.'}

  if (!Util.validateEmail(email))
    return {error: 'USER ERROR: Must be a valid email.'}

  try {
    // Checking for duplicate email
    const duplicateUser = await Users.readUserByEmail(email)
    if (duplicateUser)
      return {error: 'USER ERROR: the user with this email already exist.'}

    const user = await Users.createUser(email)

    for (let i = 0; i < roles.length; i++) {
      await Users.linkRoleAndUser(roles[i], user.user_id)
    }

    const token = jwt.sign({id: user.user_id}, process.env.JWT_SECRET, {
      expiresIn: '24h',
    })
    const link = process.env.WEB_ROOT + `/account-setup/#${token}`

    const userID = user.user_id
    const username = ''
    const password = ''

    const newUser = await Users.updateUserInfo(
      userID,
      username,
      email,
      password,
      token,
    )

    // Get email from SMTP config
    const currentSMTP = await SMTP.getSMTP()

    // Send new account email
    await NodeMailer.sendMail({
      from: currentSMTP.dataValues.value.auth.email,
      to: user.email,
      subject: 'Aries enterprise app account registration',
      html: `<p>Hello dear user,<br> we have created an account for you.<br><br> Please follow this <a href="${link}">link</a> to finish registration. Your link will expire in 24 hours.<br><br> Best wishes,<br> Aries Enterprise SPA</p>`,
    })

    // Broadcast the message to all connections
    Websockets.sendMessageToAll('USERS', 'USER_CREATED', {user: [newUser]})

    // Return true to trigger the success message
    return true
  } catch (error) {
    console.error('Error Fetching User')
    throw error
  }
}

const updateUser = async function (
  userID,
  username,
  email,
  password,
  token,
  roles,
  flag,
) {
  try {
    // Checks for updating the user by admin
    if (!email) {
      console.log('ERROR: email is empty.')
      return {error: 'USER ERROR: All fields must be filled out.'}
    }

    if (roles) {
      if (!Array.isArray(roles) || !roles.length) {
        console.log('ERROR: All fields must be filled out.')
        return {error: 'USER ERROR: Roles are empty.'}
      }
    }

    if (!Util.validateEmail(email)) {
      console.log('ERROR: Must be a valid email.')
      return {error: 'USER ERROR: Must be a valid email.'}
    }

    if (username)
      if (!Util.validateAlphaNumeric(username)) {
        console.log(
          'Username must be at least 3 character long and consist of alphanumeric values.',
        )
        return {
          error:
            'Username must be at least 3 character long and consist of alphanumeric values.',
        }
      }

    // Checking for duplicate email
    const duplicateEmail = await Users.readUserByEmail(email)
    if (duplicateEmail && duplicateEmail.user_id !== userID) {
      return {error: 'USER ERROR: the user with this email already exist.'}
    }

    // Checking for duplicate username
    const duplicateUsername = await Users.readUserByUsername(username)
    if (
      duplicateUsername &&
      username !== '' &&
      duplicateUsername.user_id !== userID
    ) {
      return {error: 'USER ERROR: the user with this username already exist.'}
    }

    const userToUpdate = await Users.readUser(userID)

    // Update user on user account setup
    if (password && userToUpdate.password !== password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      const emptyToken = ''
      await Users.updateUserInfo(
        userID,
        username,
        email,
        hashedPassword,
        emptyToken,
      )
    } else {
      // Update user on user password forgot password/admin user edit

      // Check if updating the user by adding the token from forgot-password component
      console.log(token)
      if (flag === 'password reset') {
        // Resolving SMTP check promise
        try {
          await smtpCheck()
        } catch (error) {
          console.error(
            "USER ERROR: can't verify SMTP configurations. Error code: ",
            error,
          )
          return {
            error:
              "USER ERROR: The password reset email can't be sent. Talk to your administrator.",
          }
        }

        const newToken = jwt.sign({id: userID}, process.env.JWT_SECRET, {
          expiresIn: '10m',
        })
        const link = process.env.WEB_ROOT + `/password-reset/#${newToken}`

        await Users.updateUserInfo(userID, username, email, password, newToken)

        // Get email from SMTP config
        const currentSMTP = await SMTP.getSMTP()

        // Send password reset email
        await NodeMailer.sendMail({
          from: currentSMTP.dataValues.value.auth.email,
          to: email,
          subject: 'Aries password reset request',
          html: `<p>Hello dear user,<br> You have requested the password change for your account. Please, follow this <a href="${link}">link</a> to reset your password. Your link will expire in 10 minutes.<br><br> Best wishes,<br> Aries Enterprise SPA</p>`,
        })
      } else {
        // User update by admin
        await Users.updateUserInfo(userID, username, email, password, token)
      }
    }

    if (roles) {
      // If roles need to get updated (user edit by admin) clear old roles-user connections
      await Users.deleteRolesUserConnection(userID)

      // Loop through roles and create connections with the user
      for (let i = 0; i < roles.length; i++) {
        await Users.linkRoleAndUser(roles[i], userID)
      }
    }

    const updatedUser = await Users.readUser(userID)

    // Broadcast the message to all connections
    Websockets.sendMessageToAll('USERS', 'USER_UPDATED', {updatedUser})

    console.log('Updated user:', updatedUser)

    // Return true to trigger a success message
    return true
  } catch (error) {
    console.error('Error Fetching User update')
    throw error
  }
}

const updatePassword = async function (id, password) {
  try {
    const userToUpdate = await Users.readUser(id)

    if (userToUpdate.password !== password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      await Users.updateUserPassword(id, hashedPassword)
    } else {
      await Users.updateUserPassword(id, password)
    }
    const user = await Users.readUser(id)
    return user
  } catch (error) {
    console.error('Error Fetching Password update')
    throw error
  }
}

const deleteUser = async function (userID) {
  try {
    const deletedUser = await Users.deleteUser(userID)

    // Broadcast the message to all connections
    Websockets.sendMessageToAll('USERS', 'USER_DELETED', deletedUser)

    // Return true to trigger a success message
    return true
  } catch (error) {
    console.error('Error Fetching User')
    throw error
  }
}

const resendAccountConfirmation = async function (email) {
  // Resolving SMTP check promise
  try {
    await smtpCheck()
  } catch (error) {
    console.error(
      "USER ERROR: can't verify SMTP configurations. Error code: ",
      error,
    )
    return {
      error:
        "USER ERROR: The confirmation email can't be sent. Please, check your SMTP configurations.",
    }
  }

  try {
    const user = await Users.readUserByEmail(email)

    const token = jwt.sign({id: user.user_id}, process.env.JWT_SECRET, {
      expiresIn: '24h',
    })
    const link = process.env.WEB_ROOT + `/account-setup/#${token}`

    const userID = user.user_id
    const username = ''
    const password = ''

    const updatedUser = await Users.updateUserInfo(
      userID,
      username,
      email,
      password,
      token,
    )

    if (!updatedUser)
      return {
        error:
          "USER ERROR: The confirmation email can't be re-sent. Try again later.",
      }

    // Get email from SMTP config
    const currentSMTP = await SMTP.getSMTP()

    // Send new account email
    await NodeMailer.sendMail({
      from: currentSMTP.dataValues.value.auth.email,
      to: user.email,
      subject: 'Aries enterprise app account registration',
      html: `<p>Hello dear user,<br> we have created an account for you.<br><br> Please follow this <a href="${link}">link</a> to finish registration. Your link will expire in 24 hours.<br><br> Best wishes,<br> Aries Enterprise SPA</p>`,
    })

    // Return true to trigger the success message
    return true
  } catch (error) {
    console.error('Error Fetching User')
    throw error
  }
}

module.exports = {
  createUser,
  getUser,
  getUserByToken,
  getUserByEmail,
  getUserByUsername,
  getAll,
  updateUser,
  updatePassword,
  deleteUser,
  resendAccountConfirmation,
}
