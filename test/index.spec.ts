import { expect, it } from "vitest"
import express, { NextFunction, Request, Response } from "express"
import request from "supertest"

import { CCIPHandler, type FunctionHandler } from "../src"
import { encodeFunctionData, namehash, parseAbiItem } from "viem"

it("", () => {
  const signature = 'function text(bytes32 node, string key) view returns (string)'

  const abi: FunctionHandler[] = [
    {
      signature,
      handlers: [
        (_, __, next: NextFunction) => {
          console.log("AAAAAAA")
          next()
        },
        (req: Request, res: Response, next: NextFunction) => {
          const { node, key } = res.locals
          console.log({ node, key })
          next()
        },
        (_, __, next: NextFunction) => {
          console.log("BBBBB")
          next()
        },
      ]
    }
  ]

  const router = CCIPHandler(abi)

  const app = express()
  app.use(router)

  const calldata = encodeFunctionData({
    abi: [parseAbiItem(signature)],
    functionName: "text",
    args: [namehash("gragolandia.eth"), "gragas"]
  })

  request(app)
    .get(`/0x12345/${calldata}.json`)
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .end((err, res) => {
      if (err) throw err;
    });

  console.log({ a: 1 })
})


