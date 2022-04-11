'use strict'

const express = require('express')
const Prometheus = require('prom-client')
const morgan = require('morgan')

const app = express()
const port = process.env.PORT || 8080
const metricsInterval = Prometheus.collectDefaultMetrics()
const checkoutsTotal = new Prometheus.Counter({
  name: 'checkouts_total',
  help: 'Total number of checkouts',
  labelNames: ['payment_method']
})
const httpRequestDurationMicroseconds = new Prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.10, 5, 15, 50, 100, 200, 300, 400, 500]  // buckets for response time from 0.1ms to 500ms
})

// Runs before each requests
app.use((req, res, next) => {
  res.locals.startEpoch = Date.now()
  next()
})
app.use(morgan('tiny'))

app.get('/', (req, res, next) => {
  setTimeout(() => {
    res.json({ message: 'Hello World!' })
    next()
  }, Math.round(Math.random() * 200))
})

app.get('/bad', (req, res, next) => {
  next(new Error('My Error'))
})

app.get('/checkout', (req, res, next) => {
  const paymentMethod = Math.round(Math.random()) === 0 ? 'stripe' : 'paypal'

  checkoutsTotal.inc({
    payment_method: paymentMethod
  })

  res.json({ status: 'ok' })
  next()
})

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', Prometheus.register.contentType)
  res.send(await Prometheus.register.metrics())
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok'})
})

// Error handler
app.use((err, req, res, next) => {
  res.statusCode = 500
  // Do not expose your error in production
  res.json({ error: err.message })
  next()
})

// Runs after each requests
app.use((req, res, next) => {
  // Ignore requests that don't have a route path
  if (req.route === undefined) {
    return next()
  }
  const responseTimeInMs = Date.now() - res.locals.startEpoch

  httpRequestDurationMicroseconds
    .labels(req.method, req.route.path, res.statusCode)
    .observe(responseTimeInMs)

  next()
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
})
