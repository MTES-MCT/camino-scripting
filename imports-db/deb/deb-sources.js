const fs = require('fs')

const csv = require('csvtojson')
const json2csv = require('json2csv').parse
const slugify = require('@sindresorhus/slugify')
const cryptoRandomString = require('crypto-random-string')

const padStart = (n, i, c) => n.toString().padStart(i, c)
const padEnd = (n, i, c) => n.toString().padEnd(i, c)
const toLowerCase = s => (s || '').toString().toLowerCase()

const allDocsDeb = []
const allDocsCamino = []

const capitalize = str => str && `${str[0].toUpperCase()}${str.slice(1)}`

// https://stackoverflow.com/questions/44195322/a-plain-javascript-way-to-decode-html-entities-works-on-both-browsers-and-node
const decodeEntities = encodedString => {
  const translate_re = /&(nbsp|amp|quot|lt|gt);/g
  const translate = {
    nbsp: ' ',
    amp: '&',
    quot: '"',
    lt: '<',
    gt: '>'
  }

  return encodedString
    .replace(translate_re, (match, entity) => translate[entity])
    .replace(/&#(\d+);/gi, (match, numStr) => {
      var num = parseInt(numStr, 10)

      return String.fromCharCode(num)
    })
}

const indexify = (arr, key, { unique = false, caseSensitive = true }) => {
  const getKey = typeof key !== 'function' ? e => e[key] : key

  return arr.reduce((r, e) => {
    let val = getKey(e)

    if (!caseSensitive) {
      val = toLowerCase(val)
    }

    if (unique === true) {
      r[val] = e
      return r
    }

    if (!r[val]) {
      r[val] = []
    }

    r[val].push(e)

    return r
  }, {})
}

const load = async schema => {
  const files = await Promise.all(
    schema.map(async table => {
      const csvFilePath = `../sources/csv/deb_${table.name}.csv`

      try {
        const data = await csv().fromFile(csvFilePath)
        return { table, data }
      } catch (e) {
        console.error(table.name, e)
        process.exit(1)
      }
    })
  )

  return files.reduce((result, { table, data }) => {
    const { 0: first, length } = data

    const cols = Object.keys(first)

    result[table.name] = {
      table,
      length,
      cols,
      data,
      display: `${table.name} (${length}):\n- ${cols.join('\n- ')}`
    }

    return result
  }, {})
}

const tablesIndexify = tables =>
  Object.keys(tables).forEach(name => {
    const rest = tables[name]
    const { table, data } = rest

    rest.indices = table.indices.reduce((r, { name, key, ...options }) => {
      r[name] = indexify(data, key, options)

      return r
    }, {})
  })

const tablesLink = tables =>
  Object.keys(tables).forEach(name => {
    const rest = tables[name]
    const { table, data } = rest

    data.forEach(
      row =>
        table.links &&
        table.links.reduce(
          (r, { name, key, index, alias = key, caseSensitive = true }) => {
            try {
              let val = row[key]
              if (!caseSensitive) {
                val = toLowerCase(val)
              }

              row[alias] = tables[name].indices[index][val]
            } catch (e) {
              console.error(name, index, key, row[key], alias)
              console.error(e)
              process.exit(1)
            }

            return r
          },
          {}
        )
    )
  })

const recursif = {
  name: 'titres',
  links: {
    typtit: { name: 'titres_types', key: 'id', alias: 'type' },
    etatj: { name: 'titres_etats_j', key: 'id', alias: 'etat' },
    etatt: { name: 'titres_etats_t', key: 'id', alias: 'travaux' },

    substances: {
      name: 'titres_substances',
      key: 'id',
      links: {
        substance: { name: 'substances', key: 'id_sub', index: 'id' }
      }
    },

    titulaires: {
      name: 'liens_titulaires',
      key: 'id_tit',
      index: 'titres',
      alias: 'titulaires',
      links: {
        titulaire: { name: 'titulaires', key: 'id_titu', index: 'id' }
      }
    },

    affaires: {
      name: 'affaires',
      key: 'id',
      index: 'titres',
      links: {
        a_typ: { name: 'affaires_types', key: 'id', alias: 'type' },
        a_etat: { name: 'affaires_etats', key: 'id', alias: 'etat' },

        events: {
          name: 'events',
          key: 'id',
          links: {
            cod_evt: {
              name: 'events_types',
              key: 'cod_evt',
              alias: 'type',
              index: 'id'
            },

            documents: { name: 'events_documents', key: 'id', index: 'events' }
          }
        }
      }
    }
  }
}

