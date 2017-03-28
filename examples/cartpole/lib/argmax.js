function indexOfMax (arr) {
  if (arr.length === 0) {
    return -1
  }

  let max = arr[0]
  let maxIndex = 0

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      maxIndex = i
      max = arr[i]
    }
  }

  return maxIndex
}

module.exports = function argmax (nd) {
  return indexOfMax(nd.data)
}
