const ControllerError = require('../errors.js')
const {DateTime} = require('luxon')

const AdminAPI = require('../adminAPI')
const Websockets = require('../adminwebsockets.js')
const AnonWebsockets = require('../anonwebsockets.js')

const requestPresentation = async (connectionID) => {
  console.log(`Requesting Presentation from Connection: ${connectionID}`)

  AdminAPI.Presentations.requestPresentation(
    connectionID,
    // ["trusted_traveler_expiration_date_time", "trusted_traveler_id"],
    ['trusted_traveler_id'],
    'RuuJwd3JMffNwZ43DcJKN1:2:Trusted_Traveler:1.4',
    'Requesting Presentation',
    false,
  )
}

const adminMessage = async (message) => {
  console.log('Received Presentations Message', message)

  if (message.state === 'verified') {
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
  } else if (message.state === null) {
    // (mikekebert) Send a basic message saying the verification failed for technical reasons
    console.log('Validation failed for technical reasons')
    await AdminAPI.Connections.sendBasicMessage(message.connection_id, {
      content: 'UNVERIFIED',
    })
  } else {
  }
}

module.exports = {
  adminMessage,
  requestPresentation,
}
