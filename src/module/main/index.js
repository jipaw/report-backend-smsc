const Path = require('path')
const Knex = require('../../../config/knex')
const moment = require('moment')
const Boom = require('boom')

exports.register = (server, options, next) => {
  server.route([{
    method: 'POST',
    config: {
      auth: 'jwt'
    },
    path: '/dashboard',
    handler: (request, reply) => {
      console.log(request.payload)
      let startDate = moment().format('YYYY-MM-DD') + ' 00:00:00'
      let endDate = moment().format('YYYY-MM-DD HH:mm:ss')
      Knex('users').select('*').where('username', request.auth.credentials.username).then(([user]) => {
        Knex('inbox_http').count('in_seq as total').where('in_stat', '=', 2).andWhere('user_name', request.auth.credentials.username).whereBetween('in_time', [startDate, endDate]).then(([result]) => {
          var count = result.total
          Knex.raw('SELECT COUNT(in_seq) as request, COUNT(IF(in_stat= ? ,1,null)) AS pending, COUNT(IF(in_stat= ? ,1,null)) as success FROM in_http_read WHERE user_name = ? AND in_time BETWEEN ? AND ?', [2, 4, request.auth.credentials.username, startDate, endDate]).then(([result]) => {
            const data = {
              title: 'Dashboard Page',
              username: user.username,
              sms_balance: user.token,
              sms_pending: result[0].pending + count,
              sms_request: result[0].request,
              sms_success: result[0].success,
              sms_failed: result[0].failed || 0
            }
            console.log(data)
            reply(data)
            return null
          }).catch((e) => {
            reply(Boom.gatewayTimeout())
          })
          return null
        }).catch((e) => console.error(e))
        return null
      }).catch((e) => console.error(e))
    }
  },
  {
    method: 'POST',
    config: {
      auth: 'jwt'
    },
    path: '/get-data',
    handler: (request, reply) => {
      console.log(request.payload)
      let startDate = moment(request.payload.startDate).format('YYYY-MM-DD') + ' 00:00:00'
      let endDate = moment(request.payload.endDate).format('YYYY-MM-DD') + ' 23:59:59'
      Knex.from('users').where('username', request.auth.credentials.username).select('token', 'name').then(([user]) => {
        Knex('inbox_http').count('in_seq as total').where('in_stat', '=', 2).andWhere('user_name', request.auth.credentials.username).whereBetween('in_time', [startDate, endDate]).then(([result]) => {
          var count = result.total
          Knex.raw('SELECT COUNT(in_seq) as request, COUNT(IF(in_stat= ? ,1,null)) AS pending, COUNT(IF(in_stat= ? ,1,null)) as success FROM in_http_read WHERE user_name = ?', [2, 4, request.auth.credentials.username]).then(([result]) => {
            const data = {
              sms_pending: result[0].pending + count,
              sms_request: result[0].request || 0,
              sms_success: result[0].success || 0,
              sms_failed: result[0].failed || 0
            }
            console.log(data)
            reply(data)
          }).catch((e) => console.error(e))
          return null
        }).catch((e) => console.error(e))
        return null
      }).catch((e) => console.error(e))
    }
  },
  {
    method: 'POST',
    config: {
      auth: 'jwt'
    },
    path: '/graph/daily',
    handler: (request, reply) => {
      console.log(request.payload)
      const { startDate } = request.payload
      const { username } = request.auth.credentials
      Knex('sms_record').where('user_name', username).andWhere('count_date', startDate).select('*').then((result) => {
        // console.log(result)
        let labels = []
        let series = []
        let items = []
        let trequest = []
        let success = []
        let failed = []
        for (let j = 0; j < result.length; j++) {
          let countTime = result[j].count_time.slice(0, 5)
          let objA = {
            count_time: countTime,
            success: result[j].success,
            failed: result[j].failed,
            request: result[j].request
          }
          items.push(objA)
          labels.push(countTime)
          trequest.push(result[j].request)
          success.push(result[j].success)
          failed.push(result[j].failed)
        }
        series.push(success, failed)
        const data = {
          labels: labels,
          series: series,
          items: items
        }
        console.log(data)
        reply(data)
      })
    }
  },
  {
    method: 'POST',
    config: {
      auth: 'jwt'
    },
    path: '/graph/monthly',
    handler: (request, reply) => {
      console.log(request.payload)
      const { month } = request.payload
      let data = month.toString()
      if (data.length === 1) { data = '0' + data }
      const { username } = request.auth.credentials
      const startDate = moment().format('YYYY') + '-' + data
      Knex('sms_record').where({user_name: username, count_time: '0'}).andWhere('count_date', 'like', '%' + startDate + '%').select('*').then((result) => {
        // console.log(result)
        let labels = []
        let series = []
        let items = []
        let trequest = []
        let success = []
        let failed = []
        for (let j = 0; j < result.length; j++) {
          let countDate = result[j].count_date.slice(8, 10)
          let objA = {
            count_date: countDate,
            success: result[j].success,
            failed: result[j].failed,
            request: result[j].request
          }
          items.push(objA)
          labels.push(countDate)
          trequest.push(result[j].request)
          success.push(result[j].success)
          failed.push(result[j].failed)
        }
        series.push(success, failed)
        const data = {
          labels: labels,
          series: series,
          items: items
        }
        console.log(data)
        reply(data)
      })
    }
  },
  {
    method: 'GET',
    config: {
      auth: 'jwt'
    },
    path: '/inbox',
    handler: (request, reply) => {
      console.log(request.query)
      let startDate = moment(request.query.startDate).format('YYYY-MM-DD') || moment().format('YYYY-MM-DD')
      let endDate = moment(request.query.endDate).format('YYYY-MM-DD') || moment().format('YYYY-MM-DD')
      let username = request.auth.credentials.username
      let query = request.query.query || ''
      let page = parseInt(request.query.limit)
      let orderBy = request.query.orderBy
      let ascending = parseInt(request.query.ascending)
      let limit = (parseInt(request.query.page) - 1) * parseInt(request.query.limit)
      // byColumn = request.query.byColumn,
      let order
      startDate = startDate + ' 00:00:00'
      endDate = endDate + ' 23:59:59'
      ascending ? order = 'ASC' : order = 'DESC'
      console.log(order)
      Knex('in_http_read').count('in_seq').then(([result]) => {
        var count = result['count(`in_seq`)']
        console.log(Knex('in_http_read').where('user_name', username).andWhere('destination', 'like', '%' + query + '%').orderBy(orderBy, order).limit(page).offset(limit).select('in_seq', 'destination', 'message', 'in_time', 'trx_id').toString())
        Knex('in_http_read').where('user_name', username).andWhere('destination', 'like', '%' + query + '%').whereBetween('in_time', [startDate, endDate]).orderBy(orderBy, order).limit(page).offset(limit).select('in_seq', 'destination', 'message', 'in_time', 'trx_id').then((result) => {
          // console.log(result)
          let resp = []
          let response = []
          let numTotal = parseInt(request.query.page) * parseInt(request.query.limit)
          let startNumber = numTotal - parseInt(request.query.limit) + 1
          for (let i = startNumber; i <= numTotal && i <= count; i++) {
            let Obj = {
              num: i
            }
            resp.push(Obj)
          }
          for (let i = 0; i < result.length; i++) {
            let ObjResponse = {
              in_seq: resp[i].num,
              destination: result[i].destination,
              message: result[i].message,
              in_time: moment(result[i].in_time).format('YYYY-MM-DD HH:mm:ss'),
              trx_id: result[i].trx_id
            }
            response.push(ObjResponse)
          }
          console.log(resp)
          let payload = {
            data: response,
            count: count
          }
          reply(payload)
        })
      })
    }
  },
  {
    method: 'GET',
    config: {
      auth: 'jwt'
    },
    path: '/logout',
    handler: (request, reply) => {
      console.log(request.auth)
        // request.cookieAuth.clear();
        // return reply.redirect('login');
    }
  },
  {
    method: 'GET',
    path: '/assets/{param*}',
    config: {
      description: 'Catch all assets file',
      auth: false,
      handler: {
        directory: {
          path: Path.join(__dirname, '../../../public/assets/'),
          listing: false,
          index: true
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/{p*}',
    config: {
      description: 'Catch all route to index.html',
      auth: false,
      handler: function (request, reply) {
        reply.file(Path.join(__dirname, '../../../public/index.html'))
      }
    }
  }
  ])

  return next()
}

exports.register.attributes = {
  name: 'admin route',
  version: '1.0.1'
}
