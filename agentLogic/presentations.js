const {DateTime} = require('luxon')

const ControllerError = require('../errors.js')

const Governance = require('./governance')

const AdminAPI = require('../adminAPI')
const Websockets = require('../adminwebsockets.js')
const AnonWebsockets = require('../anonwebsockets.js')

const Presentations = require('../orm/presentations')

const requestPresentation = async (connectionID) => {
  console.log(`Requesting Presentation from Connection: ${connectionID}`)

  AdminAPI.Presentations.requestPresentation(
    connectionID,
    // ["trusted_traveler_expiration_date_time", "trusted_traveler_id"],
    ['trusted_traveler_id'],
    process.env.SCHEMA_TRUSTED_TRAVELER,
    'Requesting Presentation',
    false,
  )
}

const adminMessage = async (message) => {
  console.log('Received Presentations Message', message)

  if (message.state === 'verified') {
    let endorserDID = null
    let schemaID = null
    const protocol = 'https://didcomm.org/issue-credential/1.0/'

    // Get cred def id and schema id
    if (message.presentation && message.presentation.identifiers.length) {
      endorserDID = message.presentation.identifiers[0].cred_def_id
        .split(':', 1)
        .toString()
      schemaID = message.presentation.identifiers[0].schema_id
    }
    const participantValidated = await Governance.validateParticipant(
      schemaID,
      protocol,
      endorserDID,
    )

    // Check if trusted traveler endorser is validated by governance
    if (participantValidated) {
      if (message.presentation.requested_proof.revealed_attr_groups) {
        values =
          message.presentation.requested_proof.revealed_attr_groups[
            Object.keys(
              message.presentation.requested_proof.revealed_attr_groups,
            )[0] // Get first group available
          ].values // TODO: this needs to be a for-in loop or similar later
      } else {
        values = message.presentation.requested_proof.revealed_attrs
      }
      const trustedID =
        message.presentation.requested_proof.revealed_attrs.trusted_traveler_id
          .raw
      const hiddenID = '******' + trustedID.slice(trustedID.length - 4)
      message.presentation.requested_proof.revealed_attrs.trusted_traveler_id.raw = hiddenID
      // if(values.trusted_traveler_expiration_date_time.raw > DateTime.local()){
      AnonWebsockets.sendMessageToConnectionId(
        message.connection_id,
        'PRESENTATIONS',
        'TRUSTED_TRAVELER_VERIFIED',
        {
          connection_id: message.connection_id,
          revealed_attrs: message.presentation.requested_proof.revealed_attrs,
        },
      )
      // } else {
      //   console.log('Presentation rejected: Trusted Traveler Expired!')
      //   await AdminAPI.Connections.sendBasicMessage(message.connection_id, {
      //     content: 'INVALID_PROOF',
      //   })
      // }
      // Credential endorser is not validated by governance
    } else {
      // (eldersonar) Send a basic message
      console.log("I'm here")
      await AdminAPI.Connections.sendBasicMessage(message.connection_id, {
        content:
          "We're sorry, but we don't currently recognize the issuer of your credential and cannot approve it at this time.",
      })
    }
  } else if (message.state === null) {
    // (mikekebert) Send a basic message saying the verification failed for technical reasons
    console.log('Validation failed for technical reasons')
    await AdminAPI.Connections.sendBasicMessage(message.connection_id, {
      content: 'UNVERIFIED',
    })
  } else {
  }
}

const createPresentationReports = async (presentation) => {
  try {
    const presentationReport = await Presentations.createPresentationReports(
      presentation.presentation_exchange_id,
      presentation.trace,
      presentation.connection_id,
      presentation.role,
      presentation.created_at,
      presentation.updated_at,
      JSON.stringify(presentation.presentation_request_dict),
      presentation.initiator,
      JSON.stringify(presentation.presentation_request),
      presentation.state,
      presentation.thread_id,
      presentation.auto_present,
      JSON.stringify(presentation.presentation),
    )

    // Broadcast the message to all connections
    Websockets.sendMessageToAll('PRESENTATIONS', 'PRESENTATION_REPORTS', {
      presentation_reports: [presentationReport],
    })
  } catch (error) {
    console.log('Error creating presentation reports:')
    throw error
  }
}

const updatePresentationReports = async (presentation) => {
  try {
    const presentationReport = await Presentations.updatePresentationReports(
      presentation.presentation_exchange_id,
      presentation.trace,
      presentation.connection_id,
      presentation.role,
      presentation.created_at,
      presentation.updated_at,
      JSON.stringify(presentation.presentation_request_dict),
      presentation.initiator,
      JSON.stringify(presentation.presentation_request),
      presentation.state,
      presentation.thread_id,
      presentation.auto_present,
      JSON.stringify(presentation.presentation),
    )

    // Broadcast the message to all connections
    Websockets.sendMessageToAll('PRESENTATIONS', 'PRESENTATION_REPORTS', {
      presentation_reports: [presentationReport],
    })
  } catch (error) {
    console.log('Error updating presentation reports:')
    throw error
  }
}

const getAll = async () => {
  try {
    console.log('Fetching presentation reports!')
    const presentationReports = await Presentations.readPresentations()

    return presentationReports
  } catch (error) {
    console.log('Error fetching presentation reports:')
    throw error
  }
}

module.exports = {
  adminMessage,
  requestPresentation,
  createPresentationReports,
  updatePresentationReports,
  getAll,
}
