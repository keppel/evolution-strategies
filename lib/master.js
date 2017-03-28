let io = require('socket.io')()

module.exports = (opts = {}) => {
  let blocks = [[]]

  let blockSize
  if (typeof opts.blockSize === 'number') {
    blockSize = (n) => opts.blockSize
  } else if (typeof opts.blockSize === 'function') {
    blockSize = opts.blockSize
  } else {
    blockSize = (n) => n
  }

  let sigma = opts.sigma || 0.1
  let alpha = opts.alpha || 0.01
  let totalReward = 0
  let smoothAverage = 0
  let totalEpisodes = 0
  io.on('connection', socket => {
    // when worker connects, send them the entire history so far

    socket.emit('initialize', {
      blocks: blocks.slice(0, blocks.length - 2),
      hyperparameters: {
        sigma: sigma,
        alpha: alpha
      }
    })

    // when worker reports an episode, add it to the current batch
    socket.on('episode', ({ reward, noiseIndex }) => {
      totalReward += reward
      totalEpisodes++
      blocks[blocks.length - 1].push({ reward, noiseIndex })
      if (blocks[blocks.length - 1].length >= blockSize(io.engine.clientsCount)) {
        // full block, commit it to history and send it out.
        io.sockets.emit('block', blocks[blocks.length - 1])
        let blockAverage = blocks[blocks.length - 1].map(x => x.reward).reduce((a, b) => a + b) / blocks[blocks.length - 1].length
        smoothAverage = (0.05 * blockAverage) + (0.95 * smoothAverage)
        console.log('score: ' + smoothAverage)
        blocks.push([])
      }
    })
  })

  return server => {
    io.listen(server)
  }
}
