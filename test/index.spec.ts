import { beforeEach, describe, expect, it, vi } from 'vitest'
import express, { NextFunction, Request, Response, Application } from 'express'
import request from 'supertest'

import { CCIPHandler, type FunctionHandler } from '../src'
import { Hex, encodeFunctionData, namehash, parseAbiItem } from 'viem'


describe('CCIP Handler', async () => {
  let app: Application

  beforeEach(() => {
    app = express()
  })

  describe('GET request', async () => {
    describe('single handler', () => {
      it('valid call with no middleware', async () => {
        const handler: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key } = res.locals
              res.json({ node, key })
            }
          ]
        }

        app.use(CCIPHandler([handler]))

        const expected = { node: namehash('blockful.eth'), key: 'blockful' }

        const calldata = encodeFunctionData({
          abi: [parseAbiItem(handler.signature)],
          functionName: 'text',
          args: Object.values(expected) as [Hex, string]
        })

        const response = await request(app)
          .get(`/0x12345/${calldata}.json`)
          .set('Accept', 'application/json')

        expect(response.body).toEqual(expected)
      })

      it('invalid call with no middleware', async () => {
        const handler: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key } = res.locals
              res.json({ node, key })
            }
          ]
        }

        app.use(CCIPHandler([handler]))

        const calldata = encodeFunctionData({
          abi: [parseAbiItem('function text(uint32 num)')],
          functionName: 'text',
          args: [2]
        })

        const response = await request(app)
          .get(`/0x12345/${calldata}.json`)
          .set('Accept', 'application/json')

        expect(response.status).toEqual(404)
      })

      it('valid call with non-blocking prior middleware', async () => {
        let spy = {
          middleware: (_: Request, res: Response, next: NextFunction) => {
            next()
          }
        }

        vi.spyOn(spy, 'middleware')

        const handlerSpy = (_: Request, res: Response, __: NextFunction) => {
          const { node, key } = res.locals
          res.json({ node, key })
        }

        const handler: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, handlerSpy]
        }

        app.use(CCIPHandler([handler]))

        const expected = { node: namehash('blockful.eth'), key: 'blockful' }

        const calldata = encodeFunctionData({
          abi: [parseAbiItem(handler.signature)],
          functionName: 'text',
          args: Object.values(expected) as [Hex, string]
        })

        const response = await request(app)
          .get(`/0x12345/${calldata}.json`)
          .set('Accept', 'application/json')

        expect(response.body).toEqual(expected)
        expect(spy.middleware).toHaveBeenCalledOnce()
      })

      it('valid call with blocking prior middleware', async () => {
        const expected = { message: 'blocking call' }

        let spy = {
          middleware: (_: Request, res: Response, next: NextFunction) => {
            res.status(500).json(expected)
            next(new Error(expected.message))
          }
        }

        vi.spyOn(spy, 'middleware')

        const handlerSpy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }

        vi.spyOn(handlerSpy, 'middleware')

        const handler: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, handlerSpy.middleware]
        }

        const abi: FunctionHandler[] = [
          {
            signature: handler.signature,
            handlers: [
              spy.middleware,
              handlerSpy.middleware
            ]
          }
        ]

        const router = CCIPHandler(abi)
        app.use(router)


        const calldata = encodeFunctionData({
          abi: [parseAbiItem(handler.signature)],
          functionName: 'text',
          args: [namehash('blockful.eth'), 'blockful']
        })

        const response = await request(app)
          .get(`/0x12345/${calldata}.json`)
          .set('Accept', 'application/json')

        expect(spy.middleware).toHaveBeenCalledOnce()
        expect(handlerSpy.middleware).not.toHaveBeenCalledOnce()
        expect(response.status).equal(500)
        expect(response.body).toStrictEqual(expected)
      })
    })

    describe('multiple handlers', () => {
      it('valid call with no middleware', async () => {
        const h1: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key } = res.locals
              res.json({ node, key })
            }
          ]
        }

        const h2: FunctionHandler = {
          signature: 'function setText(bytes32 node, string calldata key, string calldata value)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key, value } = res.locals
              res.json({ node, key, value })
            }
          ]
        }

        app.use(CCIPHandler([h1, h2]))

        const expected = { node: namehash('blockful.eth'), key: 'blockful' }

        const calldata = encodeFunctionData({
          abi: [parseAbiItem(h1.signature)],
          functionName: 'text',
          args: Object.values(expected) as [Hex, string]
        })

        const response = await request(app)
          .get(`/0x12345/${calldata}.json`)
          .set('Accept', 'application/json')

        expect(response.body).toEqual(expected)
      })

      it('invalid call with no middleware', async () => {
        const h1: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key } = res.locals
              res.json({ node, key })
            }
          ]
        }

        const h2: FunctionHandler = {
          signature: 'function setText(bytes32 node, string calldata key, string calldata value)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key, value } = res.locals
              res.json({ node, key, value })
            }
          ]
        }

        app.use(CCIPHandler([h1, h2]))

        const calldata = encodeFunctionData({
          abi: [parseAbiItem('function text(uint32 num)')],
          functionName: 'text',
          args: [10]
        })

        const response = await request(app)
          .get(`/0x12345/${calldata}.json`)
          .set('Accept', 'application/json')

        expect(response.status).toEqual(404)
      })

      it('valid call with non-blocking prior middleware', async () => {
        let spy = {
          middleware: (_: Request, res: Response, next: NextFunction) => {
            next()
          }
        }

        vi.spyOn(spy, 'middleware')

        const h1Spy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }

        vi.spyOn(h1Spy, 'middleware')

        const h1: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, h1Spy.middleware]
        }

        const h2Spy = (_: Request, res: Response, __: NextFunction) => {
          const { node, key } = res.locals
          res.json({ node, key })
        }

        const h2: FunctionHandler = {
          signature: 'function setText(bytes32 node, string calldata key, string calldata value)',
          handlers: [spy.middleware, h2Spy]
        }

        app.use(CCIPHandler([h1, h2]))

        const expected = { node: namehash('blockful.eth'), key: 'blockful' }

        const calldata = encodeFunctionData({
          abi: [parseAbiItem(h1.signature)],
          functionName: 'text',
          args: Object.values(expected) as [Hex, string]
        })

        const response = await request(app)
          .get(`/0x12345/${calldata}.json`)
          .set('Accept', 'application/json')

        expect(response.body).toEqual(expected)
        expect(spy.middleware).toHaveBeenCalledOnce()
        expect(h1Spy.middleware).toHaveBeenCalled()
      })

      it('valid call with blocking prior middleware', async () => {
        const expected = { message: 'blocking call' }

        let spy = {
          middleware: (_: Request, res: Response, next: NextFunction) => {
            res.status(500).json(expected)
            next(new Error(expected.message))
          }
        }

        vi.spyOn(spy, 'middleware')

        const h1Spy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }

        vi.spyOn(h1Spy, 'middleware')

        const h1: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, h1Spy.middleware]
        }

        const h2Spy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }

        vi.spyOn(h2Spy, 'middleware')

        const h2: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, h2Spy.middleware]
        }

        const router = CCIPHandler([h1, h2])
        app.use(router)


        const calldata = encodeFunctionData({
          abi: [parseAbiItem(h1.signature)],
          functionName: 'text',
          args: [namehash('blockful.eth'), 'blockful']
        })

        const response = await request(app)
          .get(`/0x12345/${calldata}.json`)
          .set('Accept', 'application/json')

        expect(spy.middleware).toHaveBeenCalledOnce()
        expect(h1Spy.middleware).not.toHaveBeenCalled()
        expect(h2Spy.middleware).not.toHaveBeenCalled()
        expect(response.status).equal(500)
        expect(response.body).toStrictEqual(expected)
      })
    })
  })

  describe('POST request', async () => {
    describe('single handler', () => {
      it('valid call with no middleware', async () => {
        const handler: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key } = res.locals
              res.json({ node, key })
            }
          ]
        }

        app.use(CCIPHandler([handler]))

        const expected = { node: namehash('blockful.eth'), key: 'blockful' }

        const calldata = encodeFunctionData({
          abi: [parseAbiItem(handler.signature)],
          functionName: 'text',
          args: Object.values(expected) as [Hex, string]
        })

        const response = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            sender: '0x12345',
            data: calldata
          })

        expect(response.status).toEqual(200)
        expect(response.body).toEqual(expected)
      })

      it('invalid call with no middleware', async () => {
        const handler: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key } = res.locals
              res.json({ node, key })
            }
          ]
        }

        app.use(CCIPHandler([handler]))

        const calldata = encodeFunctionData({
          abi: [parseAbiItem('function text(uint32 num)')],
          functionName: 'text',
          args: [2]
        })

        const response = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            sender: '0x12345',
            data: calldata
          })

        expect(response.status).toEqual(404)
      })

      it('valid call with non-blocking prior middleware', async () => {
        let spy = {
          middleware: (_: Request, res: Response, next: NextFunction) => {
            next()
          }
        }

        vi.spyOn(spy, 'middleware')

        const handlerSpy = (_: Request, res: Response, __: NextFunction) => {
          const { node, key } = res.locals
          res.json({ node, key })
        }

        const handler: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, handlerSpy]
        }

        app.use(CCIPHandler([handler]))

        const expected = { node: namehash('blockful.eth'), key: 'blockful' }

        const calldata = encodeFunctionData({
          abi: [parseAbiItem(handler.signature)],
          functionName: 'text',
          args: Object.values(expected) as [Hex, string]
        })

        const response = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            sender: '0x12345',
            data: calldata
          })

        expect(response.body).toEqual(expected)
        expect(spy.middleware).toHaveBeenCalledOnce()
      })

      it('valid call with blocking prior middleware', async () => {
        const expected = { message: 'blocking call' }

        let spy = {
          middleware: (_: Request, res: Response, next: NextFunction) => {
            res.status(500).json(expected)
            next(new Error(expected.message))
          }
        }

        vi.spyOn(spy, 'middleware')

        const handlerSpy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }

        vi.spyOn(handlerSpy, 'middleware')

        const handler: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, handlerSpy.middleware]
        }

        const abi: FunctionHandler[] = [
          {
            signature: handler.signature,
            handlers: [
              spy.middleware,
              handlerSpy.middleware
            ]
          }
        ]

        const router = CCIPHandler(abi)
        app.use(router)


        const calldata = encodeFunctionData({
          abi: [parseAbiItem(handler.signature)],
          functionName: 'text',
          args: [namehash('blockful.eth'), 'blockful']
        })

        const response = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            sender: '0x12345',
            data: calldata
          })

        expect(spy.middleware).toHaveBeenCalledOnce()
        expect(handlerSpy.middleware).not.toHaveBeenCalledOnce()
        expect(response.status).equal(500)
        expect(response.body).toStrictEqual(expected)
      })
    })

    describe('multiple handlers', () => {
      it('valid call with no middleware', async () => {
        const h1Spy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }
        vi.spyOn(h1Spy, "middleware")
        const h1: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [h1Spy.middleware]
        }

        const h2Spy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }
        vi.spyOn(h2Spy, "middleware")
        const h2: FunctionHandler = {
          signature: 'function setText(bytes32 node, string calldata key, string calldata value)',
          handlers: [h2Spy.middleware]
        }

        app.use(CCIPHandler([h1, h2]))

        const expected = { node: namehash('blockful.eth'), key: 'blockful' }

        const calldata = encodeFunctionData({
          abi: [parseAbiItem(h1.signature)],
          functionName: 'text',
          args: Object.values(expected) as [Hex, string]
        })

        const response = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            sender: '0x12345',
            data: calldata
          })

        expect(response.body).toEqual(expected)
        expect(h1Spy.middleware).toHaveBeenCalledOnce()
        expect(h2Spy.middleware).not.toHaveBeenCalled()
      })


      it('invalid call with no middleware', async () => {
        const h1: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key } = res.locals
              res.json({ node, key })
            }
          ]
        }

        const h2: FunctionHandler = {
          signature: 'function setText(bytes32 node, string calldata key, string calldata value)',
          handlers: [
            (_: Request, res: Response, __: NextFunction) => {
              const { node, key, value } = res.locals
              res.json({ node, key, value })
            }
          ]
        }

        app.use(CCIPHandler([h1, h2]))

        const calldata = encodeFunctionData({
          abi: [parseAbiItem('function text(uint32 num)')],
          functionName: 'text',
          args: [10]
        })

        const response = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            sender: '0x12345',
            data: calldata
          })

        expect(response.status).toEqual(404)
      })

      it('valid call with non-blocking prior middleware', async () => {
        let spy = {
          middleware: (_: Request, res: Response, next: NextFunction) => {
            next()
          }
        }

        vi.spyOn(spy, 'middleware')

        const h1Spy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }

        vi.spyOn(h1Spy, 'middleware')

        const h1: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, h1Spy.middleware]
        }

        const h2Spy = (_: Request, res: Response, __: NextFunction) => {
          const { node, key } = res.locals
          res.json({ node, key })
        }

        const h2: FunctionHandler = {
          signature: 'function setText(bytes32 node, string calldata key, string calldata value)',
          handlers: [spy.middleware, h2Spy]
        }

        app.use(CCIPHandler([h1, h2]))

        const expected = { node: namehash('blockful.eth'), key: 'blockful' }

        const calldata = encodeFunctionData({
          abi: [parseAbiItem(h1.signature)],
          functionName: 'text',
          args: Object.values(expected) as [Hex, string]
        })

        const response = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            sender: '0x12345',
            data: calldata
          })

        expect(response.body).toEqual(expected)
        expect(spy.middleware).toHaveBeenCalledOnce()
        expect(h1Spy.middleware).toHaveBeenCalled()
      })

      it('valid call with blocking prior middleware', async () => {
        const expected = { message: 'blocking call' }

        let spy = {
          middleware: (_: Request, res: Response, next: NextFunction) => {
            res.status(500).json(expected)
            next(new Error(expected.message))
          }
        }

        vi.spyOn(spy, 'middleware')

        const h1Spy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }

        vi.spyOn(h1Spy, 'middleware')

        const h1: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, h1Spy.middleware]
        }

        const h2Spy = {
          middleware: (_: Request, res: Response, __: NextFunction) => {
            const { node, key } = res.locals
            res.json({ node, key })
          }
        }

        vi.spyOn(h2Spy, 'middleware')

        const h2: FunctionHandler = {
          signature: 'function text(bytes32 node, string key) view returns (string)',
          handlers: [spy.middleware, h2Spy.middleware]
        }

        const router = CCIPHandler([h1, h2])
        app.use(router)


        const calldata = encodeFunctionData({
          abi: [parseAbiItem(h1.signature)],
          functionName: 'text',
          args: [namehash('blockful.eth'), 'blockful']
        })

        const response = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            sender: '0x12345',
            data: calldata
          })
        expect(spy.middleware).toHaveBeenCalledOnce()
        expect(h1Spy.middleware).not.toHaveBeenCalled()
        expect(h2Spy.middleware).not.toHaveBeenCalled()
        expect(response.status).equal(500)
        expect(response.body).toStrictEqual(expected)
      })
    })
  })
})

