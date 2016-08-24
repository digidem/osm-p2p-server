/*!
 * Adapted from http-errors
 * https://github.com/jshttp/http-errors/blob/master/index.js
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var statuses = require('statuses')
var inherits = require('inherits')
var customErrors = require('./error_defs.json')

/**
 * Module exports.
 * @public
 */

module.exports = createError
module.exports.HttpError = createHttpErrorConstructor()

// Populate exports for all constructors
populateConstructorExports(module.exports, customErrors, module.exports.HttpError)

/**
 * Create a new HTTP Error.
 *
 * @returns {Error}
 * @public
 */

function createError () {
  // so much arity going on ~_~
  var err
  var msg
  var status = 500
  var props = {}
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i]
    if (arg instanceof Error) {
      err = arg
      status = err.status || err.statusCode || status
      continue
    }
    switch (typeof arg) {
      case 'string':
        msg = arg
        break
      case 'number':
        status = arg
        break
      case 'object':
        props = arg
        break
    }
  }

  if (typeof status !== 'number' || !statuses[status]) {
    status = 500
  }

  // constructor
  var HttpError = createError[status]

  if (!err) {
    // create error
    err = HttpError
      ? new HttpError(msg)
      : new Error(msg || statuses[status])
    Error.captureStackTrace(err, createError)
  }

  if (!HttpError || !(err instanceof HttpError)) {
    // add properties to generic error
    err.expose = status < 500
    err.status = err.statusCode = status
  }

  for (var key in props) {
    if (key !== 'status' && key !== 'statusCode') {
      err[key] = props[key]
    }
  }

  return err
}

/**
 * Create HTTP error abstract base class.
 * @private
 */

function createHttpErrorConstructor () {
  function HttpError () {
    throw new TypeError('cannot construct abstract class')
  }

  inherits(HttpError, Error)

  return HttpError
}

/**
 * Create a constructor for a client error.
 * @private
 */

function createClientErrorConstructor (HttpError, name, template, code) {
  var className = name.match(/Error$/) ? name : name + 'Error'

  function ClientError () {
    var args = Array.prototype.slice.call(arguments)
    var err
    if (args[0] instanceof Error) {
      err = args[0]
    } else {
      err = new Error(sprintf(template, args))
    }

    // capture a stack trace to the construction point
    Error.captureStackTrace(err, ClientError)

    // adjust the [[Prototype]]
    Object.setPrototypeOf(err, ClientError.prototype)

    // redefine the error name
    Object.defineProperty(err, 'name', {
      enumerable: false,
      configurable: true,
      value: className,
      writable: true
    })

    return err
  }

  inherits(ClientError, HttpError)

  ClientError.prototype.status = code
  ClientError.prototype.statusCode = code
  ClientError.prototype.expose = true

  return ClientError
}

/**
 * Create a constructor for a server error.
 * @private
 */

function createServerErrorConstructor (HttpError, name, template, code) {
  var className = name.match(/Error$/) ? name : name + 'Error'

  function ServerError () {
    var args = Array.prototype.slice.call(arguments)
    var err
    if (args[0] instanceof Error) {
      err = args[0]
    } else {
      err = new Error(sprintf(template, args))
    }

    // capture a stack trace to the construction point
    Error.captureStackTrace(err, ServerError)

    // adjust the [[Prototype]]
    Object.setPrototypeOf(err, ServerError.prototype)

    // redefine the error name
    Object.defineProperty(err, 'name', {
      enumerable: false,
      configurable: true,
      value: className,
      writable: true
    })

    return err
  }

  inherits(ServerError, HttpError)

  ServerError.prototype.status = code
  ServerError.prototype.statusCode = code
  ServerError.prototype.expose = false

  return ServerError
}

/**
 * Populate the exports object with constructors for osm-p2p custom errors.
 * @private
 */

function populateConstructorExports (exports, errors, HttpError) {
  Object.keys(errors).forEach(function (name) {
    var CodeError
    var code = errors[name].code
    var message = errors[name].message

    switch (String(code).charAt(0)) {
      case '4':
        CodeError = createClientErrorConstructor(HttpError, name, message, code)
        break
      case '5':
        CodeError = createServerErrorConstructor(HttpError, name, message, code)
        break
    }

    if (CodeError) {
      // export the constructor
      exports[name] = CodeError
    }
  })
}

/**
 * @param  {String} template
 * @param  {String[]} values
 * @return {String}
 */
function sprintf (template, values) {
  return template.replace(/%s/g, function () {
    return values.shift() || ''
  }).replace(/ {2}/g, ' ').trim() + (values.length && '\n' + values.join('\n'))
}
