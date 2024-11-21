# GitHub Action to automatically publish to the Factorio mod portal

Builds and publishes tagged releases of a Factorio mod to the Factorio mod portal.

## Usage
This action expects a flat repo structure with exactly one complete mod in the git repo (with a valid info.json in the repo's root).  
It also expects tag names to match the Factorio mod version numbering scheme - three numbers separated by periods, eg. `1.15.0`. Versions prefixed with a "v" will also be processed.  
When a tag is pushed that is valid and matches the version number in info.json, the mod will be zipped up and published to the mod portal using the provided input `factorio-api-key` to authenticate.

An example workflow to publish tagged releases:
```yml
on:
  push:
    tags:
      - '*'
name: Publish to the Factorio mod portal
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Publish mod
      uses: Penguin-Spy/factorio-mod-portal-publish@main
      with:
        factorio-api-key: ${{ secrets.FACTORIO_API_KEY }}
```

The `FACTORIO_API_KEY` secret should be a valid API key generated with the `ModPortal: Upload Mods` usage at https://factorio.com/profile.  
To filter only tags that are prefixed with a "v", change the tags filter to `'v*'`

A valid `.gitattributes` file is required to filter .git*/* directories. This file must be checked in and tagged to filter during a git-archive operation. It should contain the following entries:
```
.gitattributes export-ignore
.gitignore export-ignore
.github export-ignore
```
You should also exclude any other files that are not relevant to the mod running in Factorio. For example, editor configuration files like `.vscode`, `.editorconfig`, etc.

Be aware that the zip will be published and immediately available for download for users - make sure you're ready to publish the changes and have tested the commit before pushing the tag!
