module.exports = function parameters (model, newParams) {
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
