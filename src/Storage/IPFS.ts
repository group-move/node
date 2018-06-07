import * as FormData from 'form-data'
import { inject, injectable } from 'inversify'
import fetch from 'node-fetch'
import * as str from 'string-to-stream'

import { secondsToMiliseconds } from 'Helpers/Time'

import { IPFSConfiguration } from './IPFSConfiguration'

/**
 * Wrapper around IPFS' RPC
 */
@injectable()
export class IPFS {
  private readonly url: string
  private readonly downloadTimeoutInSeconds: number

  constructor(@inject('IPFSConfiguration') configuration: IPFSConfiguration) {
    this.url = configuration.ipfsUrl
    this.downloadTimeoutInSeconds = configuration.downloadTimeoutInSeconds
  }

  // we could add an integration tests for this function
  createEmptyDirectory = async (): Promise<string> => {
    const response = await fetch(`${this.url}/api/v0/object/new?arg=unixfs-dir`)
    const json = await response.json()
    return json.Hash
  }

  // we could add an integration tests for this function
  addFileToDirectory = async (directoryHash: string, fileHash: string): Promise<string> => {
    const response = await fetch(
      `${this.url}/api/v0//api/v0/object/pach/add-link?arg=${directoryHash}&arg=${fileHash}&arg=${fileHash}`
    )
    const json = await response.json()
    return json.Hash
  }

  // we could add an integration tests for this function
  addFilesToDirectory = async ({
    directoryHash,
    fileHashes = [],
  }: {
    directoryHash: string
    fileHashes: ReadonlyArray<string>
  }): Promise<string> =>
    await fileHashes.reduce(
      async (acc, cur) => await this.addFileToDirectory(await acc, cur),
      Promise.resolve(directoryHash)
    )

  cat = async (hash: string): Promise<string> => {
    const response = await fetch(`${this.url}/api/v0/cat?arg=${hash}`, {
      timeout: secondsToMiliseconds(this.downloadTimeoutInSeconds),
    })
    return response.text()
  }

  addText = async (text: string): Promise<string> => {
    const formData = new FormData() // { maxDataSize: 20971520 }

    formData.append('file', str(text), {
      knownLength: text.length,
      filename: 'file',
      contentType: 'plain/text',
    })

    const response = await fetch(`${this.url}/api/v0/add`, {
      method: 'post',
      body: formData,
      timeout: 1000,
    })

    const json = await response.json()

    return json.Hash
  }
}
