import { promises as fsp } from 'node:fs'
import { build as tsupBuild } from 'tsup'
import { defu } from 'defu'
import { join, relative } from 'pathe'
import fse from 'fs-extra'
import { globby } from 'globby'
import Unimport from 'unimport/unplugin'
import type { CtizenConfig } from './types'
import { cittyImports } from './imports'

const ENTRYPOINT = (conf: CtizenConfig) => {
  const srcDir = join(conf.rootDir, conf.srcDir)
  const commandsDir = join(srcDir, 'commands', '*')
  const paths = globby(commandsDir)
  console.log(paths)
  return `
#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import { description, name, version } from '../package.json'

const main = defineCommand({
  meta: { name, version, description },
  subCommands: {
    dev: () => import('./commands/dev').then(r => r.default),
    build: () => import('./commands/build').then(r => r.default)
  }
})

runMain(main)
`
}

export const prepare = async (conf: CtizenConfig) => {
  await prepareDir(conf.buildDir)
  await fse.ensureFile(join(conf.buildDir, 'index.ts'))
  await fse.writeFileSync(join(conf.buildDir, 'index.ts'), ENTRYPOINT(conf))
}

const prepareDir = async (dir: string) => {
  await fsp.mkdir(dir, { recursive: true })
  await fse.emptyDir(dir)
}

export const build = (conf: CtizenConfig) => {
  const srcDir = join(conf.rootDir, conf.srcDir)
  const commandsDir = join(srcDir, 'commands')

  const tsupConfig = defu(conf.tsup, {})
  const unimportConfig = defu(conf.unimport, {
    dts: true,
    presets: [...cittyImports],
    dirs: [relative('.', join(commandsDir, '*'))]
  })

  return tsupBuild({
    ...tsupConfig,

    esbuildPlugins: [
      Unimport.esbuild(unimportConfig)
    ]
  })
}
