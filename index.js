let gaussian = require('gaussian')
let seedrandom = require('seedrandom')

exports.noise = seed => {
  let distribution = gaussian(0, 1) // standard normal

  return {
    sample (index, length) {
      let noiseVector = []
      for (let i = 0; i < length; i++) {
        noiseVector.push(distribution.ppf(seedrandom(seed + i + index)()))
      }
      return noiseVector
    },

    getNoiseIndex() {
      return Math.floor(Math.random() * 100000000)
    }
  }
}
