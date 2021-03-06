const Websockets = require('../adminwebsockets.js')

const Presentations = require('./presentations.js')

const adminMessage = async (message) => {
  console.log('New Basic Message')

  // Connection Reuse Method
  switch (message.content) {
    case 'employee':
      console.log('Connection Request Employee Workflow')

      Websockets.sendMessageToAll('INVITATIONS', 'SINGLE_USE_USED', {
        workflow: message.content,
        connection_id: message.connection_id,
      })

      break
    case 'immunization':
      console.log('Connection Request Immunization Workflow')

      await Websockets.sendMessageToAll('INVITATIONS', 'SINGLE_USE_USED', {
        workflow: message.content,
        connection_id: message.connection_id,
      })

      // Send Presentation Request
      await Presentations.requestPresentation(message.connection_id)

      break
    default:
      console.warn('Regular Basic Message:', message.content)
      return
  }
}

module.exports = {
  adminMessage,
}
