const hapiJwt = require('hapi-auth-jwt2')
const jwt = require('jsonwebtoken')
const JWT_SECRET_KEY = require('../../../config/key')
const Knex = require('../../../config/knex')
const Boom = require('boom')
const pass = require('../../lib/password')
const redis = require('redis')
const aguid = require('aguid')
const client = redis.createClient()

const register = function register (server, options, next) {
  server.register(hapiJwt)

  client.on('error', function (err) {
    console.log('Error ' + err)
  })
  var validate = function (decoded, request, callback) {
        // console.log(" - - - - - - - DECODED token:");
        // console.log(decoded);
        // do your checks to see if the session is valid
    client.get(decoded.id, function (err, reply) {
            /* istanbul ignore if */
      if (err) {
        console.log(err)
      }
            // console.log(' - - - - - - - REDIS reply - - - - - - - ', reply);
      var session
      if (reply) {
        session = JSON.parse(reply)
      } else { // unable to find session in redis ... reply is null
        return callback(err, false)
      }

      if (session.valid === true) {
        return callback(err, true)
      } else {
        return callback(err, false)
      }
    })
  }

  server.auth.strategy('jwt', 'jwt', {
    key: JWT_SECRET_KEY,
    validateFunc: validate,
    verifyOptions: {
      algorithms: ['HS256'],
      expiresIn: '1h'
      // ignoreExpiration: false
    }

  })

  server.route({
    path: '/auth',
    config: {
      auth: false
    },
    method: 'POST',
    handler: (request, reply) => {
            // console.log(request.payload)
      let username = request.payload.username
      let password = request.payload.password
      let passid = '1778'
      pass.hash(passid, (data) => {
        console.log(data)
      })
      Knex.table('users').where(
                'username', request.payload.username
            ).select('*').then(([user]) => {
                // console.log(user)
              if (!user) {
                return reply(Boom.unauthorized('Invalid User'))
              }

              pass.validate(password, user.password, (res) => {
                if (res) {
                  var session = {
                    valid: true, // this will be set to false when the person logs out
                    username: username,
                    scope: user.type,
                    id: aguid() // a random session id
                    // exp: new Date().getTime() + 10 * 60 * 1000 // expires in 10 minutes time
                  }
                  client.set(session.id, JSON.stringify(session))
                  const token = jwt.sign(session, JWT_SECRET_KEY)
                  reply({
                    token: token,
                    user: user.username,
                    scope: user.type
                  })
                } else {
                  return reply(Boom.unauthorized('Invalid Credential'))
                }
              })
            }).catch((err) => {
              console.log(err)
              return reply(Boom.serverUnavailable('unavailable'))
            })
    }
  })
  next()
}

register.attributes = {
  name: 'auth-wrapper',
  version: '0.0.1'
}

module.exports = register
