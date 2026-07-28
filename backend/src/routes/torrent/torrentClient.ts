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

export async function searchTorrents(req: Request, res: Response) {
    const apiKey = process.env.JACKETT_API_KEY;
    const jackettUrl = process.env.JACKETT_URL ?? "http://jackett:9117";

    if (!apiKey)
        throw new Error("Missing Jackett API KEY")

    const movieTitle = req.body.title
    console.log(movieTitle)
    const query = movieTitle || "avengers"

    
    const endpoint = new URL("/api/v2.0/indexers/all/results/torznab/api", jackettUrl);
    endpoint.searchParams.set("apikey", apiKey);
    endpoint.searchParams.set("t", "movie");
    endpoint.searchParams.set("cat", "2000");
    endpoint.searchParams.set("q", query);
    // endpoint.searchParams.set("imdbid", "tt1254207")

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Jackett a répondu HTTP ${response.status}`);
    }
  
    const xml = await response.text();
    console.log(xml)
    
    res.json({success: true, message: "Torrent search working !"})
}