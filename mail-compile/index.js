const fs = require("fs").promises;
const { join } = require("path");
const json2csv = require("json2csv").parse;

async function format(dir, file) {
  let content;

  try {
    content = (await fs.readFile(join(dir, file))).toString().split("\r\n");
  } catch (e) {
    console.error(e);
    return {};
  }

  let [sujet, mail, date] = content.slice(0, 10).reduce(
    (r, e) => {
      if (e.match(/Sujet :/)) {
        r[0] = e;
      } else if (e.match(/De :/)) {
        r[1] = e;
      } else if (e.match(/Date :/)) {
        r[2] = e;
      }

      return r;
    },
    ["Sujet :", "De :", "Date :"]
  );

  let text;

  try {
    sujet = sujet.split(":")[1].trim();
    mail = mail
      .split(" ")
      .pop()
      .slice(1, -1);
    date = date
      .split(":")
      .slice(1)
      .join(":")
      .trim();

    text = content
      .slice(5)
      .join("\n")
      .trim();
  } catch (e) {
    console.log({ file, content });
    console.error(e);
    return {};
  }

  return { file, sujet, mail, date, text };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: node index.js dossier");
    process.exit(1);
  }

  let files = await fs.readdir(dir);
  files = files.filter(n => n !== "output.txt" && n.match(/\.txt$/));

  const lines = await Promise.all(
    files.map(file => format(dir, file)).slice(0)
  );

  const fields = Object.keys(lines[0]);

  const opts = { fields };

  try {
    const csv = json2csv(lines, opts);
    console.log(csv);
  } catch (err) {
    console.error(err);
  }
}

main();
