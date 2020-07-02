const fs = require('fs')

const titres = JSON.parse(
  fs
    .readFileSync('./aura/aura-titres.json', {
      encoding: 'latin1'
    })
    .toString()
)

const titre = titres[0]

const o = Object.keys(titre).reduce((r, key) => {
  if (key.match(/_?([0-9])$/)) {
    key = key.replace(/_?([0-9])$/, '_$1')
  }

  if (key.match(/_/)) {
    const [part, num] = key.split(/_/)

    if (!r[part]) {
      r[part] = []
    }

    if (titre[key]) {
      r[part].push(titre[key])
    }
  } else if (key.match(/^[A-Z]$/)) {
    if (!r.communes) {
      r.communes = []
    }

    if (titre[key]) {
      r.communes.push(titre[key])
    }
  } else {
    r[key] = titre[key]
  }

  return r
}, {})

console.log(o)
