require('dotenv/config')
const { basename, extname } = require('path')
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

const spreadsheetGet = async (cred, spreadsheetId) =>
  new Promise((resolve, reject) =>
    googleSheets.spreadsheets.get(
      { auth: authGet(cred), spreadsheetId },
      (err, res) => (err ? reject(err) : resolve(res.data))
    )
  )

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

const buildRequests = (files, sheets) =>
  files.reduce((requests, file) => {
    const columns = Object.keys(file.content[0])

    const header = {
      values: columns.map(h => ({
        userEnteredValue: { stringValue: h }
      }))
    }

    const content = file.content.map(l => ({
      values: columns.map(k => ({
        userEnteredValue: {
          stringValue: typeof l[k] === 'string' ? l[k].slice(0, 49999) : l[k]
        }
      }))
    }))

    const rows = [header, ...content]

    let sheet = sheets.find(s => s.properties.title === file.name)

    let sheetId

    if (sheet) {
      sheetId = sheet.properties.sheetId
      requests.push({ deleteSheet: { sheetId } })
    } else {
      sheetId = Math.floor(Math.random() * 1000)
    }

    sheet = {
      sheetId,
      title: file.name,
      sheetType: 'GRID',
      gridProperties: {
        columnCount: columns.length,
        rowCount: 2,
        frozenRowCount: 1
      }
    }

    requests.push({
      addSheet: {
        properties: sheet
      }
    })

    requests.push({
      appendCells: {
        sheetId,
        rows,
        fields: '*'
      }
    })

    return requests
  }, [])

const main = async ([spreadsheetId, ...files]) => {
  if (!spreadsheetId || !files.length)
    return console.error(
      'Usage: node gsheet-upload.js spreadsheeet-id file-path [file-path, ...]'
    )

  const spreadsheet = await spreadsheetGet(credentials, spreadsheetId)

  files = files.map(path => ({
    name: basename(path, extname(path)),
    path
  }))

  files = await Promise.all(
    files.map(async file => ({
      ...file,
      content: await csv().fromFile(file.path)
    }))
  )

  try {
    const requests = buildRequests(files, spreadsheet.sheets)

    await spreadsheetBatchUpdate(credentials, spreadsheetId, requests)

    console.log('finished uploading')
  } catch (e) {
    // console.error(e.message)
    console.error('error during upload:', e.message.slice(0, 1000))
  }
}

main(process.argv.slice(2))
