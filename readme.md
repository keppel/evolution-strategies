## evolution-strategies
distributed parameter optimization through natural evolution strategies

### usage
minimal example:

`worker.js`:
```js
let { worker } = require('evolution-strategies')

worker({
  master: 'http://localhost:3001',
  initialParameters: [1, 1, 1],
  fitness: (params, report) => {
    /*
      params: array of numbers whose fitness this function should evaluate
      report: callback to report the fitness of this set of parameters. higher = better
    */
    let score = 0
    params.forEach(param => {
      score -= Math.abs(param - 42) // punish fitness based on each parameter's distance from 42.
    })
    report(score)
  }
})
```

`master.js`:
```js
let { master } = require('evolution-strategies')

master({
  alpha: 0.2,
  sigma: 0.1
})(3001) // port or http/https server to bind to
```

that's it! run `node master.js`, and then you can run `node worker.js` on as many machines as you'd like to linearly speed up the optimization.

### other options

#### worker(opts)
properties on `opts`:
- `master`: string. required. url for master server.
- `syncEpisodes`: boolean. optional, default: `true`. if set to false, episodes will start as soon as they end, rather than waiting for the other workers to complete their episodes. you'll get stale updates to your parameters, but for some environments (especially realtime environments) this still seems to work.
- `initialParameters`: array. required. numbers representing the initial state of the parameters you're trying to optimize. make sure these are the same for all workers!
- `fitness`: function. required. see example above, this is how you evaluate your parameters.
- `optimizer`: string. optional, default: 'adam'. which optimizer to use; currently supports 'adam' or 'sgd'

#### master(opts)
properties on `opts`:
- `alpha`: number. optional, default: 0.01. basically your stepsize / learning rate.
- `sigma`: number. optional, default: 0.1. variance for trial parameters in fitness function.
- `blockSize`: number or function. optional, default: `n => n`. how many episodes to run between parameter updates. if it's a function, it's passed the number of workers currently online.
