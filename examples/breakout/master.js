let { master } = require('../../')

let m = master({
  alpha: 0.1,
  sigma: 0.1,
  blockSize: n => n
})(3001)
