let { Linear, Sequential, ReLU } = require('weblearn')
let ndarray = require('ndarray')
let Env = require('./env.js')
let ES = require('../')
let argmax = require('../lib/argmax.js')
let softmax = require('../lib/softmax.js')
let stdev = require('standard-deviation')
let socket = require('socket.io-client').connect('http://localhost:3001')
let seedrandom = require('seedrandom')

// seed Math.random globally so the network initializes the same way for every worker
seedrandom('seed', { global: true })

const sigma = 0.1
const alpha = 0.01

function parameters (model, newParams) {
  if (newParams) {
    let paramIndex = 0
    model.layers.forEach(layer => {
      if (layer.weight && layer.weight.data.length) {
        layer.weight.data = newParams.slice(paramIndex, paramIndex + layer.weight.data.length)
        paramIndex += layer.weight.data.length
      }
      if (layer.bias && layer.bias.data.length) {
        layer.bias.data = newParams.slice(paramIndex, paramIndex + layer.bias.data.length)
        paramIndex += layer.bias.data.length
      }
    })
  } else {
    let paramVector = []
    model.layers.forEach(layer => {
      if (layer.weight) {
        paramVector = paramVector.concat(layer.weight.data)
      }
      if (layer.bias) {
        paramVector = paramVector.concat(layer.bias.data)
      }
    })

    return paramVector
  }
}

let opts = {}
let policy = Sequential(opts)

policy.add(Linear(4, 20))
policy.add(ReLU())
policy.add(Linear(20, 2))

let { sample, getNoiseIndex } = ES.noise(0)
let numParams = parameters(policy).length
let bufferedUpdateVector = Array(numParams).fill(0)
socket.on('block', block => {
  let rewards = block.map(ep => ep.reward)
  let mean = rewards.reduce((a, b) => a + b) / rewards.length
  let std = stdev(rewards) || 0.000001
  let normalizedReturns = rewards.map((r, k) => (r - mean) / std)

  block.forEach(({reward, noiseIndex}, k) => {
    // reconstruct the perturbation from the noise index
    let noiseVector = sample(noiseIndex, numParams)
    // multiply it by the normalized return
    let gradient = noiseVector.map(v => v * normalizedReturns[k])
    // add gradient to the update buffer, applied at end of episode
    gradient.forEach((grad, index) => {
      bufferedUpdateVector[index] += grad
    })
  })
})

function getAndApplyNoiseVector (policy) {
  let noiseIndex = getNoiseIndex()
  let noiseVector = sample(noiseIndex, parameters(policy).length)
  // multiply noiseVector by sigma, add it to policy parameters
  parameters(policy, parameters(policy).map((p, k) => p + (noiseVector[k] * sigma)))
  return noiseIndex
}

function removeNoise (policy, noiseIndex) {
  let noiseVector = sample(noiseIndex, parameters(policy).length)
  // multiply noiseVector by sigma, add it to policy parameters
  parameters(policy, parameters(policy).map((p, k) => p - (noiseVector[k] * sigma)))
}

let env = Env('CartPole-v0')
env.on('ready', () => {
  let noiseIndex = getAndApplyNoiseVector(policy)
  let episodeReward = 0
  env.on('observation', ({ observation, reward, done, info }) => {
    if (reward) {
      episodeReward += reward
    }
    if (!done) {
      env.step(act(policy, observation), { render: false })
    } else {
      socket.emit('episode', { reward: episodeReward, noiseIndex})
      env.reset()
      episodeReward = 0

      // calculate new model parameters using update vector
      let newParams = parameters(policy).map((param, k) => param + (bufferedUpdateVector[k] * sigma * alpha))
      parameters(policy, newParams)
      // zero update vector
      for (let i = 0; i < bufferedUpdateVector.length; i++) {
        bufferedUpdateVector[i] = 0
      }
      // remove old noise
      removeNoise(policy, noiseIndex)
      // add some new noise
      noiseIndex = getAndApplyNoiseVector(policy)
    }
  })

  env.reset()
})

function act (policy, observation) {
  let output = policy.forward(observation)
  let actionProbs = softmax(output).data
  let action = getRandomItem(Object.keys(actionProbs).map(Number), actionProbs)
  return action
}

function rand (min, max) {
  return Math.random() * (max - min) + min
}

function getRandomItem (list, weight) {
  const totalWeight = weight.reduce(function (prev, cur, i, arr) {
    return prev + cur
  })

  const randomNum = rand(0, totalWeight)
  let weightSum = 0

  for (let i = 0; i < list.length; i++) {
    weightSum += weight[i]
    weightSum = +weightSum.toFixed(2)

    if (randomNum <= weightSum) {
      return list[i]
    }
  }
}
