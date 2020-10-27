const toLowerCase = s => (s || '').toString().toLowerCase()

const padStart = (n, i, c) => n.toString().padStart(i, c)
const padEnd = (n, i, c) => n.toString().padEnd(i, c)
const toStartCase = s =>
    toLowerCase(s).replace(/\w+/g, s => `${s[0].toUpperCase()}${s.slice(1)}`)
const substancesToString = (substances) => substances.map(s => s.alias + `(${s.domaine})`).join(", ")
const capitalize = str => str && `${str[0].toUpperCase()}${str.slice(1)}`

const uniqBy = (array, key) => {
    let seen = new Set();
    return array.filter(item => {
        let k = item[key];
        return seen.has(k) ? false : seen.add(k);
    });
}

module.exports = {toLowerCase, padStart, padEnd, toStartCase, substancesToString, uniqBy, capitalize}
