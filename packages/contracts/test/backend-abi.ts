import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { Interface } from 'ethers'
export function backendInterface(): Interface {
  const file = resolve(__dirname, '../../../src/lib/blockchain/abi.ts')
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  let values: string[] | undefined
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(source) !== 'ledgerABI' || !declaration.initializer) continue
      const expression = ts.isAsExpression(declaration.initializer) ? declaration.initializer.expression : declaration.initializer
      if (!ts.isArrayLiteralExpression(expression)) throw new Error('ledgerABI must be a literal array')
      values = expression.elements.map(element => {
        if (!ts.isStringLiteral(element)) throw new Error('Nonliteral ABI entry: update the compatibility reader explicitly')
        return element.text
      })
    }
  }
  if (!values?.length) throw new Error('Backend ledgerABI was not found')
  return new Interface(values)
}
