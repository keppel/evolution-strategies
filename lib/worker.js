let gaussian = require('gaussian')
let seedrandom = require('seedrandom')
let stdev = require('standard-deviation')
let { connect } = require('socket.io-client')
let { EventEmitter } = require('events')
let debug = require('debug')('evolution-strategies:worker')

function sgd(alpha) {
  return (param, gradient, key) => {
    return gradient * alpha
  }
}

function adam(alpha, beta1 = 0.9, beta2 = 0.999, eps = 1e-8) {
  let m = []
  let v = []
  let t = 1
  return (param, gradient, key) => {
    let a = alpha * Math.sqrt(1 - Math.pow(beta2, t)) / (1 - Math.pow(beta1, t))
    m[key] = beta1 * (m[key] || 0) + (1 - beta1) * gradient
    v[key] = beta2 * (v[key] || 0) + (1 - beta2) * Math.pow(gradient, 2)
    if (m[m.length - 1]) {
      if (key === m.length - 1) {
        t++
      }
    }
    return a * m[key] / (Math.sqrt(v[key]) + eps)
  }
}

module.exports = function(opts = {}) {
  let worker = new EventEmitter()
  let {
    master,
    fitness,
    cacheNoise,
    initialParameters,
    syncEpisodes = true
  } = opts
  let { sample, getNoiseIndex } = noise(
    0,
    Math.floor(Math.random() * 10000000000),
    initialParameters.length,
    cacheNoise || false
  )
  let socket = connect(master)
  socket.on('disconnect', process.exit)
  let sigma = 0.1
  let alpha = 0.01
  let optimizer = opts.optimizer === 'sgd' ? sgd : adam

  let blockGradient = _getBlockGradient.bind(
    null,
    initialParameters.length,
    sample
  )
  let applyUpdate

  // snapshot of the best parameters so far. this is what we add noise to before evaluating fitness.
  let headParameters = initialParameters.slice()

  let updateVector = Array(initialParameters.length).fill(0)

  socket.on('initialize', ({ hyperparameters, blocks }) => {
    sigma = hyperparameters.sigma
    alpha = hyperparameters.alpha
    optimizer = optimizer(alpha)
    applyUpdate = _applyUpdate.bind(null, sigma, alpha, optimizer)
    blocks.forEach(block => {
      let gradient = blockGradient(block)
      addVeci(updateVector, gradient)
      applyUpdate(block.length, headParameters, updateVector)
    })
    worker.emit('ready')
  })

  socket.on('block', block => {
    let gradient = blockGradient(block)
    addVeci(updateVector, gradient)
    applyUpdate(block.length, headParameters, updateVector)
    if (syncEpisodes) {
      worker.emit('ready')
    }
  })

  worker.on('ready', () => {
    // ready to start an episode
    // generate some trial parameters
    let noiseIndex = getNoiseIndex()
    let noiseVector = sample(noiseIndex)
    // add the head parameters to the noise vector
    let trialParameters = noiseVector
    mulVeci(trialParameters, sigma)
    addVeci(trialParameters, headParameters)
    // now evaluate the fitness of the trial parameters
    fitness(trialParameters, reward => {
      // this is the reportFitness callback.
      // tell master how these parameters (noiseIndex) scored
      socket.emit('episode', { noiseIndex, reward })
      if (!syncEpisodes) {
        // now do it again! no need to wait.
        worker.emit('ready')
      }
    })
  })

  return worker
}

function addVeci(a, b) {
  // add b to a in-place
  b.forEach((v, k) => {
    a[k] += v
  })
}
function mulVeci(vec, scalar) {
  // multiply each value in vec by a scalar in-place
  vec.forEach((v, k) => {
    vec[k] *= scalar
  })
}

function _applyUpdate(
  sigma,
  alpha,
  optimizer,
  blockSize,
  params,
  updateVector
) {
  // adds updateVector to params in-place, then zeros updateVector
  params.forEach((p, k) => {
    // params[k] += updateVector[k] * alpha / (blockSize * sigma)
    params[k] += optimizer(params[k], updateVector[k], k) / (blockSize * sigma)
    updateVector[k] = 0
  })
}

function _getBlockGradient(numParams, sample, block) {
  let rewards = block.map(ep => ep.reward)
  let mean = rewards.reduce((a, b) => a + b) / rewards.length
  let std = stdev(rewards) || 0.000001
  let normalizedReturns = rewards.map((r, k) => (r - mean) / std)

  let gradients = Array(numParams).fill(0)
  block.forEach(({ reward, noiseIndex }, k) => {
    // reconstruct the perturbation from the noise index
    let noiseVector = sample(noiseIndex, numParams)
    // multiply it by the normalized return
    let gradient = noiseVector.map(v => v * normalizedReturns[k])
    // add gradient to the update buffer, applied at end of episode
    gradient.forEach((grad, index) => {
      gradients[index] += grad
    })
  })

  return gradients
}

let noiseCache = [] // shared by process

function noise(sharedSeed, uniqueSeed, numParams, useCache) {
  let distribution = gaussian(0, 1) // standard normal
  const cacheSize = 1e6
  if (useCache && noiseCache < cacheSize) {
    debug('generating noise cache')
    for (let i = 0; i < cacheSize; i++) {
      let rng = seedrandom(sharedSeed)
      noiseCache.push(distribution.ppf(rng()))
    }
    debug('generated noise (' + cacheSize + ' numbers)')
  } else {
    debug('not caching noise')
  }

  return {
    sample(index) {
      let noiseVector = []
      if (useCache) {
        noiseVector = noiseCache.slice(index, numParams)
      } else {
        for (let i = 0; i < numParams; i++) {
          noiseVector.push(
            distribution.ppf(seedrandom(sharedSeed + i + index)())
          )
        }
      }
      return noiseVector
    },

    getNoiseIndex() {
      return (
        Math.floor(Math.random() * cacheSize + uniqueSeed) %
        (cacheSize - numParams)
      )
    }
  }
}
