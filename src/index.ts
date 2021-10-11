import * as library from './library'
import { absPath, runMain } from './shared'

if (require.main === module) {
  runMain(async () => {
    await library.populate(absPath('out/library.db'))
  })
}

export { library }
