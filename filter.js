import process from 'node:process'
import fs from 'node:fs/promises'
import path from 'path'

function printUsage () {
    console.error("Usage: node filter.js [path to repo] [JSON list of versions]")
    process.exit(1)
}

const repoArg = process.argv[2]
const versionsArg = process.argv[3]
if (!repoArg || !versionsArg) {
    printUsage()
}

const distros = new Set(["fedora", "rhel8", "rhel9", "rhel10", "rhel11", "c9s", "c10s", "c11s"])

let matrix = []

let versions
try {
    versions = JSON.parse(versionsArg)
} catch (err) {
    printUsage()
}
if (!Array.isArray(versions)) {
    printUsage()
}

// wait for all iterations of loop to finish
await Promise.all(versions.map(async version => {
    const files = await fs.readdir(path.join(repoArg, version))

    const presentDistros = new Set(files.filter(name => name.startsWith("Dockerfile."))
        .map(name => name.split(".")[1]))
    const excludedDistros = new Set(files.filter(name => name.startsWith(".exclude-"))
        .map(name => name.split("-")[1]))

    // union of excluded distros and the ones not present; filtered to only contain real distros (e.g. no c8s)
    const missingDistros = distros.intersection(excludedDistros.union(distros.difference(presentDistros)))
    missingDistros.forEach(distro => {
        matrix.push({"version": version, "os_test": distro})
        if (distro.startsWith("rhel")) {
            matrix.push({"version": version, "os_test": `${distro}-unsubscribed`})
        }
    })
}))

console.log(JSON.stringify(matrix))

