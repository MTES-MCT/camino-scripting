const csv = require('csvtojson')
const json2csv = require('json2csv').parse

const typesDeb = [
  '',
  'APP',
  'Concession',
  "Permis d'exploitation",
  'Permis de recherche',
  'PEC'
]

const typesRntm = {
  Concession: 2,
  "Permis d'exploitation": 3,
  'Permis de recherche': 4,
  '': 0,
  'Non défini': 0
}

async function main() {
  let titresDeb = await csv().fromFile('../sources/csv/deb_titres.csv')

  let titresRntm = require('../sources/json/rntm.json').features.map(t => ({
    ...t.properties,
    departement: t.properties.Code.slice(0, 2)
  }))

  // console.log(titresDeb[0])
  // console.log(titresRntm[0])

  const titresDebRntm = titresDeb
    .map(deb => {
      const rntms = []

      deb.ref = `${deb.datprefsd.slice(0, 4)}-${deb.cod}-${deb.txtcod}`

      const dNom = deb.nmtit
      if (!dNom) {
        return { deb, rntms }
      }

      const dTypeRntm = typesDeb[deb.typtit]
      const dNomLower = dNom && dNom.toLowerCase()

      for (let rntm of titresRntm) {
        if (rntm.Nature !== dTypeRntm) continue

        const rNom = rntm.Nom
        if (!rNom) continue

        const depEq = rntm.departement === deb.c_dpt_coor

        if (rNom === dNom) {
          rntms.push({
            ...rntm,
            nomEq: true,
            depEq
          })
          continue
        }

        const rNomLower = rNom.toLowerCase()

        if (rNomLower.includes(dNomLower) || dNomLower.includes(rNomLower)) {
          rntms.push({ ...rntm, nomEq: false, nomMatch: true, depEq })
        }
      }

      return { deb, rntms }
    })
    .sort(
      (a, b) =>
        -1 *
        (a.rntms.filter(r => r.nomEq).length * 100 +
          a.rntms.filter(r => r.nomMatch).length -
          b.rntms.filter(r => r.nomEq).length * 100 -
          b.rntms.filter(r => r.nomMatch).length)
    )

  titresDebRntm
    // .filter(t => t.deb.nmtit === 'MARIE')
    .forEach(({ rntms, deb, ...rest }) => {
      rest.rntms = rntms.sort(
        (a, b) =>
          (false &&
            console.log(
              a.Nom,
              a.nomEq,
              a.departement,
              b.Nom,
              b.nomEq,
              b.departement
            )) ||
          -1 * (a.nomEq * 10 + a.depEq - b.nomEq * 10 - b.depEq)
      )
    })

  if (false)
    titresDebRntm
      .filter(t => t.deb.nmtit === 'MARIE')
      .forEach(({ deb, rntms }) => {
        console.log(
          `${deb.datprefsd}-${deb.cod}-${deb.txtcod} (${deb.c_dpt_coor})`,
          deb.nmtit,
          ':',
          typesDeb[deb.typtit]
        )

        rntms.forEach(r => {
          console.log(`${r.nomEq ? '=' : '~'}>`, r.Code, r.Nom, r.Nature)
        })
      })

  const opts = { fields: Object.keys(titresDebRntm[0]) }

  const res = json2csv(titresDebRntm, opts)

  console.log(res)
}

main()
