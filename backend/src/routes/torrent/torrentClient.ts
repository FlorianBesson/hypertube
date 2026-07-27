import { Request, Response } from 'express';
import * as z from "zod"
import { HttpError } from '../../errors';
// import { torrentStream } from 'torrent-stream'

var torrentStream = require('torrent-stream');

type YtsTorrent = {
  url: string
  hash: string
  quality: string
  type: string
  is_repack?: string
  video_codec?: string
  bit_depth?: string
  audio_channels?: string
  seeds?: number
  peers?: number
  size?: string
  size_bytes?: number
  date_uploaded?: string
  date_uploaded_unix?: number
}

// const TorrentSchema = z.object({
//     magnetUrl: z.string()
// })

export async function torrentHandler(req: Request, res: Response) {

    // const result = TorrentSchema.safeParse({
    //     magnetUrl: req.body.magnetUrl
    // })

    // const zodErrors = result.error?.issues.map((i) => i.message) || []
    // if (!result.success)
    //     throw new HttpError(400, zodErrors)

    const torrents: YtsTorrent[] = req.body.torrents
    console.log(torrents)

    const selectedTorrent = torrents.filter(torrent => (torrent.seeds ?? 0) > 0).sort((a, b) => (b.seeds ?? 0) - (a.seeds ?? 0))[0]
    console.log("selected torrent = ", selectedTorrent)

    if (!selectedTorrent)
        throw new HttpError(400, "Selected torrent has no peers")

    // const torrentResponse = await fetch(selectedTorrent.url)
    const torrentResponse = await fetch('https://webtorrent.io/torrents/big-buck-bunny.torrent')
    // console.log(torrentResponse)

    const torrentBuffer = Buffer.from(
      await torrentResponse.arrayBuffer()
    )

    console.log(`Torrent reçu : ${torrentBuffer.length} octets`)
    
    const engine = torrentStream(torrentBuffer, {
        tmp: './'
    })

    engine.on('ready', () => {
        console.log("Torrent Metadata : ")
        
        engine.files.forEach((file) => {
            console.log({
                filename: file.name,
                path: file.path,
                size: file.length
            })
        })
    })
    
    res.json({success: true, message: "Torrent download started !"})
}