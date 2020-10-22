const toLowerCase = s => (s || '').toString().toLowerCase()

const padStart = (n, i, c) => n.toString().padStart(i, c)
const padEnd = (n, i, c) => n.toString().padEnd(i, c)
const toStartCase = s =>
    toLowerCase(s).replace(/\w+/g, s => `${s[0].toUpperCase()}${s.slice(1)}`)


module.exports = {toLowerCase, padStart, padEnd, toStartCase}
