## nes.js

### usage
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
  sigma: 0.1,
  blockSize: 10
})(3001) // port or http/https server to bind to
```

that's it! run `node master.js`, and then you can run `node worker.js` on as many machines as you'd like to linearly speed up the optimization.
