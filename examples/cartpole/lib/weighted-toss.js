function rand (min, max) {
  return Math.random() * (max - min) + min
}

module.exports = function (weight) {
  const totalWeight = weight.reduce(function (prev, cur, i, arr) {
    return prev + cur
  })

  const randomNum = rand(0, totalWeight)
  let weightSum = 0

  for (let i = 0; i < weight.length; i++) {
    weightSum += weight[i]
    weightSum = +weightSum.toFixed(2)

    if (randomNum <= weightSum) {
      return i
    }
  }
}
