const { readdirSync: dir, readFileSync: read, writeFileSync: write } = require('fs')

const json2csv = require('json2csv').parse

const fetch = require('node-fetch')

let entreprises
entreprises = dir('./sources')
  .filter(f => f.match(/entreprises/))
  .sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
  .reduce(
    (r, f) => r.concat(
      require(`./sources/${f}`)
        .map((e) => ({ type: f.split('-')[1].split('.')[0], ...e }))
    ),
    []
  )

const token = process.argv[2]

if (!token) {
  console.error('Usage: node . API_TOKEN')
  process.exit(1)
}

async function getInsee(siren) {
  const targetFileName = `./responses/${siren}.json`

  try {
    const res = require(targetFileName)
    if (res.fault && res.fault.code === 900804) {
      throw new Error('request has faulted, retrying')
    }
    console.log(`${siren}... OK.`)

    return res
  } catch (e) {
    console.log(`fetching ${siren}... (${e.message})`)

    let res = await fetch(`https://api.insee.fr/entreprises/sirene/V3/siren/${siren}`, {
      credentials: 'include',
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`
      },
    })

    res = await res.json()

    if (res.fault && res.fault.code === 900804) {
      console.error(res.fault.description)
      process.exit(1)
    }

    console.log(res)

    write(targetFileName, JSON.stringify(res, null, 4))

    console.log(`response ${siren} written`)

    return await timeout(500)
  }
}

async function timeout(time) {
  return new Promise((r, j) => setTimeout(r, time))
}

async function main() {
  let responses = await Promise.all(
    entreprises
      .filter(e => e.pays_id == 'FR' && e.legal_siren)
      .map(async (entreprise) => {
        return getInsee(entreprise.legal_siren)
      })
  )

  console.log(responses.filter(r => !r.uniteLegale))

  console.log(responses[0].uniteLegale.periodesUniteLegale)

  responses = responses.map(({ uniteLegale: { periodesUniteLegale, ...rest } = {} }) => ({
    ...rest,
    ...(periodesUniteLegale || {})[0]
  }))

  console.log(responses[0])
  console.log(responses.length)

  const opts = { fields: Object.keys(responses[0]) }

  const res = json2csv(responses, opts)
  write('./exports/raw-insee.csv', res)
}

main()
