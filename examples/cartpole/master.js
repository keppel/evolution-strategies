let { master } = require('../../')

let m = master({
  alpha: 0.2,
  sigma: 0.1,
  blockSize: n => n * 0.8
})(3001)
