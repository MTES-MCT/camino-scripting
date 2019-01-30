const fs = require('fs');
const { createWriteStream: write } = fs;

const spreadSheetToJson = require('google-spreadsheet-to-json')
const credentials = require('./config/credentials')

const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

async function getSpreadSheet(spreadsheetId, worksheet) {
  let json = await spreadSheetToJson({
    spreadsheetId,
    credentials,
    worksheet
  })

  return json
}

const spreadsheetId = '1gwx-kVCUCn7_R7fBYCZkcXh4eczUuHubyka30p9wnzQ';

async function main() {
  const res = await getSpreadSheet(spreadsheetId, 'deb_events');

  console.log(JSON.stringify(res));
}


main();
