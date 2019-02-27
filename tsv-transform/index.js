const fs = require("fs");
const path = require("path");

const csv = require("csvtojson");
const gdal = require("gdal");
const parseDms = require("parse-dms");

const epsgIndex = require("epsg-index/all.json");

function printTitresPoints(pointsFile) {
  pointsFile.points.forEach(e => {
    console.log(
      [
        `${pointsFile.etape}-g${e.groupe.padStart(
          2,
          "0"
        )}-c${e.contour.padStart(2, "0")}-p${e.point.padStart(3, "0")}`,
        `"${e.coordonnees}"`,
        e.groupe,
        e.contour,
        e.point,
        pointsFile.etape,
        e.jorf_id
      ].join(",")
    );
  });
}

const system = 2972;

function printTitresPointsReferences(pointsFile) {
  pointsFile.points.forEach(e => {
    const id = `${pointsFile.etape}-g${e.groupe.padStart(
      2,
      "0"
    )}-c${e.contour.padStart(2, "0")}-p${e.point.padStart(3, "0")}`;

    console.log(
      [`${id}-${system}`, id, system, `"${e.coord1},${e.coord2}"`].join(",")
    );
  });
}

function toWGS(system, { coord1, coord2 }) {
  if (false) console.log({ coord1, coord2 });

  const point = new gdal.Point(coord1, coord2);
  const transformation = new gdal.CoordinateTransformation(
    gdal.SpatialReference.fromEPSG(system),
    gdal.SpatialReference.fromEPSG(4326)
  );
  point.transform(transformation);
  return [point.x, point.y];
}

function parseFile(content) {
  const points = content
    .trim()
    .replace(/\r/g, "")
    .split("\n")
    .slice(1)
    .map(e => {
      // console.log(e)

      let [
        groupe,
        contour,
        point,
        jorf_id,
        description,
        coord1,
        coord2
      ] = e.split("\t");
      if (false) console.log(e);
      if (false) console.log({ coord1, coord2 });

      coord1 = coord1.replace(",", ".");
      coord2 = coord2.replace(",", ".");

      // coord1 = parseDms(coord1);
      // coord2 = parseDms(coord2);

      coord1 = +coord1;
      coord2 = +coord2;

      const result = {
        groupe,
        contour,
        point,
        jorf_id,
        description,
        coord1,
        coord2
      };

      result.coordonnees = toWGS(system, result).join(",");
      //result.coordonnees = [coord1, coord2]

      return result;
    });

  return points;
}

async function main() {
  let files = fs.readdirSync("./sources");

  files = files
    .filter(f => f.match(/2019/))
    .filter(f => f.match(/oct/))
    .filter(f => !f.match(/old/));

  // console.log({ files })

  const pointsFiles = files.map(file => ({
    points: parseFile(fs.readFileSync(path.join("./sources", file)).toString()),
    etape: path.basename(file, ".tsv")
  }));

  console.log("id,coordonnees,groupe,contour,point,titre_etape_id,nom");
  pointsFiles.forEach(printTitresPoints);

  console.log("id,titre_point_id,systeme,coordonnees");
  pointsFiles.forEach(printTitresPointsReferences);

  process.exit(0);
}

main();
