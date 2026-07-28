const LEFT_ODD = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
]

const LEFT_EVEN = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
]

const RIGHT = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
]

const PARITY = [
  'OOOOOO',
  'OOEOEE',
  'OOEEOE',
  'OOEEEO',
  'OEOOEE',
  'OEEOOE',
  'OEEEOO',
  'OEOEOE',
  'OEOEEO',
  'OEEOEO',
]

function encodeEAN13(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 13) return null

  const firstDigit = Number(digits[0])
  const parity = PARITY[firstDigit]
  if (!parity) return null

  let bits = '101'
  for (let index = 1; index <= 6; index += 1) {
    const digit = Number(digits[index])
    bits += parity[index - 1] === 'O' ? LEFT_ODD[digit] : LEFT_EVEN[digit]
  }

  bits += '01010'

  for (let index = 7; index <= 12; index += 1) {
    const digit = Number(digits[index])
    bits += RIGHT[digit]
  }

  bits += '101'
  return bits
}

type Ean13BarcodeProps = {
  value: string
  width?: number
  height?: number
}

export default function Ean13Barcode({ value, width = 220, height = 84 }: Ean13BarcodeProps) {
  const bits = encodeEAN13(value)
  if (!bits) {
    return <div className="barcode-fallback">Codigo invalido</div>
  }

  const quietZone = 10
  const moduleWidth = width / (bits.length + quietZone * 2)
  const guardIndices = new Set<number>()

  for (let index = 0; index < bits.length; index += 1) {
    if (index < 3 || (index >= 45 && index < 50) || index >= 92) {
      guardIndices.add(index)
    }
  }

  const barHeight = height - 16
  const guardHeight = height - 6

  return (
    <svg
      aria-label={`Codigo de barras ${value}`}
      className="barcode-svg"
      role="img"
      viewBox={`0 0 ${width + moduleWidth * quietZone * 2} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100%" height="100%" fill="#fff" />
      {bits.split('').map((bit, index) => {
        if (bit !== '1') return null
        const x = (index + quietZone) * moduleWidth
        const currentHeight = guardIndices.has(index) ? guardHeight : barHeight
        return <rect key={`${index}-${bit}`} x={x} y={0} width={moduleWidth} height={currentHeight} fill="#111" />
      })}
    </svg>
  )
}