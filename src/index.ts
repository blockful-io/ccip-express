import { AbiFunction, decodeFunctionData, parseAbiItem, toFunctionSelector } from "viem"
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

    router.get(`/:sender/${selector}*.json`, ccipMiddleware(abiFunc), ...f.handlers)
  }

  return router
}

function ccipMiddleware(func: AbiFunction): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const selector = toFunctionSelector(func)
    const params = req.params
    const { args } = decodeFunctionData({
      abi: [func],
      data: `${selector}${params["0"]}`
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