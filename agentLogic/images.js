const bcrypt = require('bcryptjs')
require('dotenv').config()

const ControllerError = require('../errors.js')

const AdminAPI = require('../adminAPI')
const jwt = require('jsonwebtoken')
const NodeMailer = require('../nodeMailer')
const util = require('../util')

let Images = require('../orm/images')

// Perform Agent Business Logic

const getAll = async () => {
  try {
    const images = await Images.readImages()
    console.log('Images:', images)
    return images
  } catch (error) {
    console.error('Error Fetching Images')
    throw error
  }
}

const getImagesByType = async (type) => {
  try {
    const images = await Images.readImagesByType(type)
    console.log('Images:', images)
    return images
  } catch (error) {
    console.error('Error Fetching Images by Type')
    throw error
  }
}

// Update the logo image
const setImage = async (name, type, image) => {
  // Checking image size.
  const buffer = Buffer.from(image.substring(image.indexOf(',') + 1))
  if (buffer.length > 1000000) {
    console.log('Image buffer byte length: ' + buffer.length)
    return {error: 'ERROR: the image is over 1Mb.'}
  }

  // Checking image MIME.
  if (
    !image.includes('data:image/png;base64,') &&
    !image.includes('data:image/jpeg;base64,') &&
    !image.includes('data:image/gif;base64,') &&
    !image.includes('data:image/webp;base64,')
  ) {
    console.log('This is not an image.')
    return {error: 'ERROR: must be a valid image.'}
  }

  try {
    await Images.updateImage(name, type, image)
    const updatedImage = await Images.readImagesByType('logo')
    return updatedImage
  } catch (error) {
    console.error('Error updating logo')
    throw error
  }
}

module.exports = {
  getAll,
  setImage,
  getImagesByType,
}
