const server = require('./index.js').server
const ControllerError = require('./errors.js')
const WebSocket = require('ws')

awss = new WebSocket.Server({noServer: true})
console.log('Anon Websockets Setup')
let connectionIDWebSocket = []

// Send a message to all connected clients
const sendMessageToAll = (context, type, data = {}) => {
  try {
    console.log(
      `Sending Message to all anon websocket clients of type: ${type}`,
    )

    awss.clients.forEach(function each(client) {
      if (client.type != 'anon') {
        return
      }
      if (client.readyState === WebSocket.OPEN) {
        console.log('Sending Message to Client')
        client.send(JSON.stringify({context, type, data}))
      } else {
        console.log('Client Not Ready')
      }
    })
  } catch (error) {
    console.error('Error Sending Message to All Clients')
    throw error
  }
}

const sendMessageToConnectionId = (connection_id, context, type, data = {}) => {
  let ws = connectionIDWebSocket[connection_id]

  console.log(`Sending Message to anon websocket client of type: ${type}`)
  try {
    ws.send(JSON.stringify({context, type, data}))
  } catch (error) {
    console.error(error)
    throw error
  }
}

// (JamesKEbert) TODO: Add a connection timeout to gracefully exit versus nginx configuration closing abrubtly
awss.on('connection', (ws, req) => {
  console.log('New Anon Websocket Connection')
  ws.connection_ids = []

  // store the connection_ids assoicated with the connection

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message)
      console.log('New Anon Websocket Message:', parsedMessage)

      messageHandler(
        ws,
        parsedMessage.context,
        parsedMessage.type,
        parsedMessage.data,
      )
    } catch (error) {
      console.error(error)
    }
  })

  ws.on('close', (code, reason) => {
    console.log('Anon Websocket Connection Closed', code, reason)

    ws.connection_ids.forEach(
      (connection_id) => delete connectionIDWebSocket[connection_id],
    )
  })

  ws.on('ping', (data) => {
    console.log('Ping')
  })
  ws.on('pong', (data) => {
    console.log('Pong')
  })

  sendMessage(ws, 'SERVER', 'ANON_WEBSOCKET_READY')
})

// Send an outbound message to a websocket client
const sendMessage = (ws, context, type, data = {}) => {
  console.log(`Sending Message to anon websocket client of type: ${type}`)
  try {
    ws.send(JSON.stringify({context, type, data}))
  } catch (error) {
    console.error(error)
    throw error
  }
}

// Send an Error Message to a websocket client
const sendErrorMessage = (ws, errorCode, errorReason) => {
  try {
    console.log('Sending Error Message')

    sendMessage(ws, 'ERROR', 'SERVER_ERROR', {errorCode, errorReason})
  } catch (error) {
    console.error('Error Sending Error Message to Client')
    console.error(error)
  }
}

// Handle inbound messages
const messageHandler = async (ws, context, type, data = {}) => {
  try {
    console.log(`New Message with context: '${context}' and type: '${type}'`)
    switch (context) {
      case 'INVITATIONS':
        switch (type) {
          case 'CREATE_SINGLE_USE':
            var invitation
            invitation = await Invitations.createSingleUseInvitation()

            ws.connection_ids.push(invitation.connection_id)
            connectionIDWebSocket[invitation.connection_id] = ws

            sendMessage(ws, 'INVITATIONS', 'INVITATION', {
              invitation_record: invitation,
            })
            break

          default:
            console.error(`Unrecognized Message Type: ${type}`)
            sendErrorMessage(ws, 1, 'Unrecognized Message Type')
            break
        }
        break

      case 'SETTINGS':
        switch (type) {
          case 'GET_ORGANIZATION':
            console.log('GET_ORGANIZATION')
            const currentOrganization = await Settings.getOrganization()
            if (currentOrganization)
              sendMessage(
                ws,
                'SETTINGS',
                'SETTINGS_ORGANIZATION',
                currentOrganization.value,
              )
            else
              sendMessage(ws, 'SETTINGS', 'SETTINGS_ERROR', {
                error: "ERROR: organization name couldn't be fetched.",
              })
            break

          case 'GET_THEME':
            const currentTheme = await Settings.getTheme()
            if (currentTheme)
              sendMessage(ws, 'SETTINGS', 'SETTINGS_THEME', currentTheme)
            else
              sendMessage(ws, 'SETTINGS', 'SETTINGS_ERROR', {
                error: "ERROR: UI theme couldn't be fetched.",
              })
            break

          case 'GET_SCHEMAS':
            console.log('GET_SCHEMAS')
            const currentSchemas = await Settings.getSchemas()
            if (currentSchemas)
              sendMessage(ws, 'SETTINGS', 'SETTINGS_SCHEMAS', currentSchemas)
            else
              sendMessage(ws, 'SETTINGS', 'SETTINGS_ERROR', {
                error: "ERROR: Credential schemas couldn't be fetched.",
              })
            break
        }
        break

      case 'IMAGES':
        switch (type) {
          case 'SET_LOGO':
            if (check(rules, userCookieParsed, 'settings:update')) {
              console.log('SET_LOGO')
              console.log(data)
              const newImage = await Images.setImage(
                data.name,
                data.type,
                data.image,
              )
              if (newImage.error) {
                sendMessage(ws, 'SETTINGS', 'SETTINGS_ERROR', newImage)
              } else {
                sendMessage(ws, 'SETTINGS', 'LOGO', newImage[0])
                sendMessage(
                  ws,
                  'SETTINGS',
                  'SETTINGS_SUCCESS',
                  'Logo was successfully updated!',
                )
              }
            } else {
              sendMessage(ws, 'SETTINGS', 'SETTINGS_ERROR', {
                error: 'ERROR: You are not authorized to update the logo.',
              })
            }
            break

          default:
            console.log('GET_IMAGES')
            const images = await Images.getAll()
            if (images) sendMessage(ws, 'SETTINGS', 'LOGO', images[0])
            else
              sendMessage(ws, 'SETTINGS', 'SETTINGS_ERROR', {
                error: "ERROR: images couldn't be fetched.",
              })
            break
        }
        break

      default:
        console.error(`Unrecognized Message Context: ${context}`)
        sendErrorMessage(ws, 1, 'Unrecognized Message Context')
        break
    }
  } catch (error) {
    if (error instanceof ControllerError) {
      console.error('Controller Error in Message Handling', error)
      sendErrorMessage(ws, error.code, error.reason)
    } else {
      console.error('Error In Anon Websocket Message Handling', error)
      sendErrorMessage(ws, 0, 'Internal Error')
    }
  }
}

module.exports = {
  sendMessageToAll,
  sendMessageToConnectionId,
  awss,
  connectionIDWebSocket,
}

const Images = require('./agentLogic/images')
const Invitations = require('./agentLogic/invitations')
const Settings = require('./agentLogic/settings')
