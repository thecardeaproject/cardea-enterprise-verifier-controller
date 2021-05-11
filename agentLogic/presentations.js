const ControllerError = require('../errors.js')

const AdminAPI = require('../adminAPI')
const Websockets = require('../adminwebsockets.js')
const AnonWebsockets = require('../anonwebsockets.js')


const requestPresentation = async (connectionID) => {
  console.log(`Requesting Presentation from Connection: ${connectionID}`)

  AdminAPI.Presentations.requestPresentation(
    connectionID,
    ['local-part', 'domain', 'address', 'date-validated'],
    'TaDe8aSZMxoEU4GZDm9AKK:2:Validated_Email:1.0',
    'Requesting Presentation',
    false,
  )
}

const adminMessage = async (message) => {
  console.log('Received Presentations Message', message)
  console.log("ASDF")
  console.log(message.presentation)

  if (message.state === 'verified') {
    console.log('Employee has been verified')
    //TODO change this to email?
    Websockets.sendMessageToAll('PRESENTATIONS', 'EMPLOYEE_VERIFIED', {
      connection_id: message.connection_id,
    })
    AnonWebsockets.sendMessageToConnectionId(message.connection_id, 'PRESENTATIONS', 'EMAIL_VERIFIED', {
      connection_id: message.connection_id,
      revealed_attrs: message.presentation.requested_proof.revealed_attrs,
    })
    
  }
}

module.exports = {
  adminMessage,
  requestPresentation,
}
