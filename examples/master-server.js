let io = require('socket.io')(3001)

let blocks = [[]]
const blockSize = 5
let totalReward = 0
let totalEpisodes = 0
io.on('connection', socket => {
  // when worker connects, send them the entire history so far
  blocks.forEach((block, index) => {
    if (index < blocks.length - 1) {
      socket.emit('block', block)
    }
  })

  // when worker reports an episode, add it to the current batch
  socket.on('episode', ({ reward, noiseIndex }) => {
    totalReward += reward
    totalEpisodes++
    blocks[blocks.length - 1].push({ reward, noiseIndex })
    if (blocks[blocks.length - 1].length === blockSize) {
      // full block, commit it to history and send it out.
      io.sockets.emit('block', blocks[blocks.length - 1])
      blocks.push([])
      console.log(`average reward: ${totalReward / totalEpisodes}`)
    }
  })
})
