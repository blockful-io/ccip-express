# CCIP Express

Express CCIP-Read handler.

## Motivation

This lib was created with the purpose of making it easier to implement APIs that are fully  compliant with the [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) specification.
Its differential is that it is capable of handling middlewares per function by attaching any given number of endpoints to an Express router.

## Usage

The supported request looks like the following:

```shell
# abi.encodeWithSelector(0x59d1d43c, 'com.twitter', '@blockful')
CALLDATA='0x59d1d43c194774734a8c16665005fd2c68cb7cc80b5aa6ffcb0c56ace654bc614902cf7f00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000008626c6f636b66756c000000000000000000000000000000000000000000000000'

curl -X GET http://127.0.0.1/0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2/$(CALLDATA)

curl -X POST http://127.0.0.1 -H "Content-Type: application/json" \
-d '{"sender": "0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2", "calldata": $(CALLDATA)}'
```

### Single handler with no middlewares

```ts
const handlers : FunctionHandler[] = [
  {
    signature: 'function text(bytes32 node, string key) view returns (string)',
    handlers: [
      (_: Request, res: Response, __: NextFunction) => {
        const { node, key } = res.locals
        res.json({ node, key })
      }
    ]
  }
]

app.use(CCIPHandler(handlers))
```

### Multiple handlers with not middlewares

```ts
const handlers : FunctionHandler[] = [
  {
    signature: 'function text(bytes32 node, string key) view returns (string)',
    handlers: [
      (_: Request, res: Response, __: NextFunction) => {
        const { node, key } = res.locals
        res.json({ node, key })
      }
    ]
  },
  {
    signature: 'function setText(bytes32 node, string calldata key, string calldata value)',
    handlers: [
      (_: Request, res: Response, __: NextFunction) => {
        const { node, key } = res.locals
        res.json({ node, key })
      }
    ]
  }
]

app.use(CCIPHandler(handlers))
```

### Single handler with middlewares

```ts
const handlers : FunctionHandler[] = [
  {
    signature: 'function text(bytes32 node, string key) view returns (string)',
    handlers: [
      (_: Request, res: Response, next: NextFunction) => {
        next()
      },
      (_: Request, res: Response, __: NextFunction) => {
        const { node, key } = res.locals
        res.json({ node, key })
      },
      (_: Request, res: Response, next: NextFunction) => {
        next()
      },
    ]
  }
]

app.use(CCIPHandler(handlers))
```
