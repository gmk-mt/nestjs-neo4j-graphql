export const convertRecord = record => {
    console.log(record._fields.properties)
    const { password, ...properties } = record._fields.properties
    return { id: record._fields.identity.low, ...properties }
}

export const getRecords = (queryResult, name) => {
    return queryResult.records.map(record => {

        const node = record.get(name)

        const id = node.identity.low
        const data = node.properties

        return {
            id,
            ...data
        }
    })
}