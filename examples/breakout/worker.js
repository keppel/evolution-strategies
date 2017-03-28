let { worker } = require('../../')
let Env = require('./lib/env.js')
let seedrandom = require('seedrandom')
let argmax = require('./lib/argmax.js')
let softmax = require('./lib/softmax.js')
let weighted = require('./lib/weighted-toss.js')
let convnetjs = require('./lib/convnet.js')

let env = Env(process.argv[2] || 'CartPole-v0')

let net = new Net()
let layers = [
  { type: 'input', out_sx: 1, out_sy: 1, out_depth: 10 },
  { type: 'fc', out_sx: 1, out_sy: 1, out_depth: 10 }
]
net.makeLayers(layers)
console.log(net.forward([1, 1]))

env.on('ready', () => {
  let numActions = env.actionSpace.n
  let continuousActions = false
  if (!numActions) {
    continuousActions = true
    numActions = env.actionSpace.shape[0]
  }
  let numInputs = env.observationSpace.shape[0]

  // seed random globally for a sec so we get the same parameter initialization.
  // kind of hacky, I know.
  let unseed = Math.random()
  seedrandom('seed', { global: true })

  // we use a neural network to parameterize the policy we're optimizing.

  console.log(net)

  seedrandom(unseed, { global: true })
  worker({
    master: 'http://localhost:3001',
    initialParameters: parameters(policy),
    fitness: (params, report) => {
      // set policy network's parameters to the ones the worker has been assigned to evaluate.
      parameters(policy, params)
      let totalReward = 0
      env.on('observation', ({ observation, reward, done, info }) => {
        totalReward += reward || 0
        if (done) {
          env.removeAllListeners('observation')
          report(totalReward)
        } else {
          if (continuousActions) {
            console.log(policy.forward(observation).data.map(Math.tanh))
            env.step(policy.forward(observation).data.map(Math.tanh), { render: process.argv.length === 4 })
          } else {
            // deterministic policy:
            env.step(argmax(policy.forward(observation)), { render: process.argv.length === 4 })
            // stochastic policy:
            // env.step(weighted(softmax(policy.forward(observation)).data), { render: process.argv.length === 4 })
          }
        }
      })
      env.reset()
    }
  })
})
