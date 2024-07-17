import { AbiFunction, decodeAbiParameters, decodeFunctionData, parseAbiItem, toFunctionSelector } from "viem"
import { NextFunction, Request, RequestHandler, Response, Router, json } from "express"

export interface FunctionHandler {
  signature: string
  handlers: RequestHandler[]
}

export function CCIPHandler(funcs: FunctionHandler[]): Router {
  const router = Router()
  router.use(json())

  for (const f of funcs) {
    const selector = toFunctionSelector(f.signature)
    const abiFunc = parseAbiItem(f.signature)

    if (abiFunc.type !== "function") {
      continue
    }

    router.get(`/:sender/${selector}*.json`, ccipGetMiddleware(abiFunc), ...f.handlers)
    router.post('/', ccipPostMiddleware(abiFunc), ...f.handlers)
  }

  return router
}

function ccipGetMiddleware(func: AbiFunction): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const params = req.params
    const calldata = params["0"]

    const selector = toFunctionSelector(func)
    const { args } = decodeFunctionData({
      abi: [func],
      data: `${selector}${calldata}`
    })

    res.locals = func.inputs.reduce<{
      [key: string]: unknown;
    }>((argsMap, input, i) => ({
      ...argsMap,
      [input.name || i.toString()]: args[i]
    }), {})

    next()
  }
}

function ccipPostMiddleware(func: AbiFunction): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, signature } = req.body;

      const { args } = decodeFunctionData({
        abi: [func],
        data
      })

      res.locals = func.inputs.reduce<{
        [key: string]: unknown;
      }>((argsMap, input, i) => ({
        ...argsMap,
        [input.name || i.toString()]: args[i]
      }), {
        signature
      })
    } catch (err) {
      res.status(404)
    }
    next()
  }
}