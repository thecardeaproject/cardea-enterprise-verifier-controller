const AdminAPI = require('../adminAPI')
const AnonWebsockets = require('../anonwebsockets.js')
const Websockets = require('../adminwebsockets.js')

let Connections = require('../orm/connections.js')
let Contacts = require('../orm/contacts.js')
let ContactsCompiled = require('../orm/contactsCompiled.js')
let Demographics = require('../orm/demographics.js')
let Passports = require('../orm/passports.js')

// Perform Agent Business Logic

// Fetch an existing connection
const fetchConnection = async (connectionID) => {
  try {
    // (JamesKEbert) TODO: Change to use Controller DB versus Admin API Call
    const connection = await AdminAPI.Connections.fetchConnection(connectionID)

    return connection
  } catch (error) {
    console.error('Error Fetching Connection')
    throw error
  }
}

const getContact = async (contactID, additionalTables) => {
  try {
    const contact = await ContactsCompiled.readContact(
      contactID,
      additionalTables,
    )

    console.log('Contact:', contact)

    return contact
  } catch (error) {
    console.error('Error Fetching Contact')
    throw error
  }
}

const getAll = async (additionalTables) => {
  try {
    const contacts = await ContactsCompiled.readContacts(additionalTables)

    console.log('Got All Contacts')

    return contacts
  } catch (error) {
    console.error('Error Fetching Contacts')
    throw error
  }
}

const adminMessage = async (connectionMessage) => {
  try {
    console.log('Received new Admin Webhook Message', connectionMessage)

    if (connectionMessage.state === 'invitation') {
      console.log('State - Invitation')

      await Connections.createOrUpdateConnection(
        connectionMessage.connection_id,
        connectionMessage.state,
        connectionMessage.my_did,
        connectionMessage.alias,
        connectionMessage.request_id,
        connectionMessage.invitation_key,
        connectionMessage.invitation_mode,
        connectionMessage.invitation_url,
        connectionMessage.invitation,
        connectionMessage.accept,
        connectionMessage.initiator,
        connectionMessage.their_role,
        connectionMessage.their_did,
        connectionMessage.their_label,
        connectionMessage.routing_state,
        connectionMessage.inbound_connection_id,
        connectionMessage.error_msg,
      )
      // Broadcast the invitation in the invitation agent logic
      return
    }

    var contact

    if (connectionMessage.state === 'request') {
      console.log('State - Request')
      console.log('Creating Contact')

      contact = await Contacts.createContact(
        connectionMessage.their_label, // label
        {}, // meta_data
      )

      await Connections.updateConnection(
        connectionMessage.connection_id,
        connectionMessage.state,
        connectionMessage.my_did,
        connectionMessage.alias,
        connectionMessage.request_id,
        connectionMessage.invitation_key,
        connectionMessage.invitation_mode,
        connectionMessage.invitation_url,
        connectionMessage.invitation,
        connectionMessage.accept,
        connectionMessage.initiator,
        connectionMessage.their_role,
        connectionMessage.their_did,
        connectionMessage.their_label,
        connectionMessage.routing_state,
        connectionMessage.inbound_connection_id,
        connectionMessage.error_msg,
      )

      await Connections.linkContactAndConnection(
        contact.contact_id,
        connectionMessage.connection_id,
      )

      await Connections.linkContactAndConnection(
        contact.contact_id,
        connectionMessage.connection_id,
      )

      // await Demographics.createOrUpdateDemographic(
      //   contact.contact_id,
      //   'john.doe@email.com',
      //   '1-222-345-5467',
      //   {
      //     address_1: '1234 Lane St.',
      //     address_2: '',
      //     city: 'Rexburg',
      //     state: 'Idaho',
      //     zip_code: '83440',
      //     country: 'United States',
      //   },
      // )

      // await Passports.createPassport(
      //   contact.contact_id,
      //   '31195855',
      //   'Doe',
      //   'John M.',
      //   'M',
      //   '22 Jan 1974',
      //   'Kansas City, Kansas',
      //   'United States of America',
      //   '18 Sep 2005',
      //   '17 Sep 2014',
      //   'P',
      //   'USA',
      //   'United States Department of State',
      //   blob,
      // )
      /* Websockets.sendMessageToAll('INVITATIONS', 'SINGLE_USE_USED', {
        connection_id: connectionMessage.connection_id,
      })*/
    } else {
      console.log('State - Response or later')
      await Connections.updateConnection(
        connectionMessage.connection_id,
        connectionMessage.state,
        connectionMessage.my_did,
        connectionMessage.alias,
        connectionMessage.request_id,
        connectionMessage.invitation_key,
        connectionMessage.invitation_mode,
        connectionMessage.invitation_url,
        connectionMessage.invitation,
        connectionMessage.accept,
        connectionMessage.initiator,
        connectionMessage.their_role,
        connectionMessage.their_did,
        connectionMessage.their_label,
        connectionMessage.routing_state,
        connectionMessage.inbound_connection_id,
        connectionMessage.error_msg,
      )
    }

    contact = await ContactsCompiled.readContactByConnection(
      connectionMessage.connection_id,
      ['Demographic', 'Passport'],
    )

    Websockets.sendMessageToAll('CONTACTS', 'CONTACTS', {contacts: [contact]})
    AnonWebsockets.sendMessageToConnectionId(connectionMessage.connection_id, 'CONTACTS', 'CONTACTS', {contacts: [contact]})

    await Presentations.requestPresentation(connectionMessage.connection_id)
  } catch (error) {
    console.error('Error Storing Connection Message')
    throw error
  }
}

module.exports = {
  adminMessage,
  fetchConnection,
  getContact,
  getAll,
}

const Presentations = require('./presentations')

