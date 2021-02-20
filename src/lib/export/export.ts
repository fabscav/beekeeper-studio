import fs from 'fs'
import { DBConnection, TableOrView, TableFilter, TableResult } from '../db/client'

export abstract class Export {
    chunkSize: number = 500
    fileName: string = ''
    connection: DBConnection
    table: TableOrView
    filters: TableFilter[] | any[] = []
    outputOptions: any = {}
    status: Export.Status = Export.Status.Idle
    countExported: number = 0
    countTotal: number = 0
    fileSize: number = 0
    timeLeft: number = 0
    lastChunkTime: number = 0

    abstract getHeader(firstRow: any): Promise<string | void>
    abstract getFooter(): Promise<string | void>
    abstract writeChunkToFile(data: any): Promise<void>

    constructor(
        fileName: string, 
        connection: DBConnection, 
        table: TableOrView, 
        filters: TableFilter[] | any[], 
        outputOptions: any
    ) {
        this.fileName = fileName
        this.connection = connection
        this.table = table
        this.filters = filters
        this.outputOptions = outputOptions
    }

    async getChunk(offset: number, limit: number): Promise<TableResult | undefined> {
        const result = await this.connection.selectTop(
            this.table.name,
            offset,
            limit,
            [],
            this.filters,
            this.table.schema
        );

        return result
    }

    async getFirstRow() {
        const row = await this.getChunk(0, 1)

        if (row && row.result && row.result.length === 1) {
            return row.result[0]
        }
    }
    
    async writeLineToFile(content: string) {
        return await fs.promises.appendFile(this.fileName, content + "\n")
    }

    async deleteFile() {
        return await fs.promises.unlink(this.fileName)
    }

    async exportToFile(): Promise<any> {
        try {
            const firstRow = await this.getFirstRow()
            const header = await this.getHeader(firstRow)
            const footer = await this.getFooter()

            this.status = Export.Status.Exporting

            await fs.promises.open(this.fileName, 'w+')

            if (header) {
                await this.writeLineToFile(header)
            }
            
            do {
                const chunk = await this.getChunk(this.countExported, this.chunkSize)

                if (!chunk) {
                    this.status = Export.Status.Aborted
                    continue
                }

                await this.writeChunkToFile(chunk.result)
                
                this.countTotal = chunk.totalRecords
                this.countExported += chunk.result.length
                const stats = await fs.promises.stat(this.fileName)
                this.fileSize = stats.size
                this.calculateTimeLeft()
            } while (this.countExported < this.countTotal && this.status === Export.Status.Exporting)

            if (this.status === Export.Status.Aborted) {
                await this.deleteFile()
                return Promise.reject()
            }

            if (footer) {
                await this.writeLineToFile(footer)
            }

            this.status = Export.Status.Completed

            return Promise.resolve()
        } catch (ex) {
            this.status = Export.Status.Error
            throw ex
        }
    }

    calculateTimeLeft(): void {
        if (this.lastChunkTime) {
            const lastChunkDuration = Date.now() - this.lastChunkTime
            const chunksLeft = Math.round((this.countTotal - this.countExported) / this.chunkSize)
            
            this.timeLeft = chunksLeft * lastChunkDuration
        }

        this.lastChunkTime = Date.now()
    }

    abort(): void {
        this.status = Export.Status.Aborted
    }

    pause(): void {
        this.status = Export.Status.Paused
    }
}

export namespace Export {
    export enum Status {
        Idle,
        Exporting,
        Paused,
        Aborted,
        Completed,
        Error
    }
}