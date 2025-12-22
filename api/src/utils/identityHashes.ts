
interface BeerIdentityHashInput {
    name: string,
    brandId: string,
    alcoholByVolume: number,
    categoryId: string,
    packagingId: string,
    volumeCc: number,
    beerStyleId: string
}

export async function beerIdentityHash(input: BeerIdentityHashInput): Promise<string> {
    const normalized = [
        input.name.trim().toLowerCase(),
        input.brandId,
        input.alcoholByVolume.toFixed(1),
        input.categoryId,
        input.packagingId,
        input.volumeCc.toString(),
        input.beerStyleId
    ].join('|')

    // Convert to bytes
    const encoder = new TextEncoder()
    const data = encoder.encode(normalized)

    // Generate hash SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)

    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return hashHex
}