async function main() {
  const schema = [
    {
      name: 'titres',
      indices: [{ name: 'id', key: 'id', unique: true }],
      links: [
        { name: 'titres_types', key: 'typtit', alias: 'type', index: 'id' },
        { name: 'titres_etats_j', key: 'etatj', alias: 'etat', index: 'id' },
        { name: 'titres_etats_t', key: 'etatt', alias: 'travaux', index: 'id' },
        {
          name: 'titres_substances',
          key: 'id',
          index: 'titres',
          alias: 'substances'
        },
        // /*
        {
          name: 'liens_titulaires',
          key: 'id',
          index: 'titres',
          alias: 'titulaires'
        },
        // */
        { name: 'affaires', key: 'id', index: 'titres', alias: 'affaires' }
      ]
    },
    {
      name: 'titres_types',
      indices: [{ name: 'id', key: 'id', unique: true }]
    },
    {
      name: 'titres_etats_t',
      indices: [{ name: 'id', key: 'id', unique: true }]
    },
    {
      name: 'titres_etats_j',
      indices: [{ name: 'id', key: 'id', unique: true }]
    },

    {
      name: 'affaires',
      indices: [
        { name: 'id', key: 'id', unique: true },
        { name: 'titres', key: 'id_tit', unique: false }
      ],
      links: [
        { name: 'affaires_types', key: 'a_typ', alias: 'type', index: 'id' },
        { name: 'affaires_etats', key: 'a_etat', alias: 'etat', index: 'id' },
        { name: 'events', key: 'id', index: 'affaires', alias: 'events' }
      ]
    },
    {
      name: 'affaires_types',
      indices: [{ name: 'id', key: 'id', unique: true }]
    },
    {
      name: 'affaires_etats',
      indices: [{ name: 'id', key: 'id', unique: true }]
    },

    {
      name: 'events',
      indices: [
        { name: 'id', key: 'id', unique: true },
        { name: 'affaires', key: 'id_aff', unique: false }
      ],
      links: [
        { name: 'events_types', key: 'cod_evt', alias: 'type', index: 'id' },
        {
          name: 'events_documents',
          key: 'id',
          index: 'events',
          alias: 'documents'
        }
      ]
    },
    {
      name: 'events_types',
      indices: [{ name: 'id', key: 'id', unique: true }]
    },
    {
      name: 'events_documents',
      indices: [
        { name: 'id', key: 'id', unique: true },
        { name: 'events', key: 'id_evt', unique: false }
      ]
    },

    // /*
    {
      name: 'titulaires',
      indices: [{ name: 'id', key: 'itv_cdn', unique: true }],
      links: [
        {
          name: 'liens_titulaires',
          key: 'id',
          index: 'titulaires',
          alias: 'titres'
        },
        {
          name: 'titulaires_consolidation',
          key: 'itv_nom_lb',
          index: 'name',
          alias: 'consolidation',
          caseSensitive: false
        }
      ]
    },
    {
      name: 'liens_titulaires',
      indices: [
        { name: 'titres', key: 'id_tit' },
        { name: 'titulaires', key: 'id_titu' }
      ],
      links: [
        { name: 'titulaires', key: 'id_titu', index: 'id', alias: 'titulaire' }
      ]
    },
    {
      name: 'titulaires_consolidation',
      indices: [
        { name: 'name', key: 'nom', unique: true, caseSensitive: false }
      ]
    },
    // */

    {
      name: 'substances',
      indices: [{ name: 'id', key: 'id', unique: true }]
    },
    {
      name: 'titres_substances',
      indices: [
        { name: 'titres', key: 'id_tit' },
        { name: 'substances', key: 'id_sub' }
      ],
      links: [
        {
          name: 'substances',
          key: 'id_sub',
          index: 'id',
          alias: 'substance'
        }
      ]
    }
  ]

  const tables = await load(schema)

  if (false)
    Object.keys(tables).forEach(table => {
      console.log(tables[table].display)
    })

  tablesIndexify(tables)
  tablesLink(tables)

  // filtre les titulaires qui ont des titres
  tables.titulaires.data = tables.titulaires.data.filter(titu =>
    tables.titres.data.find(
      t =>
        t.titulaires &&
        t.titulaires.find(ttitu => ttitu.id_titu === titu.itv_cdn)
    )
  )

  Object.keys(tables).forEach(table => {
    // if (table.match('titu')) return

    console.log(table)

    const fileName = `./sources_${table}`

    const json = JSON.stringify(tables[table], null, 2)

    fs.writeFileSync(`${fileName}.json`, json)

    const data = tables[table].data

    if (!data[0]) return

    const opts = { fields: Object.keys(data[0]) }

    const csv = json2csv(data, opts)

    fs.writeFileSync(`${fileName}.csv`, csv)
  })

  process.exit(0)

  const entreprises = entreprisesCreate(tables.titres.data)

  const titres = titresCreate(tables.titres.data, titrePropsCreate)
}

main().catch(console.error)
