import { createHash } from 'crypto';
import { Dictionary, beginCell, Cell } from '@ton/core';

export type JettonContent = {
    name: string;
    symbol: string;
    description: string;
    image: string;
    decimals: string;
};

const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);

const toKey = (key: string) => {
    const buffer = createHash('sha256').update(key).digest();
    return BigInt(`0x${buffer.toString('hex')}`);
};

function bufferToChunks(buff: Buffer, chunkSize: number) {
    let chunks: Buffer[] = [];
    while (buff.byteLength > 0) {
        chunks.push(buff.subarray(0, chunkSize));
        buff = buff.subarray(chunkSize);
    }
    return chunks;
}

function makeSnakeCell(data: Buffer) {
    let chunks = bufferToChunks(data, CELL_MAX_SIZE_BYTES);
    const b = chunks.reduceRight((curCell, chunk, index) => {
        if (index === 0) {
            curCell.storeInt(0x00, 8);
        }
        curCell.storeBuffer(chunk);
        if (index > 0) {
            const cell = curCell.endCell();
            return beginCell().storeRef(cell);
        } else {
            return curCell;
        }
    }, beginCell());
    return b.endCell();
}

export function onchainContentToCell(data: JettonContent): Cell {
    let dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
    Object.entries(data).forEach(([key, value]) => {
        dict.set(toKey(key), makeSnakeCell(Buffer.from(value, 'utf8')));
    });
    return beginCell().storeInt(0x00, 8).storeDict(dict).endCell();
}

export function jettonContentToCell(uri: string) {
    return beginCell()
        .storeUint(0x01, 8)
        .storeStringTail(uri) //Snake logic under the hood
        .endCell();
}
