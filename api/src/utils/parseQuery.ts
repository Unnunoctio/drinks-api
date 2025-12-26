export const parseQuery = (query: any) => {
    return Object.fromEntries(
        Object.entries(query).map(([key, value]) => {
            if (value === 'true' || value === 'false') return [key, value === 'true']
            const num = Number(value)
            return [key, !isNaN(num) && value !== '' ? num : value]
        })
    )
}