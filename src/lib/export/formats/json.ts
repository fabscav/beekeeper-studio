import { Export } from "../export";
import { DBConnection, TableOrView, TableFilter } from '../../db/client'
import indentString from 'indent-string'

interface OutputOptionsJson {
    prettyprint: boolean
}
export default class JsonExporter extends Export {

    constructor(
        fileName: string, 
        connection: DBConnection, 
        table: TableOrView, 
        filters: TableFilter[] | any[], 
        outputOptions: OutputOptionsJson
    ) {
        super(fileName, connection, table, filters, outputOptions)
    }

    async getHeader(firstRow: any) {
        return '['
    }

    async getFooter() {
        return ']'
    }

    async writeChunkToFile(data: any) {
        for (const row of data) {
            const spacing = this.outputOptions.prettyprint ? 2 : undefined
            const content = indentString(JSON.stringify(row, null, spacing), 2)
            await this.writeLineToFile(content + ',')
        }
    }
}