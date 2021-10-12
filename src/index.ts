import * as junda from './hanzi/junda'
import * as radical from './hanzi/radical'
import * as library from './library'
import * as tatoeba from './sentence/tatoeba'
import { absPath, runMain } from './shared'
import * as cedict from './vocab/cedict'

if (require.main === module) {
  runMain(async () => {
    await library.populate(absPath('out/library.db'))
    await radical.populate(absPath('out/radical.db'))
    await junda.populate(absPath('out/entry/junda.db'))
    await tatoeba.populate(absPath('out/entry/tatoeba.db'))
    await cedict.populate(absPath('out/entry/cedict.db'))
  })
}

export { library }
