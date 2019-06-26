const csv = require('csvtojson')
const json2csv = require('json2csv').parse

const merge = require('./utils/merge')
const join = require('./utils/join')

const toCsv = (res, name) => {
  if (!res || !res.length) {
    console.log('empty file:', name)
    return
  }

  const opts = {
    //    fields: Object.keys(res[0])
  }

  try {
    const csv = json2csv(res, opts)
    console.log(csv)
    //write(`exports/camino-onf-${name}.csv`, csv)
  } catch (err) {
    console.error(err)
  }
}

const prefixKeys = (prefix, obj) => {
  return (
    obj &&
    Object.keys(obj).reduce((r, k) => ((r[`${prefix}:${k}`] = obj[k]), r), {})
  )
}

const main = async () => {
  let entreprisesCamino = require('./sources/json/entreprises-titres-m973.json')
  let entreprisesOnf = await csv().fromFile(
    './exports/camino-onf-entreprises.csv'
  )

  entreprisesCamino = entreprisesCamino.map(({ id, ...e }) => ({
    id,
    ...prefixKeys('camino', e)
  }))
  entreprisesOnf = entreprisesOnf.map(({ id, ...e }) => ({
    id,
    ...prefixKeys('onf', e)
  }))

  const j = join(entreprisesCamino, entreprisesOnf, 'id')

  const idsJ = Object.keys(j)

  const resJ = idsJ.map(k =>
    j[k].reduce((r, e) => ({ ...r, ...e }), { count: j[k].length })
  )

  const { common, nomatch } = resJ.reduce(
    (r, e) => (r[e.count === 2 ? 'common' : 'nomatch'].push(e), r),
    { common: [], nomatch: [] }
  )

  const { camino, onf } = nomatch.reduce(
    (r, e) => {
      if (e['onf:nom']) {
        //        delete e.id
        r.onf.push(e)
      } else {
        r.camino.push(e)
      }
      return r
    },
    {
      camino: [],
      onf: []
    }
  )

  const jj = join(camino, onf, e => e['camino:nom'] || e['onf:nom'])

  const idsJj = Object.keys(jj)

  // console.log(jj[idsJj[0]])

  const resJj = idsJj.map(k =>
    jj[k].reduce(
      ({ count, id, ...r }, { count: countE, id: idE, ...e }) => ({
        ...(idE && !id ? { count, id: idE } : { count, id }),
        ...r,
        ...e
      }),
      {
        count: jj[k].length
      }
    )
  )

  resJj.sort((a, b) => {
    const count = b.count - a.count
    if (count !== 0) return count

    if (a['camino:nom'] && !b['camino:nom']) return 1
    if (!a['camino:nom'] && b['camino:nom']) return -1

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  // console.log(resJj[0])

  toCsv(resJj)
  //console.log(j)
}

main()
