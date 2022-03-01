const Websockets = require('./adminwebsockets.js')

const express = require('express')
const router = express.Router()

const Contacts = require('./agentLogic/contacts.js')
const Credentials = require('./agentLogic/credentials.js')
const Demographics = require('./agentLogic/demographics.js')
const Passports = require('./agentLogic/passports.js')
const BasicMessages = require('./agentLogic/basicMessages.js')
const Presentations = require('./agentLogic/presentations.js')

router.post('/topic/connections', async (req, res, next) => {
  console.log('Aries Cloud Agent Webhook Message----Connection------')

  console.log('Connection Details:')
  const connectionMessage = req.body
  console.log(connectionMessage)

  res.status(200).send('Ok')

  Contacts.adminMessage(connectionMessage)
})

router.post('/topic/issue_credential', async (req, res, next) => {
  console.log('Aries Cloud Agent Webhook Message----Credential Issuance------')

  console.log('Issuance Details:')
  const issuanceMessage = req.body
  console.log(issuanceMessage)

  res.status(200).send('Ok')

  Credentials.adminMessage(issuanceMessage)
})

router.post('/topic/present_proof', async (req, res, next) => {
  console.log('Aries Cloud Agent Webhook Message----Presentations------')

  console.log('Presentation Details:')
  const presMessage = req.body
  console.log(presMessage)

  // (AmmonBurgi) Store the presentation on the opening state. Update the presentation on the other states.
  if (presMessage.state === 'request_sent') {
    await Presentations.createPresentationReports(presMessage)
  } else {
    await Presentations.updatePresentationReports(presMessage)
  }

  res.status(200).send('Ok')
  Presentations.adminMessage(presMessage)
})

router.post('/topic/basicmessages', async (req, res, next) => {
  console.log('Aries Cloud Agent Webhook Message----Basic Message------')

  console.log('Message Details:')
  const basicMessage = req.body
  console.log(basicMessage)

  res.status(200).send('Ok')

  BasicMessages.adminMessage(basicMessage)
})

router.post('/topic/data-transfer', async (req, res, next) => {
  console.log('Aries Cloud Agent Webhook Message----Data Transfer------')

  console.warn('No Goal Code Found')

  res.status(200).send('Ok')
})

router.post('/topic/data-transfer/:goalCode', async (req, res, next) => {
  console.log(
    'Aries Cloud Agent Webhook Message----Data Transfer goalCode------',
  )

  console.log('Message Details:', req.params.goalCode)
  // Uncomment to use a goalCode
  if (req.params.goalCode === 'transfer.demographicdata') {
    let data = req.body.data[0].data.json

    Demographics.updateOrCreateDemographic(
      data.contact_id,
      data.email,
      data.phone,
      data.address,
    )
    console.log(req.body.data[0].data.json)

    // Comment in while testing so you don't have to refresh the page, please comment back out. We don't want the mobile app to reload the lab side in real time in case they are doing something =
    // window.reload()
  } else if (req.params.goalCode === 'transfer.passportdata') {
    let data = req.body.data[0].data.json

    Passports.updateOrCreatePassport(
      data.contact_id,
      data.passport_number,
      data.surname,
      data.given_names,
      data.sex,
      data.date_of_birth,
      data.place_of_birth,
      data.nationality,
      data.date_of_issue,
      data.date_of_expiration,
      data.type,
      data.code,
      data.authority,
      data.photo,
    )
    console.log(req.body.data[0].data.json)

    // Comment in while testing so you don't have to refresh the page, please comment back out. We don't want the mobile app to reload the lab side in real time in case they are doing something =
    // window.reload()
  } else {
  }
  // console.log(req.body)

  res.status(200).send('Ok')
})

module.exports = router
