require('dotenv/config')
const csv = require('csvtojson')
const { google } = require('googleapis')
const googleSheets = google.sheets('v4')

const credentials = {
  private_key: process.env.GOOGLE_PRIVATE_KEY,
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
}

const authGet = ({ client_email, private_key, scopes }) =>
  new google.auth.JWT(client_email, null, private_key, scopes)

const spreadsheetBatchUpdate = async (cred, spreadsheetId, requests) =>
  new Promise((resolve, reject) =>
    googleSheets.spreadsheets.batchUpdate(
      {
        auth: authGet(cred),
        spreadsheetId,
        resource: {
          requests
        }
      },
      (err, res) => (err ? reject(err) : resolve(res.data))
    )
  )

const buildRequests = result => {
  const headers = Object.keys(result[0])

  const id = 747382421

  const requests = []

  const header = {
    values: headers.map(h => ({
      userEnteredValue: { stringValue: h }
    }))
  }

  const content = result.map(l => ({
    values: headers.map(k => ({
      userEnteredValue: {
        stringValue: typeof l[k] === 'string' ? l[k].slice(0, 49999) : l[k]
      }
    }))
  }))

  const rows = [header, ...content]

  // requêtes pour ajouter le contenu de chaque onglet
  requests.push({
    appendCells: {
      sheetId: id,
      rows,
      fields: '*'
    }
  })

  return requests
}

const main = async ([spreadsheetId, path]) => {
  if (!path || !spreadsheetId)
    return console.error(
      'Usage: node gsheet-upload.js file-path spreadsheeet-id'
    )

  let file = await csv().fromFile(path)

  try {
    const requests = buildRequests(file)

    await spreadsheetBatchUpdate(credentials, spreadsheetId, requests)

    console.log('finished uploading')
  } catch (e) {
    // console.error(e.message)
    console.error('error during upload:', e.message.slice(0, 1000))
  }
}

if (!module.parent) {
  main(process.argv.slice(2))
}

module.exports = {
  spreadsheetBatchUpdate,
  buildRequests
}
