'use strict'

const { promisify } = require('util')
const sleep = promisify(setTimeout)

function closeWithGrace (opts, fn) {
  if (typeof opts === 'function') {
    fn = opts
    opts = {}
  }
  const delay = opts.delay ? opts.delay : 10000
  process.once('SIGTERM', onSignal)
  process.once('SIGINT', onSignal)
  process.once('uncaughtException', onError)
  process.once('unhandledRejection', onError)

  const sleeped = Symbol('sleeped')

  function onSignal (signal) {
    run({ signal })
  }

  function afterFirstSignal (signal) {
    console.error(`second ${signal}, exiting`)
    process.exit(1)
  }

  function onError (err) {
    run({ err })
  }

  function afterFirstError (err) {
    console.error('second error, exiting')
    console.error(err)
    process.exit(1)
  }

  async function run (out) {
    process.on('SIGTERM', afterFirstSignal)
    process.on('SIGINT', afterFirstSignal)
    process.on('uncaughtException', afterFirstError)
    process.on('unhandledRejection', afterFirstError)

    try {
      const res = await Promise.race([
        // We create the timer first as fn
        // might block the event loop
        sleep(delay, sleeped),
        fn(out)
      ])

      console.error(res)
      if (res === sleeped || out.err) {
        process.exit(1)
      } else {
        process.exit(0)
      }
    } catch (err) {
      console.error(err)
      process.exit(1)
    }
  }
}

module.exports = closeWithGrace
