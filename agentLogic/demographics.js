const Websockets = require('../adminwebsockets.js')

let Connections = require('../orm/connections.js')
let Contacts = require('../orm/contacts.js')
let ContactsCompiled = require('../orm/contactsCompiled.js')
let Demographics = require('../orm/demographics.js')

const updateOrCreateDemographic = async function (
  contact_id,
  email,
  phone,
  address,
) {
  try {
    await Demographics.createOrUpdateDemographic(
      contact_id,
      email,
      phone,
      address,
    )

    const contact = await ContactsCompiled.readContact(contact_id, [
      'Demographic',
      'Passport',
    ])

    console.log('Contact:', contact)

    Websockets.sendMessageToAll('CONTACTS', 'CONTACTS', {contacts: [contact]})
  } catch (error) {
    console.error('Error Fetching Contacts')
    throw error
  }
}

module.exports = {
  updateOrCreateDemographic,
}
