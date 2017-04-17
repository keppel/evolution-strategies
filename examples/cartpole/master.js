let { master } = require('../../')

let m = master({
  alpha: 0.01,
  sigma: 0.1,
  savePath: 'model.json',
  blockSize: n => n
})(3001)
