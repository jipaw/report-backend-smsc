module.exports = {
  server: {
    app: {
      slogan: 'NSMSC SERVER'
    }
  },
  connections: [{
    port: 10900,
    routes: { cors: {
      origin: ['*'],
      additionalHeaders: ['cache-control']
    }},
    labels: ['api-http']
  }
  ],
  registrations: [
    {
      plugin: 'inert',
      options: {
        select: ['api-http']
      }
    },
    {
      plugin: {
        register: 'good',
        options: {
          reporters: {
            myConsoleReport: [{
              module: 'good-squeeze',
              name: 'Squeeze',
              args: [{
                log: ['error', 'warn'],
                response: '*'
              }]
            },
            {
              module: 'good-console',
              args: [{ format: 'YYYY/MM/DD HH-mm-ss' }]
            },
              'stdout'
            ]
          }
        }
      }
    },
    {
      plugin: './module/auth/auth',
      options: {
        select: ['api-http']
      }
    },
    {
      plugin: './module/main/index',
      options: {
        select: ['api-http']
      }
    },
    {
      plugin: './module/ip_filter/ipfilter',
      options: {
        select: ['api-http']
      }
    }
  ]
}
