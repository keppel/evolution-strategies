const request = require('superagent')
const gymHost = 'http://localhost:5000/v1'
const { EventEmitter } = require('events')
const ndarray = require('ndarray')
const old = require('old')

class Env extends EventEmitter {
  constructor (envId) {
    super()
    request.post(`${gymHost}/envs/`)
      .send({env_id: envId})
      .end((err, res) => {
        this.instanceId = res.body.instance_id
        request.get(`${gymHost}/envs/${this.instanceId}/action_space`)
          .end((err, res) => {
            this.actionSpace = res.body.info
            request.get(`${gymHost}/envs/${this.instanceId}/observation_space`)
                .end((err, res) => {
                  this.observationSpace = res.body.info
                  this.emit('ready')
                })
          })
      })
  }

  reset () {
    request.post(`${gymHost}/envs/${this.instanceId}/reset/`)
      .end((err, res) => {
        let {observation, reward, info, done} = res.body
        observation = ndarray(observation)
        this.emit('observation', {observation, reward, info, done})
      })
  }

  step (action, {render = false}) {
    setTimeout(() => {
      request.post(`${gymHost}/envs/${this.instanceId}/step/`)
      .send({action, render})
      .end((err, {body}) => {
        let {observation, reward, info, done} = body
        observation = ndarray(observation)
        this.emit('observation', {observation, reward, info, done})
      })
    }, Math.random() * 0)
  }
}

module.exports = old(Env)
