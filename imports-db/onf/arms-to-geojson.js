const csv = require('csvtojson')

const main = async () => {
  const arms = await csv().fromFile(
    './sources/csv/2019524-17-33-camino-titre-export.csv'
  )

  const armsWithPerimetre = arms.filter(a => a.geojson)

  console.log(
    JSON.stringify(
      {
        type: 'FeatureCollection',
        features: armsWithPerimetre.map(({ geojson, ...a }) => {
          const feature = JSON.parse(geojson)

          return {
            properties: a,
            ...feature
          }
        })
      },
      null,
      2
    )
  )
}

main()
