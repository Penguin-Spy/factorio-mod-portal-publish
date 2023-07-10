import * as core from '@actions/core'
import { exec } from 'child_process'
import { createReadStream, readFileSync } from 'fs'
import axios from 'axios'
import FormData from 'form-data'

async function run() {
  const API_KEY = core.getInput("factorio-api-key", { required: true })
  core.setSecret(API_KEY) // makes sure the key won't ever be leaked in the logs
  const AUTH_HEADERS = { headers: { "Authorization": `Bearer ${API_KEY}` } }

  // parse the git tag that triggered this action
  const GIT_TAG = process.env.GITHUB_REF_NAME
  let tag = GIT_TAG
  if(tag.startsWith("v")) {
    tag = tag.slice(1)
  }
  core.debug(`parsed tag: ${tag}`)

  // ensure the version in info.json matches the tag version
  const info = JSON.parse(readFileSync("info.json", 'utf8'))
  if(info.version !== tag) {
    core.setFailed(`version in info.json (${info.version}) does not match tag version (${tag})! did you forget to update info.json?`)
    return
  }
  core.debug(`parsed info.json: ${info}`)

  // ensure a release for this version doesn't already exist on the mod portal
  let res = await axios.get(`https://mods.factorio.com/api/mods/${info.name}`)
  //if (res.status !== 200 || res.data === null) { return core.setFailed(`mod api request failed: ${res}`) }
  if(res.data.releases.find(release => release.version === info.version)) {
    core.warning(`a release for ${info.name} version ${info.version} already exists on the mod portal; skipped uploading this version`)
    return
  }
  core.debug(`existing release check: ${res.data}`)
  console.log(`a release for version ${info.version} doesn't exist; proceeding with upload`)

  // create the .zip of the mod using git archive to allow customizing what gets put into the .zip
  //git archive --prefix "${NAME}_$INFO_VERSION/" -o "/github/workspace/${NAME}_$INFO_VERSION.zip" "${GIT_TAG}"
  const filename = `${process.env.GITHUB_WORKSPACE}/${info.name}_${info.version}.zip`
  exec(`git archive --prefix "${info.name}/" -o "${filename}" "${GIT_TAG}"`)

  // get an upload URL for the mod
  //curl -s -d "mod=${NAME}" -H "Authorization: Bearer ${FACTORIO_MOD_API_KEY}" https://mods.factorio.com/api/v2/mods/releases/init_upload
  res = await axios.post("https://mods.factorio.com/api/v2/mods/releases/init_upload", `mod=${info.name}`, AUTH_HEADERS)
  if(res.data.error) {
    core.setFailed(`getting an upload URL failed: ${res.status} | ${res.data}`)
    return
  }
  core.debug(`got upload url: ${res.data}`)

  // upload the file
  const form = new FormData()
  form.append("file", createReadStream(filename))
  res = await axios.post(res.data.upload_url, form, AUTH_HEADERS)
  if(res.data.error) {
    core.setFailed(`uploading the mod failed: ${res.status} | ${res.data}`)
    return
  }
  core.debug(`uploaded mod: ${res.data}`)

  console.log(`upload of ${info.name} version ${info.version} succeeded!`)
}

try {
  run()
} catch(e) {
  core.setFailed(`running action failed: ${e}`)
}